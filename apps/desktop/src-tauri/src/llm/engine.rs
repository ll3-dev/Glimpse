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
    use llama_cpp_2::token::LlamaToken;
    use llama_cpp_2::TokenToStringError;
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

    /// Qwen3 등 reasoning 모델이 출력하는 `<think>...</think>` 사고 블록을
    /// 완성 텍스트에서 제거한다. 스트리밍 중엔 그대로 흘려보내되 최종 저장
    /// 텍스트는 정제한다. 닫는 태그가 없으면(생성 한도로 잘림) 사고 중
    /// 텍스트 전체가 답 대신일 수 없으므로 마지막 `</think>` 이후만 남긴다.
    fn strip_think_block(text: &str) -> String {
        if let Some(end) = text.find("</think>") {
            let after = text[end + "</think>".len()..].trim();
            return after.to_string();
        }
        if let Some(start) = text.find("<think>") {
            // 닫힘 없이 잘림(생성 한도 도달) — 사고 블록부터 끝까지 제거.
            return text[..start].trim().to_string();
        }
        text.to_string()
    }

    /// 토큰 → UTF-8 조각 변환. 16바이트 같은 고정 버퍼로는 멀티바이트
    /// 조각에서 InsufficientBufferSpace(-필요크기) 가 나온다 — 크레이트
    /// 공식 패턴대로 에러가 알려준 필요 크기로 재시도한다. 한글(3바이트)
    /// 조각이 흔한 이 앱에서 실측으로 확인된 결함이다.
    fn token_piece(model: &LlamaModel, token: LlamaToken) -> Result<Vec<u8>, String> {
        const INITIAL_BUFFER: usize = 32;
        match model.token_to_piece_bytes(token, INITIAL_BUFFER, true, None) {
            Ok(bytes) => Ok(bytes.to_vec()),
            Err(TokenToStringError::InsufficientBufferSpace(needed)) => {
                let size = (-needed) as usize;
                model
                    .token_to_piece_bytes(token, size, true, None)
                    .map(|bytes| bytes.to_vec())
                    .map_err(|e| format!("Token-to-string failed: {}", e))
            }
            Err(e) => Err(format!("Token-to-string failed: {}", e)),
        }
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

        /// 프롬프트 토큰 수와 생성 예산으로 컨텍스트 크기와 실제 생성
        /// 예산을 정한다. n_ctx 는 프롬프트+생성이 모두 들어가도록
        /// 카탈로그 상한(8k 런타임 캡) 안에서 늘리고, 모자라면 생성
        /// 예산을 잘라 n_ctx 안에서 소진하게 한다 — 그렇지 않으면 긴
        /// 프롬프트/큰 max_tokens 조합에서 llama.cpp 가 NoKvCacheSlot
        /// 디코드 에러로 실패한다.
        fn context_plan(
            &self,
            prompt_tokens: usize,
            max_tokens: u32,
        ) -> (LlamaContextParams, u32) {
            const RUNTIME_CONTEXT_CAP: u32 = 8_192;
            // 컨텍스트 생성 실패(수십 GB KV 캐시)를 막는 하한.
            const MIN_CTX: u32 = 512;

            let catalog_cap = self.context_length.min(RUNTIME_CONTEXT_CAP).max(MIN_CTX);
            // +1: 마지막 프롬프트 토큰의 logits 슬롯도 필요하다.
            let needed = prompt_tokens as u32 + max_tokens + 1;
            let n_ctx = needed.min(catalog_cap).max(MIN_CTX.min(catalog_cap));
            let budget = max_tokens.min(n_ctx.saturating_sub(prompt_tokens as u32 + 1));
            (
                LlamaContextParams::default().with_n_ctx(std::num::NonZeroU32::new(n_ctx)),
                budget,
            )
        }

        pub fn completion(
            &self,
            prompt: &str,
            max_tokens: u32,
            temperature: Option<f32>,
        ) -> Result<String, String> {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Tokenize the prompt
            let tokens = model
                .str_to_token(prompt, AddBos::Always)
                .map_err(|e| format!("Tokenization failed: {}", e))?;

            // 컨텍스트는 토큰화 후 생성 — 프롬프트 + 생성 예산이 실제로
            // 들어갈 크기를 잡아야 NoKvCacheSlot 이 나지 않는다. n_ctx 가
            // 모자라면 생성 예산을 잘라 n_ctx 안에서 소진시킨다.
            let (ctx_params, budget) = self.context_plan(tokens.len(), max_tokens);
            let mut ctx = model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

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

            for _ in 0..budget {
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
                let bytes = token_piece(model, *token)?;
                builder.extend_from_slice(&bytes);
            }
            let text =
                String::from_utf8(builder).map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(strip_think_block(&text))
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

            // Tokenize the prompt
            let tokens = model
                .str_to_token(prompt, AddBos::Always)
                .map_err(|e| format!("Tokenization failed: {}", e))?;

            // completion 과 동일 — 토큰화 후 컨텍스트 플랜(NoKvCacheSlot 방지).
            let (ctx_params, budget) = self.context_plan(tokens.len(), max_tokens);
            let mut ctx = model
                .new_context(&self.backend, ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

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

            for _ in 0..budget {
                let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
                sampler.accept(new_token);

                if new_token == eos_token {
                    break;
                }

                generated_tokens.push(new_token);

                // Convert this single token to a string and invoke the callback
                if let Ok(bytes) = token_piece(model, new_token) {
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
                let bytes = token_piece(model, *token)?;
                builder.extend_from_slice(&bytes);
            }
            let text =
                String::from_utf8(builder).map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(strip_think_block(&text))
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

    /// 실모델 통합 테스트 — 다운로드된 GGUF를 실제 llama.cpp로 로드해
    /// 완성·스트리밍·임베딩을 검증한다. 모델 파일(수 GB)과 수십 초의
    /// 추론 시간이 필요하므로 평시 CI에서는 `#[ignore]`로 건너뛰고
    ///   cargo test --features llm real_model -- --ignored
    /// 로 명시 실행한다. 모델이 없으면 실패가 아닌 skip(eprintln+조기
    /// 반환) — 실기기 환경에서만 의미 있는 테스트다.
    #[cfg(test)]
    mod real_model_tests {
        use super::*;

        #[test]
        #[ignore]
        fn real_model_completion_stream_and_embedding() {
            const MODEL_PATH: &str = "Qwen3.5-2B-Q4_K_M.gguf";
            if !std::path::Path::new(MODEL_PATH).exists() {
                eprintln!("skip: model not found at {}", MODEL_PATH);
                return;
            }

            let mut engine = LlmEngine::new();
            engine
                .load_model(MODEL_PATH, 2048)
                .expect("downloaded model must load into llama.cpp");
            assert!(engine.is_loaded());

            // 완성 — ChatML 프롬프트로 한국어 인사를 유도한다. reasoning
            // 모델은 답변 전 수백~수천 토큰을 사고에 쓰므로 생성 예산을
            // 넉넉히 잡고, /no_think 힌트로 사고를 억제한다(Qwen3 표준).
            let prompt = "<|im_start|>user\n안녕하세요! 한 문장으로 인사해 주세요. /no_think<|im_end|>\n<|im_start|>assistant\n";

            // 스트리밍 — 콜백 토큰을 모아 최종 텍스트 정합성을 확인한다.
            let mut streamed_tokens: usize = 0;
            let streamed = engine
                .completion_stream(prompt, 2048, Some(0.7), |_| {
                    streamed_tokens += 1;
                })
                .expect("streaming completion must succeed with a real model");
            assert!(
                !streamed.trim().is_empty(),
                "streamed text must be non-empty"
            );
            assert!(
                streamed_tokens > 0,
                "stream callback must fire at least once"
            );

            let text = engine
                .completion(prompt, 2048, Some(0.7))
                .expect("completion must produce text with a real model");
            assert!(
                !text.trim().is_empty(),
                "completion text must be non-empty (empty text was once surfaced as [No response])"
            );

            // 임베딩 — Qwen3.5는 LLM 풀링(POOLING_TYPE_NONE)만 지원해
            // 시퀀스 임베딩이 불가능하다. 카탈로그도 supports_embedding:
            // false로 정확히 표시한다. 엔진이 가짜 벡터를 만들지 않고
            // 정직하게 Err 하는지가 이 모델로 검증 가능한 계약이다.
            // (실제 임베딩 검증은 임베딩 지원 모델에서 수행.)
            let result = engine.embedding("지식 조각 임베딩 검증");
            assert!(
                result.is_err(),
                "an LLM-only model must not produce embeddings — a fake vector would silently corrupt similarity"
            );
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
