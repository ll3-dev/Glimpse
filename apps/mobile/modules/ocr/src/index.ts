/**
 * 온디바이스 OCR 네이티브 표면 — iOS Vision / Android ML Kit.
 *
 * 네이티브 모듈은 expo-module 구조로 링크되고, JS 진입은 globalThis에
 * 설치되는 `__glimpseOcr` 객체를 통해 한다 (rustra-jsi와 동일한 global
 * 계약 패턴 — 네이티브 미설치 시 undefined로 폴백 판별 가능).
 */

export type OcrResult = {
  text: string;
  confidence: number;
  language: string;
};

export type OcrErrorCode = 'UNSUPPORTED' | 'FAILED';

export type OcrError = {
  code: OcrErrorCode;
  message: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __glimpseOcr: {
    recognizeText(imageUri: string): Promise<OcrResult>;
  } | undefined;
}

export function isOcrAvailable(): boolean {
  return typeof globalThis.__glimpseOcr !== 'undefined';
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  const native = globalThis.__glimpseOcr;
  if (!native) {
    throw {
      code: 'UNSUPPORTED',
      message: 'OCR is not available on this platform',
    } satisfies OcrError;
  }
  return native.recognizeText(imageUri);
}
