export { isOcrAvailable } from './index';

/**
 * 웹은 OCR 네이티브 모듈이 없다 — 조용한 빈 텍스트 대신 명시적 에러.
 */
export async function recognizeText(): Promise<never> {
  throw {
    code: 'UNSUPPORTED',
    message: 'OCR은 모바일 앱에서만 지원됩니다',
  };
}
