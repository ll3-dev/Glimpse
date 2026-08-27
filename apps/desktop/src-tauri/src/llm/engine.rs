// ---------------------------------------------------------------------------
// Real implementation backed by llama-cpp-2 (requires cmake + C++ toolchain)
// ---------------------------------------------------------------------------
#[cfg(feature = "llm")]
mod imp {
    use std::path::PathBuf;

    use llama_cpp_2::context::params::LlamaContextParams;
    use llama_cpp_2::llama_backend::LlamaBackend;
    use llama_cpp_2::llama_batch::LlamaBatch;
    use llama_cpp_2::model::params::LlamaModelParams;
    use llama_cpp_2::model::{AddBos, LlamaModel};
    use llama_cpp_2::sampling::LlamaSampler;
    use llama_cpp_2::LlamaModelLoadError;

    /// temperature 반영 샘플러 체인 — None 이면 기본값(0.8)을 쓴다.
    /// 이전 구조는 `dist_default_seed` 로 고정돼 요청의 temperature 가
    /// 폐기됐다.
    fn build_sampler(temperature: Option<f32>) -> LlamaSampler {
        const DEFAULT_TEMPERATURE: f32 = 0.8;
        let t = temperature.unwrap_or(DEFAULT_TEMPERATURE).clamp(0.0, 2.0);
        LlamaSampler::chain_simple(vec![LlamaSampler::temp(t), LlamaSampler::dist(42)])
    }

    pub struct LlmEngine {
        backend: LlamaBackend,
        model: Option<LlamaModel>,
        model_path: Option<PathBuf>,
        /// 모델 레지스트리가 광고하는 컨텍스트 길이 — 컨텍스트 생성 시
        /// n_ctx 로 전달한다. 기본값을 쓰면 llama.cpp 기본(512)에 묶여
        /// 긴 프롬프트가 "Prompt exceeds context length" 로 실패한다.
        context_length: u32,
    }

    impl LlmEngine {
        pub fn new() -> Self {
            let backend = LlamaBackend::init().expect("Failed to initialize llama backend");
            Self {
                backend,
                model: None,
                model_path: None,
                context_length: 2048,
            }
        }

        pub fn load_model(&mut self, path: &str, context_length: u32) -> Result<(), String> {
            let model_params = LlamaModelParams::default();
            let model =
                LlamaModel::load_from_file(&self.backend, PathBuf::from(path), &model_params)
                    .map_err(|e: LlamaModelLoadError| format!("Failed to load model: {}", e))?;
            self.model = Some(model);
            self.model_path = Some(PathBuf::from(path));
            self.context_length = context_length.max(512);
            Ok(())
        }

        pub fn unload_model(&mut self) {
            self.model = None;
            self.model_path = None;
        }

        pub fn is_loaded(&self) -> bool {
            self.model.is_some()
        }

        pub fn model_path(&self) -> Option<&PathBuf> {
            self.model_path.as_ref()
        }

        /// 레지스트리 context_length 를 반영한 컨텍스트 파라미터.
        fn context_params(&self) -> LlamaContextParams {
            LlamaContextParams::default().with_n_ctx(std::num::NonZeroU32::new(self.context_length))
        }

