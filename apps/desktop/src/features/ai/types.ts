/**
 * Desktop AI Provider Types
 *
 * Self-contained types for the desktop AI provider routing system.
 * No dependency on Effect -- plain async/await throughout.
 */

// ---------------------------------------------------------------------------
// Provider kinds
// ---------------------------------------------------------------------------

export type AIProviderKind = 'local-llm' | 'byok' | 'rules' | 'stub';

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
