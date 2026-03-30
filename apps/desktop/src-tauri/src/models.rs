use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeDescriptor {
    pub id: &'static str,
    pub display_name: &'static str,
    pub priority: u8,
    pub availability: &'static str,
    pub reason: Option<&'static str>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedModelRecord {
    pub id: String,
    pub name: String,
    pub family: String,
    pub quantization: String,
    pub format: String,
    pub repo: String,
    pub filename: String,
    pub path: Option<String>,
    pub size: u64,
    pub context_length: u32,
    pub supports_embedding: bool,
    pub supports_tools: bool,
    pub status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHealth {
    pub status: String,
    pub loaded_model_id: Option<String>,
    pub last_unload_at: Option<u64>,
    pub queue_depth: u8,
    pub memory_pressure: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub runtime_id: String,
    pub model_id: String,
    pub messages: Vec<CompletionMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResponse {
    pub text: String,
    pub stop_reason: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingRequest {
    pub runtime_id: String,
    pub model_id: String,
    pub input: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingResponse {
    pub vector: Vec<f32>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadResult {
    pub loaded_model_id: String,
    pub runtime_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamTokenEvent {
    pub request_id: String,
    pub token: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamDoneEvent {
    pub request_id: String,
    pub full_text: String,
    pub stop_reason: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub model_id: String,
    pub bytes_received: u64,
    pub total_bytes: u64,
    pub percentage: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadDoneEvent {
    pub model_id: String,
    pub path: String,
}

pub fn default_runtimes() -> Vec<RuntimeDescriptor> {
    vec![
        RuntimeDescriptor {
            id: "managed-local",
            display_name: "Managed Local Model",
            priority: 1,
            availability: "available",
            reason: None,
        },
        RuntimeDescriptor {
            id: "apple-native",
            display_name: "Apple Native Runtime",
            priority: 2,
            availability: "degraded",
            reason: Some("Enabled when Apple Intelligence is available on the host."),
        },
        RuntimeDescriptor {
            id: "remote-byok",
            display_name: "Remote BYOK",
            priority: 3,
            availability: "available",
            reason: Some("Used as the final fallback runtime."),
        },
    ]
}

pub fn default_models() -> Vec<ManagedModelRecord> {
    // -- Synced with packages/shared LOCAL_MODEL_REGISTRY --
    vec![
        ManagedModelRecord {
            id: "qwen3.5-0.8b-q4".into(),
            name: "Qwen 3.5 0.8B (Q4_K_M)".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-0.8B-GGUF".into(),
            filename: "Qwen3.5-0.8B-Q4_K_M.gguf".into(),
            path: None,
            size: 536_870_912,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
        },
        ManagedModelRecord {
            id: "qwen3.5-2b-q4".into(),
            name: "Qwen 3.5 2B (Q4_K_M)".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-2B-GGUF".into(),
            filename: "Qwen3.5-2B-Q4_K_M.gguf".into(),
            path: None,
            size: 1_277_802_496,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
        },
        ManagedModelRecord {
            id: "qwen3.5-4b-q4".into(),
            name: "Qwen 3.5 4B (Q4_K_M)".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-4B-GGUF".into(),
            filename: "Qwen3.5-4B-Q4_K_M.gguf".into(),
            path: None,
            size: 2_738_398_208,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
        },
        ManagedModelRecord {
            id: "nomic-embed-text-v1.5-q8_0".into(),
            name: "Nomic Embed v1.5 (Q8_0)".into(),
            family: "nomic".into(),
            quantization: "Q8_0".into(),
            format: "gguf".into(),
            repo: "nomic-ai/nomic-embed-text-v1.5-GGUF".into(),
            filename: "nomic-embed-text-v1.5.Q8_0.gguf".into(),
            path: None,
            size: 327_155_712,
            context_length: 8192,
            supports_embedding: true,
            supports_tools: false,
            status: "not_downloaded".into(),
        },
    ]
}

pub fn default_health() -> RuntimeHealth {
    RuntimeHealth {
        status: "healthy".into(),
        loaded_model_id: None,
        last_unload_at: None,
        queue_depth: 0,
        memory_pressure: "normal".into(),
    }
}