        pub fn completion(
            &self,
            prompt: &str,
            max_tokens: u32,
            temperature: Option<f32>,
        ) -> Result<String, String> {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create a context for this completion request
            let ctx_params = self.context_params();
            let mut ctx = model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

            // Tokenize the prompt
            let tokens = model
                .str_to_token(prompt, AddBos::Always)
                .map_err(|e| format!("Tokenization failed: {}", e))?;

            let n_ctx = ctx.n_ctx() as usize;
            if tokens.len() >= n_ctx {
                return Err("Prompt exceeds context length".to_string());
            }

            // Create a batch and evaluate the prompt
            let n_tokens = tokens.len().min(n_ctx - 1);
            let mut batch = LlamaBatch::new(n_tokens, 1);

            for (i, &token) in tokens.iter().take(n_tokens).enumerate() {
                // logits = true only for the last token
                let is_last = i == n_tokens - 1;
                batch
                    .add(token, i as i32, &[0], is_last)
                    .map_err(|e| format!("Failed to add token to batch: {}", e))?;
            }

            ctx.decode(&mut batch)
                .map_err(|e| format!("Decode failed: {}", e))?;

            // Sample tokens auto-regressively — llama-cpp-2 공식 패턴:
            // `sampler.sample(&ctx, idx)` 가 샘플+적용을 한 번에 수행한다.
            let eos_token = model.token_eos();
            let mut sampler = build_sampler(temperature);

            let mut generated_tokens = Vec::new();
            let mut n_cur = n_tokens as i32;

            for _ in 0..max_tokens {
                let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
                sampler.accept(new_token);

                if new_token == eos_token {
                    break;
                }

                generated_tokens.push(new_token);

                // Prepare next batch with the newly sampled token
                batch.clear();
                batch
                    .add(new_token, n_cur, &[0], true)
                    .map_err(|e| format!("Failed to add token to batch: {}", e))?;
                n_cur += 1;

                ctx.decode(&mut batch)
                    .map_err(|e| format!("Decode failed: {}", e))?;
            }

            // Convert tokens back to string — 개별 토큰 piece 결합
            // (deprecated `tokens_to_str` 대신 현재 API 사용)
            let mut builder: Vec<u8> = Vec::with_capacity(generated_tokens.len() * 8);
            for token in &generated_tokens {
                let bytes = model
                    .token_to_piece_bytes(*token, 16, true, None)
                    .map_err(|e| format!("Token-to-string failed: {}", e))?;
                builder.extend_from_slice(&bytes);
            }
            let text =
                String::from_utf8(builder).map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(text)
        }

        pub fn completion_stream<F>(
            &self,
            prompt: &str,
            max_tokens: u32,
            temperature: Option<f32>,
            on_token: F,
        ) -> Result<String, String>
        where
            F: FnMut(&str),
        {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create a context for this completion request
            let ctx_params = self.context_params();
            let mut ctx = model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

            // Tokenize the prompt
            let tokens = model
                .str_to_token(prompt, AddBos::Always)
                .map_err(|e| format!("Tokenization failed: {}", e))?;

            let n_ctx = ctx.n_ctx() as usize;
            if tokens.len() >= n_ctx {
                return Err("Prompt exceeds context length".to_string());
            }

            // Create a batch and evaluate the prompt
            let n_tokens = tokens.len().min(n_ctx - 1);
            let mut batch = LlamaBatch::new(n_tokens, 1);

            for (i, &token) in tokens.iter().take(n_tokens).enumerate() {
                let is_last = i == n_tokens - 1;
                batch
                    .add(token, i as i32, &[0], is_last)
                    .map_err(|e| format!("Failed to add token to batch: {}", e))?;
            }

            ctx.decode(&mut batch)
                .map_err(|e| format!("Decode failed: {}", e))?;

            let eos_token = model.token_eos();
            let mut sampler = build_sampler(temperature);

            let mut generated_tokens = Vec::new();
            let mut n_cur = n_tokens as i32;
            let mut on_token = on_token;

            for _ in 0..max_tokens {
                let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
                sampler.accept(new_token);

                if new_token == eos_token {
                    break;
                }

                generated_tokens.push(new_token);

                // Convert this single token to a string and invoke the callback
                if let Ok(bytes) = model.token_to_piece_bytes(new_token, 16, true, None) {
                    if let Ok(token_str) = String::from_utf8(bytes) {
                        on_token(&token_str);
                    }
                }

                batch.clear();
                batch
                    .add(new_token, n_cur, &[0], true)
                    .map_err(|e| format!("Failed to add token to batch: {}", e))?;
                n_cur += 1;

                ctx.decode(&mut batch)
                    .map_err(|e| format!("Decode failed: {}", e))?;
            }

            // Convert all tokens back to a full string
            let mut builder: Vec<u8> = Vec::with_capacity(generated_tokens.len() * 8);
            for token in &generated_tokens {
                let bytes = model
                    .token_to_piece_bytes(*token, 16, true, None)
                    .map_err(|e| format!("Token-to-string failed: {}", e))?;
                builder.extend_from_slice(&bytes);
            }
            let text =
                String::from_utf8(builder).map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(text)
        }

