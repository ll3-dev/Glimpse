---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# Glimpse MVP v1 분할 SPEC 인덱스

## 문제
MVP v1(입력 채널 확장 + 주간 연결 추천 + 반응 수집)은 기능 축이 3개라 한 번에 구현하면 품질 저하와 일정 지연 위험이 큽니다.

## 해결 목표
**현재:** v1 요구사항은 있으나 구현 순서와 최소 단위가 명확하지 않습니다.
**목표:** 10분 내외 작업 단위로 쪼개어 입력 채널 확장, 다이제스트 추천, 반응 수집을 독립적으로 진행합니다.

## 성공 기준
- [ ] v1 범위를 8개 독립 작업 SPEC으로 분해한다.
- [ ] 각 SPEC이 단독 착수/검증 가능한 완료 기준을 가진다.
- [ ] 기존 v0 저장 모델과 충돌 없이 확장 가능하다.

## 범위 제한
- 실시간 추천/푸시 알림은 제외(주 1회 다이제스트만).
- OCR 고도화(정확도 개선, 다국어 모델 튜닝)는 제외.
- 추천 품질 고도화(LLM ranker, 벡터 검색)는 제외.

## 작업 단위 목록 (각 10분 내외)
1. `01-collect-channel-switch.md` - 수집 채널 전환 UI(하이라이트/스크린샷/공유)
2. `02-highlight-capture-form.md` - 하이라이트 입력 폼
3. `03-screenshot-capture-stub.md` - 스크린샷 입력 스텁
4. `04-share-intent-ingest-stub.md` - 공유 시트 유입 스텁
5. `05-weekly-digest-query.md` - 최근 7일 데이터 조회
6. `06-link-recommendation-rule-stub.md` - 연결 추천 규칙 스텁
7. `07-digest-ui-accept-ignore.md` - 주간 다이제스트 UI + 수락/무시 액션
8. `08-feedback-event-logging.md` - 반응 이벤트 저장

## 참고 자료
- 비전/MVP 원문: `../../inputs/glimpse-vision-mvp-roadmap.md`
- 기존 v0 분할: `../mvp0/index.md`
- 기술 기준: `../../../../package.json`
