/**
 * Desktop AI Provider Types
 *
 * Self-contained types for the desktop AI provider routing system.
 * No dependency on Effect -- plain async/await throughout.
 */

// ---------------------------------------------------------------------------
// Provider kinds
// ---------------------------------------------------------------------------

/**
 * managed-llm — 앱이 관리하는 llama.cpp 런타임(GGUF 자동 다운로드).
 * local-server — 외부 로컬 서버(LM Studio·Ollama 등)의 OpenAI 호환 엔드포인트.
 * 클라우드 BYOK는 2026-09-08 완전 로컬 전환으로 제거되었다.
 */
export type AIProviderKind = 'managed-llm' | 'local-server' | 'rules' | 'stub';

export type AIFeature = 'metadata' | 'labeling' | 'chat';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface AIProviderError {
  code: string;
  message: string;
  provider: AIProviderKind;
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  text: string;
  provider: AIProviderKind;
  tokensUsed?: number;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface MetadataOutput {
  summary: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface AIProvider {
  readonly kind: AIProviderKind;
  isAvailable(): Promise<boolean>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  generateMetadata(content: string, title?: string | null): Promise<MetadataOutput>;
}
