# 모바일 스토어 제출

저장소에는 계정 ID, 인증서, keystore, 서비스 계정 JSON을 넣지 않는다. `eas.json`의 production profile은 EAS에 저장된 build/submit credentials를 사용한다.

## 사전 조건

- Expo/EAS 프로젝트 연결과 production channel 생성
- Apple Developer·App Store Connect 앱 `kr.ll3.glimpse`
- Google Play 앱 `kr.ll3.glimpse`와 Play Console API 권한
- privacy/support URL, 스토어 설명, 스크린샷, 연령 등급
- Android production keystore 또는 EAS managed credentials

## 자격증명 등록

```sh
eas login
eas credentials --platform ios
eas credentials --platform android
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

CI나 자동 제출에서는 EAS project secret에 토큰과 제출 credentials를 등록한다. 로컬 `google-service-account.json`은 `.gitignore` 대상이며 저장소에 커밋하지 않는다.

## 배포 전 게이트

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test:coverage
bun run web:export
bun run audit:critical
cd apps/mobile/android && ./gradlew validateProductionSigning
```

그 다음 `eas build --platform all --profile production`을 실행하고 각 스토어의 TestFlight/internal track에서 설치·실행·캡처·채팅·삭제를 확인한다. 실제 제출은 계정 소유자의 승인 후 진행한다.
