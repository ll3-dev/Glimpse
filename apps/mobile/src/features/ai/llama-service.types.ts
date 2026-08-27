export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopTokens?: string[];
}

export interface LlamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type LlamaPromptInput =
  | string
  | {
      messages: LlamaChatMessage[];
      /** Passed to the GGUF's embedded Jinja chat template. */
      enableThinking?: boolean;
    };

export interface GenerateResult {
  text: string;
  tokensGenerated: number;
  timingMs: number;
}

export interface StreamOptions extends GenerateOptions {
  requestId?: string;
  onToken?: (token: string) => void;
}

export interface LoadModelOptions {
  contextSize?: number;
  gpuLayers?: number;
  useMlock?: boolean;
  useMmap?: boolean;
  flashAttention?: boolean;
  threads?: number;
  /** llama.cpp `--embedding` — 임베딩 전용 컨텍스트(채팅 컨텍스트와 분리). */
  embedding?: boolean;
  /** llama.cpp pooling 전략 — nomic 등 mean pooling이 기본. */
  poolingType?: 'mean' | 'cls' | 'last' | 'rank' | 'none';
  onProgress?: (progress: number) => void;
}

export interface LlamaService {
  loadModel(modelPath: string, options?: LoadModelOptions): Promise<void>;
  isModelLoaded(): boolean;
  generate(prompt: LlamaPromptInput, options?: GenerateOptions): Promise<GenerateResult>;
  generateStream(prompt: LlamaPromptInput, options?: StreamOptions): Promise<GenerateResult>;
  stopGeneration(): Promise<void>;
  unloadModel(): Promise<void>;
}
