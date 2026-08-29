/** Message of the error thrown when the native discovery module is absent —
 * lets callers distinguish "module missing" from "nothing found". Single
 * source shared by the native and web module entry points. */
export const discoveryUnavailableError =
  '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.';
