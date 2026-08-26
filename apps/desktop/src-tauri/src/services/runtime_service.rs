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

    /// 임베딩은 llama.cpp 동기 호출이라 수 초 블로킹할 수 있다. 메인 스레드
    /// 프리즈를 피하기 위해 command(async fn)에서는 이 헬퍼가 반환하는
    /// 클로저를 spawn_blocking 위에서 돌린다(뮤텍스는 클로저 내부에서 유지).
    pub fn run_embedding_blocking(
        state: DesktopRuntimeState,
        request: EmbeddingRequest,
    ) -> impl FnOnce() -> Result<EmbeddingResponse, String> + Send + 'static {
        move || {
            let vector = state.run_embedding(&request.input)?;
            Ok(EmbeddingResponse { vector })
        }
    }

    pub fn get_runtime_health(state: &DesktopRuntimeState) -> Result<RuntimeHealth, String> {
        state.get_health()
    }
}
