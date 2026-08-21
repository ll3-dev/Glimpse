export interface AlternativeRuntimeModel {
  id: string;
  name: string;
  artifact: string;
  runtime: string;
  note: string;
  url: string;
}

export const ALTERNATIVE_RUNTIME_MODELS: AlternativeRuntimeModel[] = [
  {
    id: "microsoft-bitnet-2b",
    name: "Microsoft BitNet b1.58 2B-4T",
    artifact: "1.58-bit · I2_S · 1.19GB",
    runtime: "BitNet.cpp",
    note: "ARM 커널은 지원되지만 현재 llama.rn 번들에는 I2_S 양자화 타입이 없어요.",
    url: "https://huggingface.co/microsoft/bitnet-b1.58-2B-4T-gguf",
  },
  {
    id: "falcon-e-1b",
    name: "Falcon-E 1B Instruct",
    artifact: "1.58-bit · I2_S · 666MB",
    runtime: "BitNet.cpp",
    note: "ARM에서 실행 가능한 초경량 후보지만 BitNet 네이티브 브리지가 필요해요.",
    url: "https://huggingface.co/tiiuae/Falcon-E-1B-Instruct-GGUF",
  },
  {
    id: "falcon-e-3b",
    name: "Falcon-E 3B Instruct",
    artifact: "1.58-bit · I2_S · 1.00GB",
    runtime: "BitNet.cpp",
    note: "1B보다 품질을 높인 후보로, 현재 앱에서는 아직 직접 선택할 수 없어요.",
    url: "https://huggingface.co/tiiuae/Falcon-E-3B-Instruct-GGUF",
  },
  {
    id: "qwen3-edgerazor-mixed",
    name: "Qwen3 EdgeRazor 1.88 / 2.79-bit",
    artifact: "혼합 정밀도 QAT · Safetensors",
    runtime: "EdgeRazor / Transformers",
    note: "품질과 크기 균형형이지만 저자 저장소 기준으로 아직 해당 GGUF 타입은 없어요.",
    url: "https://huggingface.co/collections/zhangsq-nju/edgerazor-nbit",
  },
  {
    id: "qwen3-mnn",
    name: "Qwen3 Mobile MNN",
    artifact: "모바일 4-bit 패키지",
    runtime: "Alibaba MNN",
    note: "Qwen 공식 프로젝트가 안내하는 모바일 경로지만 llama.rn과 별도 엔진 통합이 필요해요.",
    url: "https://github.com/alibaba/MNN",
  },
];