        pub fn embedding(&self, text: &str) -> Result<Vec<f32>, String> {
            self.embeddings_batch(std::slice::from_ref(&text))
                .map(|mut vecs| vecs.pop().expect("non-empty slice yields one vector"))
        }

        /// 배치 임베딩 — 컨텍스트 1회 생성 후 각 텍스트를 순서대로
        /// decode→embeddings_seq_ith→clear_kv_cache 한다(llama-cpp-2 공식
        /// embeddings 예제 패턴). 하나라도 실패하면 전체를 Err 로 반환한다.
        pub fn embeddings_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>, String> {
            if texts.is_empty() {
                return Ok(Vec::new());
            }
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create context with embeddings enabled (once for the whole batch)
            let ctx_params = LlamaContextParams::default()
                .with_embeddings(true)
                .with_n_ctx(std::num::NonZeroU32::new(self.context_length));
            let mut ctx = model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

            // Tokenize all inputs up front so an early failure short-circuits
            // before any decode work.
            let tokenized = texts
                .iter()
                .map(|text| {
                    model
                        .str_to_token(text, AddBos::Always)
                        .map_err(|e| format!("Tokenization failed: {}", e))
                })
                .collect::<Result<Vec<_>, _>>()?;

            let mut out = Vec::with_capacity(texts.len());

            for tokens in &tokenized {
                // 배치 크기/플래그는 기존 단건 embedding 과 동일하게 유지한다
                // — 컨텍스트 초과 입력도 기존과 같이 decode 에서 실패한다.
                let mut batch = LlamaBatch::new(tokens.len(), 1);
                for (i, &token) in tokens.iter().enumerate() {
                    batch
                        .add(token, i as i32, &[0], false)
                        .map_err(|e| format!("Failed to add token to batch: {}", e))?;
                }

                ctx.clear_kv_cache();
                ctx.decode(&mut batch)
                    .map_err(|e| format!("Decode failed: {}", e))?;

                let embeddings = ctx
                    .embeddings_seq_ith(0)
                    .map_err(|e| format!("Failed to get embeddings: {}", e))?;

                out.push(embeddings.to_vec());
            }

            Ok(out)
        }
    }
}

// ---------------------------------------------------------------------------
// Stub implementation when the llm feature is disabled
// ---------------------------------------------------------------------------
#[cfg(not(feature = "llm"))]
mod imp {
    use std::path::PathBuf;

    /// 스텁 빌드(`llm` feature off)에서 실추론 대신 반환하는 에러 —
    /// 스텁 텍스트/영벡터가 성공으로 소비되는 데이터 오염 경로를 차단한다.
    pub const STUB_UNAVAILABLE: &str = "LLM inference unavailable: this build was compiled without the `llm` feature. Rebuild with --features llm for real inference.";

    /// 배치 명령이 결정론적 벡터를 반환할 수 있도록 입력 바이트에서
    /// FNV-1a 로 파생한 결정론적 벡터(8차원)를 만든다.
    fn stub_vector(text: &str) -> Vec<f32> {
        let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
        for byte in text.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        (0..8)
            .map(|i| ((hash >> (i * 8)) & 0xff) as f32 / 255.0)
            .collect()
    }

    pub struct LlmEngine {
        model_path: Option<PathBuf>,
    }

    impl Default for LlmEngine {
        fn default() -> Self {
            Self::new()
        }
    }

    impl LlmEngine {
        pub fn new() -> Self {
            Self { model_path: None }
        }

        pub fn load_model(&mut self, path: &str, _context_length: u32) -> Result<(), String> {
            // Stub: record the path but don't actually load anything
            self.model_path = Some(PathBuf::from(path));
            Ok(())
        }

        pub fn unload_model(&mut self) {
            self.model_path = None;
        }

        pub fn is_loaded(&self) -> bool {
            self.model_path.is_some()
        }

        #[allow(dead_code)]
        pub fn model_path(&self) -> Option<&PathBuf> {
            self.model_path.as_ref()
        }

