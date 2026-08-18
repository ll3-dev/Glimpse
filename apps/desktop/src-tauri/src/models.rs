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
    /// 다운로드 실패 사유 — `download_failed` 상태일 때 설정된다
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_error: Option<String>,
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

// LLM stream and model download events moved to the rustra push path —
// payloads now live in `glimpse-bridge` `src/events.rs`
// (`emit_llm_token`, `emit_llm_done`, `emit_model_download_progress`,
// `emit_model_download_done`). The former handwritten event structs were
// removed with that switch.

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
        // Mobile + Desktop
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
            download_error: None,
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
            download_error: None,
        },
        ManagedModelRecord {
            id: "ministral-3-3b-instruct-q4".into(),
            name: "Ministral-3 3B Instruct".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Ministral-3-3B-Instruct-2512-GGUF".into(),
            filename: "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf".into(),
            path: None,
            size: 2_147_483_648,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
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
            download_error: None,
        },
        ManagedModelRecord {
            id: "ministral-3-3b-reasoning-q4".into(),
            name: "Ministral-3 3B Reasoning".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "MaziyarPanahi/Ministral-3-3B-Reasoning-2512-GGUF".into(),
            filename: "Ministral-3-3B-Reasoning-2512-Q4_K_M.gguf".into(),
            path: None,
            size: 2_147_483_648,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: false,
            status: "not_downloaded".into(),
            download_error: None,
        },

        // Desktop medium
        ManagedModelRecord {
            id: "qwen3.5-9b-q4".into(),
            name: "Qwen 3.5 9B (Q4_K_M)".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-9B-GGUF".into(),
            filename: "Qwen3.5-9B-Q4_K_M.gguf".into(),
            path: None,
            size: 5_683_793_920,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "ministral-3-8b-instruct-q4".into(),
            name: "Ministral-3 8B Instruct".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Ministral-3-8B-Instruct-2512-GGUF".into(),
            filename: "Ministral-3-8B-Instruct-2512-Q4_K_M.gguf".into(),
            path: None,
            size: 5_197_434_880,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "ministral-3-14b-reasoning-q4".into(),
            name: "Ministral-3 14B Reasoning".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Ministral-3-14B-Reasoning-2512-GGUF".into(),
            filename: "Ministral-3-14B-Reasoning-2512-Q4_K_M.gguf".into(),
            path: None,
            size: 8_230_502_400,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: false,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "phi-4-reasoning-vision-15b-q4".into(),
            name: "Phi-4 Reasoning Vision 15B".into(),
            family: "phi".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "jamesburton/Phi-4-reasoning-vision-15B-GGUF".into(),
            filename: "Phi-4-reasoning-vision-15B-Q4_K_M.gguf".into(),
            path: None,
            size: 9_059_696_640,
            context_length: 16_384,
            supports_embedding: false,
            supports_tools: false,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "magistral-small-2509-q4".into(),
            name: "Magistral Small 24B".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Magistral-Small-2509-GGUF".into(),
            filename: "Magistral-Small-2509-Q4_K_M.gguf".into(),
            path: None,
            size: 14_324_375_552,
            context_length: 131_072,
            supports_embedding: false,
            supports_tools: false,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "devstral-small-2-24b-q4".into(),
            name: "Devstral Small 2 24B".into(),
            family: "mistral".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Devstral-Small-2-24B-Instruct-2512-GGUF".into(),
            filename: "Devstral-Small-2-24B-Instruct-2512-Q4_K_M.gguf".into(),
            path: None,
            size: 14_324_375_552,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },

        // Desktop large
        ManagedModelRecord {
            id: "qwen3.5-27b-q4".into(),
            name: "Qwen 3.5 27B".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-27B-GGUF".into(),
            filename: "Qwen3.5-27B-Q4_K_M.gguf".into(),
            path: None,
            size: 16_744_440_832,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "glm-4.7-flash-q4".into(),
            name: "GLM-4.7 Flash".into(),
            family: "glm".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/GLM-4.7-Flash-GGUF".into(),
            filename: "GLM-4.7-Flash-Q4_K_M.gguf".into(),
            path: None,
            size: 18_307_849_216,
            context_length: 131_072,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },
        ManagedModelRecord {
            id: "qwen3.5-35b-a3b-q4".into(),
            name: "Qwen 3.5 35B MoE".into(),
            family: "qwen-chatml".into(),
            quantization: "Q4_K_M".into(),
            format: "gguf".into(),
            repo: "unsloth/Qwen3.5-35B-A3B-GGUF".into(),
            filename: "Qwen3.5-35B-A3B-Q4_K_M.gguf".into(),
            path: None,
            size: 22_011_733_504,
            context_length: 262_144,
            supports_embedding: false,
            supports_tools: true,
            status: "not_downloaded".into(),
            download_error: None,
        },

        // Embedding
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
            download_error: None,
        },
        ManagedModelRecord {
            id: "nomic-embed-text-v2-moe-q8_0".into(),
            name: "Nomic Embed v2 MoE (Q8_0)".into(),
            family: "nomic".into(),
            quantization: "Q8_0".into(),
            format: "gguf".into(),
            repo: "nomic-ai/nomic-embed-text-v2-moe-GGUF".into(),
            filename: "nomic-embed-text-v2-moe.Q8_0.gguf".into(),
            path: None,
            size: 293_601_280,
            context_length: 8192,
            supports_embedding: true,
            supports_tools: false,
            status: "not_downloaded".into(),
            download_error: None,
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
