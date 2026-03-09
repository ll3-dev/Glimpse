export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopTokens?: string[];
}

export interface GenerateResult {
  text: string;
  tokensGenerated: number;
  timingMs: number;
}

export interface StreamOptions extends GenerateOptions {
  onToken?: (token: string) => void;
}

export interface LoadModelOptions {
  contextSize?: number;
  gpuLayers?: number;
  useMlock?: boolean;
  onProgress?: (progress: number) => void;
}

export interface LlamaService {
  loadModel(modelPath: string, options?: LoadModelOptions): Promise<void>;
  isModelLoaded(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  generateStream(prompt: string, options?: StreamOptions): Promise<GenerateResult>;
  stopGeneration(): Promise<void>;
  unloadModel(): Promise<void>;
}
