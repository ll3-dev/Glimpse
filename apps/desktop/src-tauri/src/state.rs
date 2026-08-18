use std::sync::{Arc, Mutex};

use crate::download;
use crate::llm::LlmEngine;
use crate::models::{
    default_health, default_models, CompletionRequest, CompletionResponse, LoadResult,
    ManagedModelRecord, RuntimeHealth,
};

pub type DesktopRuntimeState = Arc<DesktopRuntimeStateInner>;

fn format_messages_to_prompt(
    messages: &[crate::models::CompletionMessage],
    model_family: Option<&str>,
) -> String {
    if messages.is_empty() {
        return String::new();
    }

    let family = model_family.unwrap_or("qwen-chatml");
    if family == "qwen-chatml" || family == "qwen" {
        let mut prompt = String::new();
        for msg in messages {
            let role = match msg.role.as_str() {
                "system" => "system",
                "assistant" => "assistant",
                _ => "user",
            };
            prompt.push_str(&format!("<|im_start|>{}\n{}\n<|im_end|>\n", role, msg.content));
        }
        prompt.push_str("<|im_start|>assistant\n");
        prompt
    } else {
        // Generic format
        let mut prompt = String::new();
        for msg in messages {
            let role_label = match msg.role.as_str() {
                "system" => "System",
                "assistant" => "Assistant",
                _ => "User",
            };
            prompt.push_str(&format!("{}:\n{}\n\n", role_label, msg.content));
        }
        prompt.push_str("Assistant:\n");
        prompt
    }
}

pub struct DesktopRuntimeStateInner {
    pub models: Mutex<Vec<ManagedModelRecord>>,
    pub health: Mutex<RuntimeHealth>,
    pub llm_engine: Mutex<LlmEngine>,
}

impl DesktopRuntimeStateInner {
    pub fn from_defaults() -> DesktopRuntimeState {
        // 다운로드 중 강제 종료로 남은 tmp 파일 정리
        download::cleanup_stale_tmp_files();

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

        // 중복 다운로드 가드 — 이미 진행 중이면 상태를 덮어쓰지 않는다
        if model.status == "downloading" {
            return Err(format!(
                "Model {} is already downloading",
                model_id
            ));
        }
        model.status = "downloading".into();
        model.download_error = None;
        Ok(model.clone())
    }

    pub fn mark_model_download_failed(&self, model_id: &str, error: &str) -> Result<(), String> {
        let mut models = self
            .models
            .lock()
            .map_err(|_| "models lock poisoned".to_string())?;
        if let Some(model) = models.iter_mut().find(|m| m.id == model_id) {
            model.status = "download_failed".into();
            model.download_error = Some(error.to_string());
        }
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
        // 다운로드 중 레코드 삭제 금지 — 백그라운드 다운로드가 계속되어
        // 상태와 디스크가 어긋난다
        if model.status == "downloading" {
            return Err("Cannot delete a model while it is downloading.".into());
        }

        model.status = "not_downloaded".into();
        model.path = None;
        model.download_error = None;
        Ok(())
    }

    pub fn load_model(&self, model_id: String, runtime_id: String) -> Result<LoadResult, String> {
        // 1. models 락: 경로만 읽고 즉시 해제
        let model_path = {
            let models = self
                .models
                .lock()
                .map_err(|_| "models lock poisoned".to_string())?;
            models
                .iter()
                .find(|candidate| candidate.id == model_id)
                .and_then(|m| m.path.clone())
                .ok_or_else(|| format!("Model not found or not downloaded: {}", model_id))?
        };

        // 2. 엔진에 실제 로드 — 실패하면 상태를 건드리지 않고 그대로 Err
        //    (이전 구조는 status="active"를 먼저 바꿔 불일치 상태를 남겼다)
        {
            let mut engine = self
                .llm_engine
                .lock()
                .map_err(|_| "llm engine lock poisoned".to_string())?;
            engine.load_model(&model_path)?;
        }

        // 3. 로드 성공 후에만 status 전환
        {
            let mut models = self
                .models
                .lock()
                .map_err(|_| "models lock poisoned".to_string())?;
            for model in models.iter_mut() {
                if model.id == model_id {
                    model.status = "active".into();
                } else if model.status == "active" {
                    model.status = "ready".into();
                }
            }
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
        {
            let mut health = self
                .health
                .lock()
                .map_err(|_| "health lock poisoned".to_string())?;
            health.queue_depth = 1;
            health.loaded_model_id = Some(request.model_id.clone());
        }

        let model_family = self
            .models
            .lock()
            .ok()
            .and_then(|models| {
                models
                    .iter()
                    .find(|m| m.id == request.model_id)
                    .map(|m| m.family.clone())
            });

        let prompt = format_messages_to_prompt(&request.messages, model_family.as_deref());
        let max_tokens = request.max_tokens.unwrap_or(256);

        let engine = self
            .llm_engine
            .lock()
            .map_err(|_| "llm engine lock poisoned".to_string())?;

        let completion = engine.completion(&prompt, max_tokens);

        // 엔진 실패 시에도 queue_depth 를 복원한다 — 이전 코드는 조기
        // 반환 경로에서 1이 영구 잔존했다.
        {
            let mut health = self
                .health
                .lock()
                .map_err(|_| "health lock poisoned".to_string())?;
            health.queue_depth = 0;
        }

        let text = completion?;

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
        {
            let mut health = self
                .health
                .lock()
                .map_err(|_| "health lock poisoned".to_string())?;
            health.queue_depth = 1;
            health.loaded_model_id = Some(request.model_id.clone());
        }

        let model_family = self
            .models
            .lock()
            .ok()
            .and_then(|models| {
                models
                    .iter()
                    .find(|m| m.id == request.model_id)
                    .map(|m| m.family.clone())
            });

        let prompt = format_messages_to_prompt(&request.messages, model_family.as_deref());
        let max_tokens = request.max_tokens.unwrap_or(256);

        let engine = self
            .llm_engine
            .lock()
            .map_err(|_| "llm engine lock poisoned".to_string())?;

        let completion = engine.completion_stream(&prompt, max_tokens, on_token);

        // 엔진 실패 시에도 queue_depth 를 복원한다.
        {
            let mut health = self
                .health
                .lock()
                .map_err(|_| "health lock poisoned".to_string())?;
            health.queue_depth = 0;
        }

        let text = completion?;

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
