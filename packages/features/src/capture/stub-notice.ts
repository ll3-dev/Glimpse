let shownThisSession = false;

/** 세션당 최대 1회 스텁 품질 안내를 표시해야 하는가? */
export function shouldShowStubNoticeOnce(): boolean {
  if (shownThisSession) return false;
  shownThisSession = true;
  return true;
}

/** 테스트용 리셋 */
export function resetStubNoticeForTests(): void {
  shownThisSession = false;
}
