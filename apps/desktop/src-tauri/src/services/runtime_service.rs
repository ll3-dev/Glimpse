use crate::models::{
    default_runtimes, CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse,
    LoadResult, ManagedModelRecord, RuntimeDescriptor, RuntimeHealth,
};
use crate::state::DesktopRuntimeState;

pub struct DesktopRuntimeService;

impl DesktopRuntimeService {
    pub fn list_available_runtimes() -> Vec<RuntimeDescriptor> {
        default_runtimes()
    }

    pub fn list_managed_models(
        state: &DesktopRuntimeState,
    ) -> Result<Vec<ManagedModelRecord>, String> {
        state.list_models()
    }

    pub fn load_model(
        state: &DesktopRuntimeState,
        model_id: String,
        runtime_id: String,
    ) -> Result<LoadResult, String> {
        state.load_model(model_id, runtime_id)
    }

    pub fn unload_model(state: &DesktopRuntimeState, model_id: String) -> Result<(), String> {
        state.unload_model(model_id)
    }

    pub fn run_completion(
        state: &DesktopRuntimeState,
        request: CompletionRequest,
    ) -> Result<CompletionResponse, String> {
        state.run_completion(request)
    }

    pub fn run_embedding(
        state: &DesktopRuntimeState,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, String> {
        let vector = state.run_embedding(&request.input)?;
        Ok(EmbeddingResponse { vector })
    }

    pub fn get_runtime_health(state: &DesktopRuntimeState) -> Result<RuntimeHealth, String> {
        state.get_health()
    }
}
