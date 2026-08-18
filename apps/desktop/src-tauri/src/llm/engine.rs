// ---------------------------------------------------------------------------
// Real implementation backed by llama-cpp-2 (requires cmake + C++ toolchain)
// ---------------------------------------------------------------------------
#[cfg(feature = "llm")]
mod imp {
    use std::path::PathBuf;

    use llama_cpp_2::llama_backend::LlamaBackend;
    use llama_cpp_2::llama_batch::LlamaBatch;
    use llama_cpp_2::model::{AddBos, LlamaModel, LlamaModelLoadError, LlamaModelParams};
    use llama_cpp_2::sampling::LlamaSampler;

    pub struct LlmEngine {
        backend: LlamaBackend,
        model: Option<LlamaModel>,
        model_path: Option<PathBuf>,
    }

    impl LlmEngine {
        pub fn new() -> Self {
            let backend = LlamaBackend::init().expect("Failed to initialize llama backend");
            Self {
                backend,
                model: None,
                model_path: None,
            }
        }

        pub fn load_model(&mut self, path: &str) -> Result<(), String> {
            let model_params = LlamaModelParams::default();
            let model = LlamaModel::load_from_file(&self.backend, PathBuf::from(path), &model_params)
                .map_err(|e: LlamaModelLoadError| format!("Failed to load model: {}", e))?;
            self.model = Some(model);
            self.model_path = Some(PathBuf::from(path));
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

        pub fn completion(&self, prompt: &str, max_tokens: u32) -> Result<String, String> {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create a context for this completion request
            let ctx_params = llama_cpp_2::context::LlamaContextParams::default();
            let mut ctx = model
                .create_context(&ctx_params)
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
            let mut batch = LlamaBatch::new(n_tokens as i32, 1);

            for (i, &token) in tokens.iter().take(n_tokens).enumerate() {
                // logits = true only for the last token
                let is_last = i == n_tokens - 1;
                batch.add(token, i as i32, &[0], is_last).map_err(|e| {
                    format!("Failed to add token to batch: {}", e)
                })?;
            }

            ctx.decode(&mut batch)
                .map_err(|e| format!("Decode failed: {}", e))?;

            // Sample tokens auto-regressively
            let eos_token = model.eos_token();
            let mut sampler = LlamaSampler::chain_simple(vec![
                // TODO: expose temperature/top-p as parameters
                LlamaSampler::dist_default_seed(),
            ]);
            // Initialize the sampler with the model's n_vocab
            // The dist sampler does not need init; chain_simple handles it.

            let mut generated_tokens = Vec::new();
            let mut n_cur = n_tokens as i32;

            for _ in 0..max_tokens {
                // Get logits for the last token
                let logits = ctx.logits_last();
                sampler.accept(&logits);
                let new_token = sampler.sample_token(&model, &logits);

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

            // Convert tokens back to string
            let text = model
                .tokens_to_str(generated_tokens.as_slice())
                .map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(text)
        }

        pub fn completion_stream<F>(
            &self,
            prompt: &str,
            max_tokens: u32,
            on_token: F,
        ) -> Result<String, String>
        where
            F: FnMut(&str),
        {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create a context for this completion request
            let ctx_params = llama_cpp_2::context::LlamaContextParams::default();
            let mut ctx = model
                .create_context(&ctx_params)
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
            let mut batch = LlamaBatch::new(n_tokens as i32, 1);

            for (i, &token) in tokens.iter().take(n_tokens).enumerate() {
                let is_last = i == n_tokens - 1;
                batch.add(token, i as i32, &[0], is_last).map_err(|e| {
                    format!("Failed to add token to batch: {}", e)
                })?;
            }

            ctx.decode(&mut batch)
                .map_err(|e| format!("Decode failed: {}", e))?;

            let eos_token = model.eos_token();
            let mut sampler = LlamaSampler::chain_simple(vec![
                LlamaSampler::dist_default_seed(),
            ]);

            let mut generated_tokens = Vec::new();
            let mut n_cur = n_tokens as i32;
            let mut on_token = on_token;

            for _ in 0..max_tokens {
                let logits = ctx.logits_last();
                sampler.accept(&logits);
                let new_token = sampler.sample_token(&model, &logits);

                if new_token == eos_token {
                    break;
                }

                generated_tokens.push(new_token);

                // Convert this single token to a string and invoke the callback
                if let Ok(token_str) = model.tokens_to_str(&[new_token]) {
                    on_token(&token_str);
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
            let text = model
                .tokens_to_str(generated_tokens.as_slice())
                .map_err(|e| format!("Token-to-string failed: {}", e))?;

            Ok(text)
        }

        pub fn embedding(&self, text: &str) -> Result<Vec<f32>, String> {
            let model = self.model.as_ref().ok_or("No model loaded")?;

            // Create context with embeddings enabled
            let mut ctx_params = llama_cpp_2::context::LlamaContextParams::default();
            ctx_params.embedding = true;
            let mut ctx = model
                .create_context(&ctx_params)
                .map_err(|e| format!("Failed to create context: {}", e))?;

            // Tokenize
            let tokens = model
                .str_to_token(text, AddBos::Always)
                .map_err(|e| format!("Tokenization failed: {}", e))?;

            // Create and evaluate batch
            let n_tokens = tokens.len();
            let mut batch = LlamaBatch::new(n_tokens as i32, 1);
            for (i, &token) in tokens.iter().enumerate() {
                batch
                    .add(token, i as i32, &[0], false)
                    .map_err(|e| format!("Failed to add token to batch: {}", e))?;
            }

            ctx.decode(&mut batch)
                .map_err(|e| format!("Decode failed: {}", e))?;

            // Get embeddings
            let embeddings = ctx
                .embeddings_seq_ith(0)
                .map_err(|e| format!("Failed to get embeddings: {}", e))?;

            Ok(embeddings.to_vec())
        }
    }
}

// ---------------------------------------------------------------------------
// Stub implementation when the llm feature is disabled
// ---------------------------------------------------------------------------
#[cfg(not(feature = "llm"))]
mod imp {
    use std::path::PathBuf;

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

        pub fn load_model(&mut self, path: &str) -> Result<(), String> {
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

        pub fn completion(&self, prompt: &str, max_tokens: u32) -> Result<String, String> {
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            // TODO: implement real completion via llama-cpp-2 (enable `llm` feature)
            let preview = &prompt[..prompt.len().min(50)];
            Ok(format!(
                "[stub] LLM response (max_tokens={max_tokens}) to: {preview}"
            ))
        }

        pub fn completion_stream<F>(
            &self,
            prompt: &str,
            max_tokens: u32,
            on_token: F,
        ) -> Result<String, String>
        where
            F: FnMut(&str),
        {
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            let preview = &prompt[..prompt.len().min(50)];
            let full_response = format!(
                "[stub] LLM response (max_tokens={max_tokens}) to: {preview}"
            );
            let mut on_token = on_token;
            for ch in full_response.chars() {
                let s = ch.to_string();
                on_token(&s);
            }
            Ok(full_response)
        }

        pub fn embedding(&self, text: &str) -> Result<Vec<f32>, String> {
            if !self.is_loaded() {
                return Err("No model loaded".to_string());
            }
            // TODO: implement real embedding via llama-cpp-2 (enable `llm` feature)
            let _ = text;
            Ok(vec![0.0; 768])
        }
    }
}

pub use imp::LlmEngine;