        pub fn completion(
            &self,
            prompt: &str,
            max_tokens: u32,
            _temperature: Option<f32>,
        ) -> Result<String, String> {
            let _ = (prompt, max_tokens);
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            // 스텁이 성공 응답을 반환하면 소비자가 실제 추론으로 오인해
            // 스텁 텍스트가 데이터로 저장된다 — 무조건 Err 로 차단한다.
            Err(STUB_UNAVAILABLE.to_string())
        }

        pub fn completion_stream<F>(
            &self,
            prompt: &str,
            max_tokens: u32,
            _temperature: Option<f32>,
            on_token: F,
        ) -> Result<String, String>
        where
            F: FnMut(&str),
        {
            let _ = (prompt, max_tokens, &on_token);
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            Err(STUB_UNAVAILABLE.to_string())
        }

        pub fn embedding(&self, _text: &str) -> Result<Vec<f32>, String> {
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            // 영벡터를 반환하면 유사도/추천이 조용히 오염된다 — Err 로 차단.
            Err(STUB_UNAVAILABLE.to_string())
        }

        /// 배치 명령용 스텁 — 테스트가 순서 보존/결정성을 검증할 수 있도록
        /// 결정론적 벡터를 반환한다(입력 바이트로부터 FNV-1a 파생).
        pub fn embeddings_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>, String> {
            if texts.is_empty() {
                return Ok(Vec::new());
            }
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            Ok(texts.iter().map(|t| stub_vector(t)).collect())
        }
    }

    #[cfg(test)]
    mod stub_tests {
        use super::*;

        fn loaded_stub() -> LlmEngine {
            let mut engine = LlmEngine::new();
            engine
                .load_model("/nonexistent/model.gguf", 4096)
                .expect("stub load_model records the path without loading");
            engine
        }

        #[test]
        fn stub_completion_returns_error_not_fake_text() {
            let engine = loaded_stub();
            let result = engine.completion("프롬프트", 32, Some(0.7));
            assert!(
                result.is_err(),
                "stub must not return Ok — fake text would be persisted as real data"
            );
            assert!(result.unwrap_err().contains("llm` feature"));
        }

        #[test]
        fn stub_completion_stream_returns_error_not_fake_text() {
            let engine = loaded_stub();
            let result =
                engine.completion_stream("한국어 프롬프트 — UTF-8 경계 안전", 32, None, |_| {});
            assert!(result.is_err(), "stub stream must not return Ok");
        }

        #[test]
        fn stub_embedding_returns_error_not_zero_vector() {
            let engine = loaded_stub();
            let result = engine.embedding("text");
            assert!(
                result.is_err(),
                "stub must not return Ok — zero vectors silently corrupt similarity"
            );
        }

        #[test]
        fn stub_embeddings_batch_preserves_order_with_deterministic_vectors() {
            let engine = loaded_stub();
            let out = engine
                .embeddings_batch(&["alpha", "beta", "alpha"])
                .expect("stub batch returns deterministic vectors");
            assert_eq!(out.len(), 3, "one vector per request, order preserved");
            assert_eq!(out[0], out[2], "same input must yield the same vector");
            assert_ne!(out[0], out[1], "different inputs must yield distinct vectors");
        }

        #[test]
        fn stub_embeddings_batch_empty_input_returns_empty_vec() {
            let engine = loaded_stub();
            assert!(
                engine.embeddings_batch(&[]).unwrap().is_empty(),
                "empty requests must yield an empty vec, not an error"
            );
        }

        #[test]
        fn stub_embeddings_batch_propagates_error_without_model() {
            let engine = LlmEngine::new();
            let err = engine
                .embeddings_batch(&["text"])
                .expect_err("batch without a loaded model must fail");
            assert!(err.contains("No model loaded"));
        }

        #[test]
        fn stub_without_model_reports_no_model_loaded() {
            let engine = LlmEngine::new();
            assert!(engine
                .completion("x", 1, None)
                .unwrap_err()
                .contains("No model loaded"));
        }
    }
}

pub use imp::LlmEngine;
