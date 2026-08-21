# JavaScript 의존성 감사 기준

- 기준일: 2026-08-21
- 도구: Bun 1.3.6 `bun audit`
- CI 차단 기준: critical 이상 0개
- 재검토 기한: 2026-09-21
- 담당: Glimpse maintainers

직접 의존성 `effect`와 `vite`를 보안 수정 버전으로 갱신했고, 호환 가능한 전이 패키지는 root override로 고정했다. 그 결과 critical advisory는 2개에서 0개로 감소했다.

현재 full audit에 남은 패키지는 `@babel/core`, `ajv`, `body-parser`, `brace-expansion`, `esbuild`, `image-size`, `js-yaml`, `minimatch`, `nanoid`, `picomatch`, `postcss`, `uuid`, `ws`다. 이들은 Expo/React Native/Tauri 개발 도구가 끌어오는 복수 major 전이 의존성이거나 아직 수정 릴리스가 없는 항목을 포함한다. 전역 major override는 빌드 호환성을 깨뜨릴 수 있어 승인하지 않았다.

매월 다음을 수행한다.

1. `bun audit --json`으로 전체 목록과 유입 경로를 다시 확인한다.
2. Expo SDK와 React Native의 호환 업데이트를 우선 적용한다.
3. 수정 버전이 같은 major에 나오면 잠금파일을 갱신하고 전체 Release 게이트를 실행한다.
4. runtime 경로에 도달하거나 critical로 상향된 항목은 예외 없이 즉시 차단한다.
