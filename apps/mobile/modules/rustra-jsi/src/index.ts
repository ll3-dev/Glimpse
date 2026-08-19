import { NativeModules } from 'react-native';

/**
 * JSI 네이티브 표면 — `@rustra/react-native`의 RustraNative 호환 서브셋.
 *
 * JSON 경로(createReactNativeEngine)만 사용하며, rkyvV2 등 이진 코덱은
 * week-3에서 추가한다. getSchema/getContractHash는 라이브 스키마 조회와
 * F5 계약 해시 검증에 쓰인다.
 */
export type RustraNative = {
  invoke(payload: ArrayBuffer): ArrayBuffer;
  invokeJson(payload: ArrayBuffer): ArrayBuffer;
  invokePostcardFFI(payload: ArrayBuffer): ArrayBuffer;
  getSchema?(): ArrayBuffer;
  getContractHash?(): ArrayBuffer;
  onEvent?(name: string, callback: (payloadJson: string) => void): void;
  offEvent?(name: string): void;
  /** CallInvoker 없는 호스트의 수동 drain 폴백. */
  drainEvents?(): number;
};

declare global {
  var __rustraNative: RustraNative | undefined;
}

export async function installRustraJSI(): Promise<void> {
  const module = NativeModules.RustraJSI;
  if (!module) {
    throw new Error(
      'RustraJSI native module not found. Make sure the native module is linked.',
    );
  }
  await module.install();

  if (!globalThis.__rustraNative) {
    throw new Error(
      'RustraJSI.install() completed but __rustraNative was not set on globalThis.',
    );
  }
}

export function getRustraNative(): RustraNative {
  const native = globalThis.__rustraNative;
  if (!native) {
    throw new Error(
      'RustraJSI native module not installed. Call installRustraJSI() first.',
    );
  }
  return native;
}
