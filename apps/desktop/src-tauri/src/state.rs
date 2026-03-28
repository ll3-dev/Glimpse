use std::sync::Mutex;

use crate::llm::LlmEngine;
use crate::models::{
    default_health, default_models, CompletionRequest, CompletionResponse, LoadResult,
    ManagedModelRecord, RuntimeHealth,
};

pub struct DesktopRuntimeState {
    pub models: Mutex<Vec<ManagedModelRecord>>,
    pub health: Mutex<RuntimeHealth>,
    pub llm_engine: Mutex<LlmEngine>,
}

impl DesktopRuntimeState {
    pub fn from_defaults() -> Self {
        Self {
            models: Mutex::new(default_models()),
            health: Mutex::new(default_health()),
            llm_engine: Mutex::new(LlmEngine::new()),
        }
    }

    pub fn list_models(&self) -> Result<Vec<ManagedModelRecord>, String> {
        self.models
            .lock()
            .map(|models| models.clone())
            .map_err(|_| "models lock poisoned".to_string())
    }

    pub fn download_model(&self, model_id: String) -> Result<ManagedModelRecord, String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        let model = models
            .iter_mut()
            .find(|candidate| candidate.id == model_id)
            .ok_or_else(|| format!("Managed model not found: {model_id}"))?;
        model.status = "ready";
        model.path = Some(Box::leak(
            format!("~/Library/Application Support/Glimpse/models/{}.gguf", model.id)
                .into_boxed_str(),
        ));
        Ok(model.clone())
    }

    pub fn load_model(&self, model_id: String, runtime_id: String) -> Result<LoadResult, String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;

        let model_path = models
            .iter()
            .find(|candidate| candidate.id == model_id)
            .and_then(|m| m.path)
            .ok_or_else(|| format!("Managed model not found: {model_id}"))?
            .to_string();

        // Update status for all models
        let mut found = false;
        for model in models.iter_mut() {
            if model.id == model_id {
                model.status = "active";
                found = true;
            } else if model.status == "active" {
                model.status = "ready";
            }
        }

        if !found {
            return Err(format!("Managed model not found: {model_id}"));
        }

        // Load into the LLM engine
        {
            let mut engine = self
                .llm_engine
                .lock()
                .map_err(|_| "llm engine lock poisoned".to_string())?;
            engine.load_model(&model_path)?;
        }

        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        health.status = if runtime_id == "remote-byok" {
            "degraded"
        } else {
            "healthy"
        };
        health.loaded_model_id = Some(model_id.clone());

        Ok(LoadResult {
            loaded_model_id: model_id,
            runtime_id,
        })
    }

    pub fn unload_model(&self, model_id: String) -> Result<(), String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        for model in models.iter_mut() {
            if model.id == model_id && model.status == "active" {
                model.status = "ready";
            }
        }

        // Unload from the LLM engine
        {
            let mut engine = self
                .llm_engine
                .lock()
                .map_err(|_| "llm engine lock poisoned".to_string())?;
            engine.unload_model();
        }

        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        if health.loaded_model_id.as_ref() == Some(&model_id) {
            health.loaded_model_id = None;
            health.last_unload_at = Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|_| "system clock error".to_string())?
                    .as_secs(),
            );
        }

        Ok(())
    }

    pub fn run_completion(&self, request: CompletionRequest) -> Result<CompletionResponse, String> {
        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        health.queue_depth = 1;
        health.loaded_model_id = Some(request.model_id.clone());
        drop(health); // release health lock before engine access

        let prompt = request
            .messages
            .last()
            .map(|message| message.content.clone())
            .unwrap_or_default();

        let max_tokens = request.max_tokens.unwrap_or(256);

        let engine = self
            .llm_engine
            .lock()
            .map_err(|_| "llm engine lock poisoned".to_string())?;

        let text = engine.completion(&prompt, max_tokens)?;

        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        health.queue_depth = 0;

        Ok(CompletionResponse {
            text,
            stop_reason: "completed",
        })
    }

    pub fn run_embedding(&self, input: &str) -> Result<Vec<f32>, String> {
        let engine = self
            .llm_engine
            .lock()
            .map_err(|_| "llm engine lock poisoned".to_string())?;
        engine.embedding(input)
    }

    pub fn get_health(&self) -> Result<RuntimeHealth, String> {
        self.health
            .lock()
            .map(|health| health.clone())
            .map_err(|_| "health lock poisoned".to_string())
    }
}
