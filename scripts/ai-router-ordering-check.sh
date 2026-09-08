#!/usr/bin/env bash
# chat-generation.test.ts ↔ router.test.ts 순서 회귀 검증 드라이버.
#
# bun test는 여러 파일을 한 프로세스에서 돌리고, mock.module은 프로세스 전역이라
# chat-generation.test.ts가 router를 mock하면 뒤이어 실행되는 router.test.ts까지
# 오염된다(CI js 잡과 동일 조건). 두 파일을 양방향 순서로 각각 실행해 양쪽 다
# 통과하는지 확인한다 — mock.module('./router') 재도입 시 즉시 적색.
set -euo pipefail
cd "$(dirname "$0")/.."

AI=apps/desktop/src/features/ai

echo "[1/2] chat-generation.test.ts → router.test.ts"
bun test "$AI/chat-generation.test.ts" "$AI/router.test.ts"

echo "[2/2] router.test.ts → chat-generation.test.ts"
bun test "$AI/router.test.ts" "$AI/chat-generation.test.ts"

echo "ordering check: both orders green"
