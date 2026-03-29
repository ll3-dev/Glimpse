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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedModelRecord {
    pub id: &'static str,
    pub name: &'static str,
    pub family: &'static str,
    pub quantization: &'static str,
    pub format: &'static str,
    pub path: Option<&'static str>,
    pub size: u64,
    pub context_length: u32,
    pub supports_embedding: bool,
    pub supports_tools: bool,
    pub status: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHealth {
    pub status: &'static str,
    pub loaded_model_id: Option<String>,
    pub last_unload_at: Option<u64>,
    pub queue_depth: u8,
    pub memory_pressure: &'static str,
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
    pub stop_reason: &'static str,
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
            id: "qwen3.5-0.8b-unsloth-q4",
            name: "Qwen 3.5 0.8B Unsloth (Q4_K_M)",
            family: "qwen-chatml",
            quantization: "Q4_K_M",
            format: "gguf",
            path: None,
            size: 562_036_672,
            context_length: 8192,
            supports_embedding: false,
            supports_tools: true,
            status: "ready",
        },
        ManagedModelRecord {
            id: "qwen3.5-2b-unsloth-q4",
            name: "Qwen 3.5 2B Unsloth (Q4_K_M)",
            family: "qwen-chatml",
            quantization: "Q4_K_M",
            format: "gguf",
            path: None,
            size: 1_353_293_824,
            context_length: 8192,
            supports_embedding: false,
            supports_tools: true,
            status: "ready",
        },
        ManagedModelRecord {
            id: "qwen3.5-4b-unsloth-q4",
            name: "Qwen 3.5 4B Unsloth (Q4_K_M)",
            family: "qwen-chatml",
            quantization: "Q4_K_M",
            format: "gguf",
            path: None,
            size: 2_899_560_448,
            context_length: 8192,
            supports_embedding: false,
            supports_tools: true,
            status: "ready",
        },
        ManagedModelRecord {
            id: "gemma-3n-e2b-q3",
            name: "Gemma 3N E2B IT (Q3_K_M)",
            family: "generic-instruct",
            quantization: "Q3_K_M",
            format: "gguf",
            path: None,
            size: 2_462_556_160,
            context_length: 8192,
            supports_embedding: false,
            supports_tools: false,
            status: "ready",
        },
        ManagedModelRecord {
            id: "nomic-embed-text-v1.5-q8_0",
            name: "Nomic Embed Text v1.5 (Q8_0)",
            family: "nomic",
            quantization: "Q8_0",
            format: "gguf",
            path: None,
            size: 327_155_712,
            context_length: 2048,
            supports_embedding: true,
            supports_tools: false,
            status: "ready",
        },
    ]
}

pub fn default_health() -> RuntimeHealth {
    RuntimeHealth {
        status: "healthy",
        loaded_model_id: None,
        last_unload_at: None,
        queue_depth: 0,
        memory_pressure: "normal",
    }
}
