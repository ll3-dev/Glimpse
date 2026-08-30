/**
 * expo-share-intent 페이로드를 통합 캡처 폼 상태 패치로 매핑한다.
 *
 * 의존성 없는 순수 함수: `UnifiedCaptureFormState`를 barrel에서 import하지 않고
 * 동일한 구조의 타입을 인라인으로 정의한다 (컴포넌트 체인을 끌어오지 않기 위함).
 */

export type ShareIntentContent = {
  text?: string | null;
  webUrl?: string | null;
  title?: string | null;
  files?: { path: string }[] | null;
};

/** `UnifiedCaptureFormState`({title, body, imageUri})와 구조적으로 동일한 부분 패치. */
export type CaptureFormPatch = Partial<{
  title: string;
  body: string;
  imageUri: string | null;
}>;

/**
 * webUrl이 있으면 body(링크), 없으면 text. title은 폼 title로.
 * 파일(이미지)이 있으면 첫 번째 경로를 imageUri로 사용.
 * 공백뿐인 값은 빈 패치로 무시한다.
 */
export function shareIntentToFormState(
  shared: ShareIntentContent,
): CaptureFormPatch {
  const patch: CaptureFormPatch = {};

  const body = shared.webUrl?.trim() ? shared.webUrl : shared.text;
  if (body?.trim()) patch.body = body;

  if (shared.title?.trim()) patch.title = shared.title;

  const firstFile = shared.files?.[0];
  if (firstFile?.path) patch.imageUri = firstFile.path;

  return patch;
}
