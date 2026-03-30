use std::sync::{Arc, Mutex};

use crate::download;
use crate::llm::LlmEngine;
use crate::models::{
    default_health, default_models, CompletionRequest, CompletionResponse, LoadResult,
    ManagedModelRecord, RuntimeHealth,
};

pub type DesktopRuntimeState = Arc<DesktopRuntimeStateInner>;

pub struct DesktopRuntimeStateInner {
    pub models: Mutex<Vec<ManagedModelRecord>>,
    pub health: Mutex<RuntimeHealth>,
    pub llm_engine: Mutex<LlmEngine>,
}

impl DesktopRuntimeStateInner {
    pub fn from_defaults() -> DesktopRuntimeState {
        let mut models = default_models();
        download::sync_download_status(&mut models);

        Arc::new(Self {
            models: Mutex::new(models),
            health: Mutex::new(default_health()),
            llm_engine: Mutex::new(LlmEngine::new()),
        })
    }

    pub fn list_models(&self) -> Result<Vec<ManagedModelRecord>, String> {
        self.models
            .lock()
            .map(|models| models.clone())
            .map_err(|_| "models lock poisoned".to_string())
    }

    pub fn get_model(&self, model_id: &str) -> Result<ManagedModelRecord, String> {
        self.models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())
            .and_then(|models| {
                models
                    .iter()
                    .find(|m| m.id == model_id)
                    .cloned()
                    .ok_or_else(|| format!("Model not found: {}", model_id))
            })
    }

    pub fn mark_model_downloaded(&self, model_id: &str, path: &str) -> Result<ManagedModelRecord, String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        let model = models
            .iter_mut()
            .find(|m| m.id == model_id)
            .ok_or_else(|| format!("Model not found: {}", model_id))?;
        model.status = "ready".into();
        model.path = Some(path.to_string());
        Ok(model.clone())
    }

    pub fn mark_model_downloading(&self, model_id: &str) -> Result<ManagedModelRecord, String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        let model = models
            .iter_mut()
            .find(|m| m.id == model_id)
            .ok_or_else(|| format!("Model not found: {}", model_id))?;
        model.status = "downloading".into();
        Ok(model.clone())
    }

    pub fn mark_model_download_failed(&self, model_id: &str, error: &str) -> Result<(), String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        if let Some(model) = models.iter_mut().find(|m| m.id == model_id) {
            model.status = "download_failed".into();
        }
        let _ = error; // TODO: store error in model record
        Ok(())
    }

    pub fn delete_model(&self, model_id: &str) -> Result<(), String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        let model = models
            .iter_mut()
            .find(|m| m.id == model_id)
            .ok_or_else(|| format!("Model not found: {}", model_id))?;

        if model.status == "active" {
            return Err("Cannot delete an active model. Unload it first.".into());
        }

        model.status = "not_downloaded".into();
        model.path = None;
        Ok(())
    }

    pub fn load_model(&self, model_id: String, runtime_id: String) -> Result<LoadResult, String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;

        let model_path = models
            .iter()
            .find(|candidate| candidate.id == model_id)
            .and_then(|m| m.path.clone())
            .ok_or_else(|| format!("Model not found or not downloaded: {}", model_id))?;

        // Update status for all models
        let mut found = false;
        for model in models.iter_mut() {
            if model.id == model_id {
                model.status = "active".into();
                found = true;
            } else if model.status == "active" {
                model.status = "ready".into();
            }
        }

        if !found {
            return Err(format!("Model not found: {}", model_id));
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
            "degraded".into()
        } else {
            "healthy".into()
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
                model.status = "ready".into();
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
        drop(health);

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
            stop_reason: "completed".into(),
        })
    }

    pub fn run_completion_stream<F>(
        &self,
        request: CompletionRequest,
        on_token: F,
    ) -> Result<CompletionResponse, String>
    where
        F: FnMut(&str),
    {
        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        health.queue_depth = 1;
        health.loaded_model_id = Some(request.model_id.clone());
        drop(health);

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

        let text = engine.completion_stream(&prompt, max_tokens, on_token)?;

        let mut health = self
            .health
            .lock()
            .map_err(|_| "health lock poisoned".to_string())?;
        health.queue_depth = 0;

        Ok(CompletionResponse {
            text,
            stop_reason: "completed".into(),
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
