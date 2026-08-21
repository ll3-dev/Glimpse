# 기여 가이드

## 시작하기

```sh
bun install --frozen-lockfile
bun run start
```

UI를 수정하기 전에 `DESIGN.md`를, Rust와 TypeScript 사이 명령을 수정하기 전에 `apps/mobile/docs/rustra-bridge-development.md`를 읽어주세요.

## 변경 원칙

- 한 변경은 한 목적에 집중합니다.
- 사용자 데이터와 기존 로컬 변경을 보존합니다.
- `src/ui`와 `packages/ui`에는 상태 없는 primitive만 둡니다.
- Rust `#[command]` 변경 뒤 `bun run bridge:generate`를 실행하고 생성물 drift를 확인합니다.
- 새 비밀 값, 인증서, keystore, 서비스 계정 JSON을 커밋하지 않습니다.

## 제출 전 검증

```sh
bun run lint
bun run typecheck
bun run desktop:typecheck
bun run test:coverage
bun run web:export
bun run audit:critical
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

플랫폼 코드 변경은 Android 또는 iOS Release smoke 결과도 PR에 기록해주세요.
