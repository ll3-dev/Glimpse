# Effect Style Guide

## 1. 목적
- 프로젝트의 비동기 로직, 에러 처리, 결과 타입을 `Effect` 중심으로 일관화한다.
- `try/catch` 남발을 줄이고, 실패 경로를 타입으로 명확히 표현한다.
- UI 레이어와 도메인 레이어의 책임을 분리한다.

## 2. 기본 원칙
- 비동기 작업은 `Effect` 안에서 조합한다.
- 실패는 `throw` 대신 `Effect.fail(AppError)`로 표현한다.
- 도메인 유스케이스는 `Promise<Result<T>>` 또는 `Promise<{ success: true ... } | { success: false ... }>` 형태를 유지한다.
- `unknown`은 경계에서만 받고, 내부에서는 `AppError`로 정규화한다.
- 순수 연산(문자열 가공, 계산)은 `Effect`로 감싸지 않는다.

## 3. 표준 타입
- 공통 타입 파일: `src/lib/effect-result.ts`
- 표준 코드:
  - `AppErrorCode`: `VALIDATION_ERROR | DATABASE_ERROR | NOT_FOUND | GENERATION_ERROR | UNKNOWN_ERROR`
  - `AppError`: `{ _tag, code, message, details? }`
  - `Result<T>`: `{ success: true; data: T } | { success: false; error: AppError }`
- 표준 헬퍼:
  - `appError(...)`
  - `isFailure(...)`
  - `tryPromise(...)`
  - `runEffectResult(...)`
  - `runEffectSuccess(...)`

## 4. 레이어별 규칙

### 4.1 Domain (`src/features/*`)
- 외부 의존(DB, API, 파일 I/O)은 `tryPromise`로 감싼다.
- 실패는 가능한 한 도메인 의미가 있는 `AppErrorCode`를 사용한다.
- 도메인 함수는 내부 구현은 `Effect`, 외부 인터페이스는 `Promise`를 유지한다.
- `if (result.success === false)` 형태를 사용한다.

### 4.2 UI (`app/*`, `src/components/*`)
- 이벤트 핸들러(`onPress`, `onRefresh` 등)는 `Effect.runPromise(...)`로 실행한다.
- UI 상태 변경(`setState`)은 `Effect.sync(...)` 또는 `Effect.ensuring(...)`에서 처리한다.
- 실패 로깅/알림은 `Effect.catchAll(...)`에서 한 곳에 모아 처리한다.
- 비즈니스 규칙 계산은 UI에 두지 않고 feature 함수로 위임한다.

### 4.3 Adapter (`src/db/*`, 플랫폼 브릿지)
- SQL 실행, 네이티브 브릿지 호출 등 경계 코드는 `Effect.promise(...)` 또는 `tryPromise(...)` 사용.
- 여러 단계를 순차로 처리할 때 `Effect.gen(...)` 사용.
- 초기화/정리 로직은 `Effect.ensuring(...)` 또는 `Effect.tapError(...)`로 명시한다.

## 5. 표준 패턴

### 5.1 Use case 패턴
```ts
const program = Effect.gen(function* () {
  const rows = yield* tryPromise(
    () => deps.db.select().from(...),
    (error) => appError('DATABASE_ERROR', 'Failed to load rows', error)
  );

  if (rows.length === 0) {
    return yield* Effect.fail(appError('NOT_FOUND', 'No rows'));
  }

  return rows;
});

return runEffectResult(program);
```

### 5.2 UI 핸들러 패턴
```ts
await Effect.runPromise(
  Effect.gen(function* () {
    const result = yield* tryPromise(
      () => loadSomething(),
      (error) => appError('UNKNOWN_ERROR', 'Load failed', error)
    );
    if (result.success === false) {
      logger.error('Load failed', result.error);
      return;
    }
    setData(result.data);
  }).pipe(
    Effect.catchAll((error) => Effect.sync(() => logger.error('Unexpected', error))),
    Effect.ensuring(Effect.sync(() => setLoading(false)))
  )
);
```

### 5.3 Validation 패턴
- 단순 입력 검증은 기존처럼 순수 함수로 유지한다.
- `new URL(...)`처럼 예외 가능성이 있는 검증은 `Effect.try(...)/Effect.match(...)`로 감싼 helper를 만든다.

## 6. 금지/권장 규칙
- 금지:
  - 새로운 프로덕션 코드에서 `try/catch` 직접 사용
  - `throw new Error(...)`로 도메인 실패 전달
  - `any`로 실패 타입 우회
  - 에러 메시지를 문자열만 던지고 코드 없이 처리
- 권장:
  - `AppErrorCode` 재사용
  - 실패 로깅 시 `code`, `message`, `details` 함께 남기기
  - 실패를 삼키는 경우(대체값 반환)는 주석으로 의도 명시

## 7. 에러 코드 선택 규칙
- `VALIDATION_ERROR`: 사용자 입력/도메인 제약 위반
- `DATABASE_ERROR`: DB 쿼리/트랜잭션/어댑터 실패
- `NOT_FOUND`: 조회 결과 없음이 도메인 실패인 경우
- `GENERATION_ERROR`: 추천/요약 등 생성 파이프라인 실패
- `UNKNOWN_ERROR`: 위 분류 불가 또는 예외적 상황

## 8. 테스트 규칙
- 성공/실패 케이스를 모두 테스트한다.
- 실패 assertion은 `code` 기준으로 우선 검증한다.
- `Effect`로 감싼 reject 값은 FiberFailure 래핑 가능성이 있으므로 문자열 비교보다 구조/코드 검증을 우선한다.
- 목 함수는 `Effect` 경로에서 `Promise`를 반환하도록 설정한다.

## 9. 코드 리뷰 체크리스트
- 신규 비동기 로직이 `Effect`로 작성됐는가
- 실패 경로가 `AppError`로 정규화됐는가
- `if (result.success === false)` 형태를 사용했는가
- UI에서 `finally` 성격 정리는 `Effect.ensuring`으로 처리했는가
- 테스트에 성공/실패 경로가 모두 있는가

## 10. 운영 규칙
- 최소 검증 명령:
  - `bunx tsc --noEmit`
  - `bun run lint`
  - `bun test`
  - `bun run web` 또는 대상 플랫폼 스모크 체크
- 새 기능 추가 시:
  - 먼저 도메인 유스케이스를 `Effect`로 작성
  - 화면은 유스케이스 결과만 소비
  - 공통 에러 코드가 부족하면 `AppErrorCode`를 확장
