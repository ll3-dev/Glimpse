import {
  isOcrAvailable,
  recognizeText,
  type OcrError,
} from '../../../../modules/ocr/src';

export type OcrOutcome =
  | { status: 'ok'; text: string; confidence: number; language: string }
  | { status: 'no_text' }
  | { status: 'error'; message: string };

const CONFIDENCE_THRESHOLD = 0.5;

/**
 * 선택된 스크린샷에 온디바이스 OCR을 실행한다. throw하지 않고 판별 가능한
 * outcome을 반환해 폼이 우아하게 저하되도록 한다.
 */
export async function runOcr(imageUri: string): Promise<OcrOutcome> {
  if (!isOcrAvailable()) {
    return { status: 'error', message: '이 기기에서는 OCR을 사용할 수 없습니다' };
  }
  try {
    const result = await recognizeText(imageUri);
    if (result.confidence < CONFIDENCE_THRESHOLD || result.text.trim() === '') {
      return { status: 'no_text' };
    }
    return {
      status: 'ok',
      text: result.text,
      confidence: result.confidence,
      language: result.language,
    };
  } catch (error) {
    const ocrError = error as Partial<OcrError>;
    return {
      status: 'error',
      message: ocrError.message ?? 'OCR 처리에 실패했습니다',
    };
  }
}
