---
date: 2026-03-28T15:56:09+0900
researcher: loopy
git_commit: a4cb0c766495a5f042e853e052a9b18313f3aa20
branch: main
repository: Glimpse
topic: "iOS/Android 공유하기 미동작 원인과 앱 미진입 직접 저장 가능성 조사"
tags: [research, codebase, mobile, expo-router, expo-share-intent, share]
status: complete
last_updated: 2026-03-28
last_updated_by: loopy
---

# 리서치: iOS/Android 공유하기 미동작 원인과 앱 미진입 직접 저장 가능성 조사

**날짜**: 2026-03-28T15:56:09+0900
**연구자**: loopy
**Git Commit**: `a4cb0c766495a5f042e853e052a9b18313f3aa20`
**Branch**: `main`
**Repository**: Glimpse

## 연구 질문
현재 iOS에서 공유하기가 `unmatched route`와 함께 실패하는 이유를 확인하고, 가능하다면 앱 화면으로 넘기지 않고 바로 저장할 수 있는 구조인지 조사한다. Android 공유도 함께 왜 동작하지 않는지 확인한다.

## 요약
- iOS `unmatched route`의 직접 원인은 공유 익스텐션이 `ll3.kr://dataUrl=...#...` 형태의 딥링크로 앱을 열지만, Expo Router 쪽에 이 시스템 URL을 앱 라우트로 재작성하는 `+native-intent` 또는 대응 라우트가 없기 때문이다.
- Android는 iOS처럼 `unmatched route`로 깨지지는 않아도, 공유 인텐트를 받은 뒤 자동으로 `/capture`로 보내는 로직이 없다. 현재 공유 데이터 소비는 `CaptureScreen` 내부 훅에서만 이루어지므로, 사용자가 이미 `/capture`에 들어와 있지 않으면 공유 결과가 화면에 드러나지 않는다.
- 현재 저장은 메인 앱의 JS + 모바일 코어 경로에서만 실행된다. 공유 익스텐션은 App Group `UserDefaults`에 payload를 적재한 뒤 앱을 여는 역할만 한다. 따라서 "앱까지 안 열고 바로 저장"은 현재 구조에서는 작은 수정이 아니라 저장소 위치/저장 책임 이동이 필요한 별도 작업이다.
- 현재 구조는 오히려 과거 SPEC의 범위 제한과 일치한다. 공유 유입은 "기본 저장 폼으로 연결"까지만 의도되었고, "백그라운드 무인 저장"은 명시적으로 제외되어 있다.

## 상세 분석

