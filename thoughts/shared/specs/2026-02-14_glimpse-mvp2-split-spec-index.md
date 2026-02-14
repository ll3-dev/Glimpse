---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# Glimpse MVP v2 분할 SPEC 인덱스

## 문제
MVP v2(망각곡선, 빈도 자동조절, BYOK/Apple Intelligence)는 기술 난도가 높아 작은 단위로 리스크 분리가 필요합니다.

## 해결 목표
**현재:** v2 요구사항은 방향만 있고 구현 시작점이 불명확합니다.
**목표:** 학습 곡선 추천, 빈도 조절, 모델 옵션을 각각 10분 단위 SPEC으로 분리합니다.

## 성공 기준
- [ ] v2 범위를 8개 독립 SPEC으로 분해한다.
- [ ] 각 SPEC이 v1 출력물(추천 반응 로그)을 입력으로 활용할 수 있다.
- [ ] 고난도 기능은 스텁/플래그 중심으로 점진 적용 가능하다.

## 범위 제한
- 실제 LLM 추론 품질 평가/벤치마크 제외.
- 멀티 디바이스 동기화 전략 제외.
- 유료 결제/플랜 정책 연동 제외.

## 작업 단위 목록 (각 10분 내외)
1. `2026-02-14_mvp2-01-review-state-fields.md` - 복습 상태 필드 확장
2. `2026-02-14_mvp2-02-initial-review-schedule.md` - 최초 복습 스케줄 계산
3. `2026-02-14_mvp2-03-due-items-query.md` - 복습 도래 항목 조회
4. `2026-02-14_mvp2-04-review-queue-ui.md` - 다시 보기 큐 UI
5. `2026-02-14_mvp2-05-interval-adjustment-rule.md` - 반응 기반 간격 조절
6. `2026-02-14_mvp2-06-recommendation-frequency-control.md` - 추천 빈도 자동 조절
7. `2026-02-14_mvp2-07-byok-settings-stub.md` - BYOK 설정 스텁
8. `2026-02-14_mvp2-08-apple-intelligence-toggle-stub.md` - Apple Intelligence 토글 스텁

## 참고 자료
- 비전/MVP 원문: `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- v1 반응 수집: `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp1-08-feedback-event-logging.md`
- 기술 기준: `/Users/loopy/dev/ll3/Glimpse/package.json`