### 1. iOS에서 `unmatched route`가 뜨는 이유
- iOS 공유 익스텐션은 메인 앱을 열 때 아래 URL을 사용한다.
  - [apps/mobile/ios/ShareExtension/ShareViewController.swift:480](/Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/ShareExtension/ShareViewController.swift#L480)
  - 실제 생성 URL: `ll3.kr://dataUrl=ll3.krShareKey#<type>`
- 이 URL 포맷은 `expo-share-intent` 라이브러리 기본 동작과 동일하다.
  - [node_modules/.bun/expo-share-intent@6.0.0+45f613811e29dc86/node_modules/expo-share-intent/build/useShareIntent.js:38](/Users/loopy/dev/ll3/Glimpse/node_modules/.bun/expo-share-intent@6.0.0+45f613811e29dc86/node_modules/expo-share-intent/build/useShareIntent.js#L38)
  - 라이브러리는 iOS에서 `scheme://dataUrl=` 패턴의 URL이 들어오면 native module을 호출해 공유 데이터를 읽는다.
- 앱에는 `ShareIntentProvider`가 루트 레이아웃에 설치되어 있어서 데이터 수신 자체를 위한 준비는 되어 있다.
  - [apps/mobile/app/_layout.tsx:74](/Users/loopy/dev/ll3/Glimpse/apps/mobile/app/_layout.tsx#L74)
- 하지만 Expo Router에는 이 시스템 URL을 실제 앱 경로로 바꿔주는 `app/+native-intent.tsx`가 없다. 현재 등록된 화면은 `(tabs)`, `capture`, `library/[id]`뿐이다.
  - [apps/mobile/app/_layout.tsx:78](/Users/loopy/dev/ll3/Glimpse/apps/mobile/app/_layout.tsx#L78)
- 즉 iOS는 "공유 데이터는 읽을 수 있는 URL"을 받지만, Router 입장에서는 존재하지 않는 경로로 먼저 해석되어 `Unmatched Route`가 노출된다.
- Expo Router 타입 정의도 `+native-intent`가 바로 이런 네이티브 시스템 URL 재작성용이라고 설명한다.
  - `node_modules/.bun/expo-router@55.0.4+07b3da6887533c28/node_modules/expo-router/build/types.d.ts`

### 2. Android도 안 보이는 이유
- Android 매니페스트에는 `SEND` 인텐트 필터와 앱 스킴이 이미 등록되어 있다.
  - [apps/mobile/android/app/src/main/AndroidManifest.xml:19](/Users/loopy/dev/ll3/Glimpse/apps/mobile/android/app/src/main/AndroidManifest.xml#L19)
  - [apps/mobile/app.json:8](/Users/loopy/dev/ll3/Glimpse/apps/mobile/app.json#L8)
- `expo-share-intent`는 Android에서 iOS와 달리 빈 문자열로 native module을 읽어오도록 설계되어 있어서, iOS처럼 라우트 매핑이 필수는 아니다.
  - [node_modules/.bun/expo-share-intent@6.0.0+45f613811e29dc86/node_modules/expo-share-intent/build/useShareIntent.js:40](/Users/loopy/dev/ll3/Glimpse/node_modules/.bun/expo-share-intent@6.0.0+45f613811e29dc86/node_modules/expo-share-intent/build/useShareIntent.js#L40)
- 그런데 현재 코드베이스에서 `useShareIntentContext()`를 실제로 소비하는 곳은 `useCaptureFormState()` 하나뿐이다.
  - [apps/mobile/src/hooks/useCaptureFormState.ts:11](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/hooks/useCaptureFormState.ts#L11)
- 그리고 이 훅은 `CaptureScreen`에서만 사용된다.
  - [apps/mobile/app/capture.tsx:14](/Users/loopy/dev/ll3/Glimpse/apps/mobile/app/capture.tsx#L14)
- 루트 레이아웃이나 탭 진입점 어디에도 "공유 인텐트가 있으면 `/capture`로 이동"하는 로직이 없다.
- 그래서 Android에서는 공유 데이터가 메모리상 Provider에 들어와도, 사용자가 `/capture`로 자동 이동하지 않으면 아무 일도 안 일어난 것처럼 보일 가능성이 높다.

### 3. 현재 저장 책임은 메인 앱에만 있다
- 저장은 `CaptureScreen`의 저장 버튼에서 `useSaveKnowledgeItemMutation()`을 호출할 때만 실행된다.
  - [apps/mobile/app/capture.tsx:21](/Users/loopy/dev/ll3/Glimpse/apps/mobile/app/capture.tsx#L21)
  - [apps/mobile/src/hooks/mutations/useCaptureActions.ts:22](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/hooks/mutations/useCaptureActions.ts#L22)
- 실제 저장은 모바일 코어 클라이언트를 통해 수행된다.
  - [apps/mobile/src/features/core/application/capture/index.ts:238](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/application/capture/index.ts#L238)
  - [apps/mobile/src/features/core/mobile-core-client.ts:15](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/mobile-core-client.ts#L15)
- 이 코어 DB는 메인 앱의 `DocumentDir/glimpse/glimpse.sqlite`에 초기화된다.
  - [apps/mobile/src/features/core/initialize-core-client.native.ts:4](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/initialize-core-client.native.ts#L4)
- 반면 공유 익스텐션은 DB에 직접 쓰지 않고 App Group `UserDefaults`와 공유 컨테이너 파일만 사용한다.
  - [apps/mobile/ios/ShareExtension/ShareViewController.swift:107](/Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/ShareExtension/ShareViewController.swift#L107)
  - [apps/mobile/ios/ShareExtension/ShareViewController.swift:288](/Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/ShareExtension/ShareViewController.swift#L288)
- 즉 현재 구조는 "공유 익스텐션 = payload 전달", "메인 앱 = 저장"으로 완전히 분리되어 있다.

### 4. "앱까지 안넘어가고 바로 저장" 가능성
- 현재 구조 그대로는 어렵다.
- 이유는 다음과 같다.
  - 공유 익스텐션에는 JS 번들/React 화면/저장 usecase가 없다.
  - 실제 영속 저장소는 메인 앱 sandbox `DocumentDir`에 있고 App Group 저장소가 아니다.
  - 메타데이터 생성, review schedule 초기화, 코어 save 호출이 모두 메인 앱 측 의존성에 묶여 있다.
- 가능하게 하려면 최소한 아래 둘 중 하나가 필요하다.
  - 저장 DB를 App Group 공유 위치로 옮기고, 익스텐션에서도 같은 Rust/Native 저장 코드를 호출한다.
  - 익스텐션은 초경량 payload만 저장하고, 메인 앱이 포그라운드 진입 직후 자동 저장을 수행하도록 바꾼다.
- 두 번째 방식이 훨씬 현실적이다. 엄밀히는 "앱을 전혀 열지 않고 저장"은 아니지만, 사용자가 저장 폼을 보지 않고 거의 즉시 저장되게 만들 수 있다.

### 5. 원래 의도와의 차이
- 기존 SPEC은 공유 유입을 "기본 저장 폼으로 연결"하는 범위로 정의했다.
  - [thoughts/shared/specs/mvp1/04-share-intent-ingest-stub.md:14](/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/mvp1/04-share-intent-ingest-stub.md#L14)
- 같은 문서에서 "백그라운드 무인 저장 제외"를 명시했다.
  - [thoughts/shared/specs/mvp1/04-share-intent-ingest-stub.md:23](/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/mvp1/04-share-intent-ingest-stub.md#L23)
- 그래서 지금 요구사항은 원래 MVP 스코프보다 한 단계 더 나간다. 특히 "앱 미진입 직접 저장"은 별도 SPEC/작업 단위로 분리하는 편이 맞다.

## 코드 참조
- `apps/mobile/ios/ShareExtension/ShareViewController.swift:480` - iOS 공유 익스텐션이 메인 앱을 여는 딥링크 생성
- `apps/mobile/app/_layout.tsx:74` - ShareIntentProvider 설치
- `apps/mobile/app/_layout.tsx:84` - 현재 등록된 stack 화면 목록
- `apps/mobile/app/capture.tsx:14` - 공유 폼/저장 UI가 있는 유일한 화면
- `apps/mobile/src/hooks/useCaptureFormState.ts:23` - 공유 인텐트를 실제 폼 상태에 적용하는 위치
- `apps/mobile/src/features/core/initialize-core-client.native.ts:4` - 메인 앱 로컬 DB 경로
- `apps/mobile/android/app/src/main/AndroidManifest.xml:24` - Android 딥링크/공유 인텐트 필터

## 아키텍처 인사이트
- 공유 기능은 이미 `expo-share-intent`를 사용하도록 맞춰져 있지만, "수신"과 "이동"이 분리되어 있다.
- 현재 구현은 `Provider는 루트`, `데이터 소비는 capture 화면` 구조다. 이 구조에서는 공유 이벤트 발생 시 화면 전환이 자동으로 따라와야 UX가 완성된다.
- iOS는 Router deep link 재작성 계층이 빠져 있고, Android는 navigation orchestration 계층이 빠져 있다.
- 저장 책임은 모바일 코어에 묶여 있으므로, 공유 익스텐션 직접 저장은 단순 UI 수정이 아니라 persistence architecture 변경이다.

## 히스토리 컨텍스트 (thoughts/ 디렉토리)
- `thoughts/shared/specs/mvp1/04-share-intent-ingest-stub.md` - 공유 시트 유입은 원래 "기본 저장 폼 연결" 스텁으로 정의되었고 무인 저장은 범위 밖이었다.
- `thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md` - 공유가 주요 유입 채널 중 하나로 언급된다.
- `thoughts/shared/research/2026-03-25_packages-core-rust-integration.md` - 저장 책임이 모바일 코어/Rust 쪽으로 이동한 최근 맥락이 있어, 익스텐션 직접 저장 난이도가 더 올라갔다.

## 관련 리서치
- `thoughts/shared/research/2026-03-25_packages-core-rust-integration.md`

## 추천 대응
1. 우선순위가 `second`라면, 가장 작은 수정은 `app/+native-intent.tsx`를 추가해 iOS `ll3.kr://dataUrl=...`를 안전한 앱 경로(`/capture`)로 재작성하는 것이다.
2. 동시에 루트 레이아웃 또는 별도 orchestration 훅에서 `hasShareIntent === true`일 때 `/capture`로 자동 이동시키면 Android도 실제로 동작하는 흐름이 된다.
3. 저장 폼을 생략하고 싶다면 2단계로, 앱 진입 직후 특정 share payload는 자동 저장 후 토스트/알럿만 보여주는 "auto-save after open" 흐름을 검토할 수 있다.
4. "앱 미진입 직접 저장"은 별도 SPEC으로 분리하는 편이 맞다. DB를 App Group 위치로 옮길지, 익스텐션 전용 저장 파이프라인을 둘지 먼저 결정해야 한다.

## 미해결 질문
- 공유 payload가 들어왔을 때 모든 타입(텍스트/URL/이미지)을 자동 저장 대상으로 볼지, 텍스트+URL만 자동 저장할지 정책이 필요하다.
- iOS에서 `+native-intent`만으로 충분한지, 아니면 특정 초기 경로(`/capture`) 강제 진입 정책이 필요한지 실제 디바이스 검증이 필요하다.
- Android 매니페스트의 중복 `SEND` 필터 3개는 의도된 것인지 확인이 필요하다. 이번 문제의 핵심 원인은 아니지만 정리 대상이다.
