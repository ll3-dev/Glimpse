# 라운드 3 구현 계획 — OCR 완성 + CI + rustra 흡수 + 문서 정합

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 마지막 스텁 기능인 스크린샷 OCR을 네이티브로 완성하고, CI 게이트를 자동화하며, rustra 0.2.0을 흡수하고 문서를 코드에 정합한다.

**Architecture:** 4단계 순차 진행 (CI → rustra → OCR → 문서). CI는 기존 package.json 게이트 스크립트의 thin wrapper. rustra 흡수는 버전 핀+재빌드가 중심이며 코드 변경 최소. OCR은 `apps/mobile/modules/ocr` 로컬 expo 모듈(iOS Vision / Android ML Kit)로 활성 캡처 경로(`UnifiedCaptureForm`)에 연결한다.

**Tech Stack:** GitHub Actions, Bun, Cargo, Expo Modules (Swift/Kotlin), Vision framework (`VNRecognizeTextRequest`), ML Kit text-recognition (bundled, latin+korean).

**디자인 문서:** `docs/plans/2026-08-19-round3-ocr-ci-rustra-design.md`

**중요 컨텍스트 (조사로 확인된 사실):**
- 활성 캡처 경로: `app/capture.tsx` → `UnifiedCaptureForm.tsx`. 이미지 선택 시 `onChangeImageUri(uri)`만 호출되고 body는 저장 시 `'스크린샷 기록'` 하드코딩 (`capture.tsx:52`)
- `ScreenshotForm.tsx`/`CaptureChannelForm.tsx`/`useCaptureFormState`는 export만 되고 어떤 화면도 렌더링하지 않음 (dead path) — OCR은 이것들을 부활시키지 않고 **활성 경로에 연결**한다
- `ScreenshotInput.body`가 "extracted text" 용도로 존재 (`features/core/application/capture/index.ts:44`)
- 감사 문서가 말한 "OCR 1초 딜레이 스텁"은 라운드 2에서 ScreenshotStub 삭제로 이미 제거됨 — 현재는 OCR 시도 자체가 없음
- rustra 상류: main이 0.1.2 태그보다 61커밋 앞섬, minor changeset 준비됨 (0.2.0 컷 대기 상태)
- Cargo workspace: 루트 `Cargo.toml`에 3멤버 (desktop/src-tauri, bridge-rust, core-rust)
- 게이트 스크립트: 루트 package.json 참조 (lint/typecheck/desktop:typecheck/test/desktop:rust:check/bridge:generate)

---

## Task 1: CI 워크플로 작성

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: 워크플로 작성**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  js:
    name: JS (lint / typecheck / test)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
            apps/*/node_modules
            packages/*/node_modules
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run desktop:typecheck
      - run: bun test
  rust:
    name: Rust (test / clippy / check)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --workspace
      - run: cargo clippy --workspace --all-targets -- -D warnings
      - run: cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

주의: 루트 `test` 스크립트는 `bun run --cwd apps/mobile test`(mobile만)다. desktop/bridge 테스트가 bun test로 잡히는지 확인 필요 — Step 2에서 검증한다.

**Step 2: 로컬에서 잡 명령 재현 검증**

Run: `bun install && bun run lint && bun run typecheck && bun run desktop:typecheck && bun test && cargo test --workspace && cargo clippy --workspace --all-targets -- -D warnings && cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
Expected: 전부 통과 (안정화 라운드 2 게이트와 동일 수준). 실패 시 워크플로가 아니라 게이트 스크립트를 먼저 고친다.

**Step 3: 커밋 & 푸시**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions 게이트 파이프라인 추가 — JS/Rust 잡"
```

푸시는 사용자 확인 후 (미푸시 커밋 다수 대기 상태이므로).

---

## Task 2: rustra 0.2.0 흡수

**전제:** rustra 레포에서 0.2.0 릴리스 완료 (`gh api repos/loopy-lim/rustra/tags`로 `@rustra/types@0.2.0` 태그 확인). 아직이면 사용자에게 릴리스 컷 확인 요청 — 이 태스크는 건너뛰고 Task 3으로 (디자인의 순서 교체 조항).

**Files:**
- Modify: `package.json` (overrides `@rustra/types`, `@rustra/react-native`)
- Modify: `apps/mobile/package.json`, `apps/desktop/package.json` (rustra 의존성)
- Modify: `packages/bridge-rust/package.json`, `packages/bridge-rust/Cargo.toml` (`rustra = "=0.2.0"`)
- Regenerate: `packages/bridge-rust/generated/` (`bun run bridge:generate`)

**Step 1: npm 측 범프**

루트 `package.json` overrides의 `@rustra/types`와 (있으면) `@rustra/react-native`를 `0.2.0`으로. 각 앱/패키지 package.json의 `@rustra/*` 의존성도 `0.2.0`으로.

```bash
bun install
```

**Step 2: Cargo 핀 범프**

`packages/bridge-rust/Cargo.toml`의 `rustra = "=0.1.2"` → `"=0.2.0"`.

```bash
cargo update -p rustra
```

**Step 3: 코드젠 재실행**

```bash
bun run bridge:generate
```

Expected: generated/가 갱신되거나 무변화. 스키마 변화가 있으면 diff 확인 (JSDoc·unit 타입 정리가 반영될 수 있음).

**Step 4: 게이트 재통과**

Run: Task 1 Step 2와 동일한 전체 게이트.
Expected: 전부 통과. rustra 0.2.0의 breaking change가 있으면 이 시점에 발견됨 — 변경분은 스키마 doc 주석·엔진 옵션 전달 등이 중심이므로 Glimpse 측 코드 영향은 제한적일 것.

**Step 5: 네이티브 재빌드**

```bash
bun run --cwd apps/mobile build:bridge:ios
bun run --cwd apps/mobile build:bridge:android
```

Expected: 프리빌트 .a 재생성. (iOS 전체 앱 빌드는 ShareExtension 선재결함으로 별개 — 여기선 .a만)

**Step 6: 취소 API 계약 검토 (문서만)**

`invokeTypedAsync` id 노출·invokeBatch 항목별 취소·AbortSignal 전파가 기존 `cancel_download` 플래그와 어떻게 정합되는지 조사해 `thoughts/shared/research/`에 짧은 메모로 남긴다. **재연결 구현은 하지 않는다** (라운드 4 후보).

**Step 7: 커밋**

```bash
git add -A
git commit -m "chore(bridge): rustra 0.2.0 흡수 — JSI fast path·취소·payload 한도 상류 개선 반영"
```

---

## Task 3: OCR 모듈 스캐폴딩 (`modules/ocr`)

rustra-jsi는 수동 JSI 모듈이지만 OCR은 정석 expo-module 구조를 따른다.

**Files:**
- Create: `apps/mobile/modules/ocr/package.json`
- Create: `apps/mobile/modules/ocr/expo-module.config.json`
- Create: `apps/mobile/modules/ocr/src/index.ts`
- Create: `apps/mobile/modules/ocr/src/index.web.ts`
- Test: `apps/mobile/src/features/capture/ocr/ocr-service.test.ts`

**Step 1: 패키지 파일 작성**

`package.json`:

```json
{
  "name": "glimpse-ocr",
  "version": "1.0.0",
  "description": "On-device OCR for Glimpse mobile (iOS Vision / Android ML Kit)",
  "main": "src/index.ts",
  "license": "UNLICENSED",
  "private": true,
  "react-native": "src/index.ts"
}
```

`expo-module.config.json`:

```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["OcrModule"]
  },
  "android": {
    "modules": ["dev.ll3.glimpse.ocr.OcrModule"]
  }
}
```

`src/index.ts` (네이티브 구현 전까지 임시 폴백 포함):

```typescript
export type OcrResult = {
  text: string;
  confidence: number;
  language: string;
};

export type OcrError = {
  code: 'UNSUPPORTED' | 'FAILED' | 'NO_TEXT';
  message: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __glimpseOcr: {
    recognizeText(imageUri: string): Promise<OcrResult>;
  } | undefined;
}

export function isOcrAvailable(): boolean {
  return typeof global.__glimpseOcr !== 'undefined';
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  if (!global.__glimpseOcr) {
    throw { code: 'UNSUPPORTED', message: 'OCR is not available on this platform' } satisfies OcrError;
  }
  return global.__glimpseOcr.recognizeText(imageUri);
}
```

`src/index.web.ts`:

```typescript
export { isOcrAvailable } from './index';

export async function recognizeText(): Promise<never> {
  throw {
    code: 'UNSUPPORTED',
    message: 'OCR은 모바일 앱에서만 지원됩니다',
  };
}
```

**Step 2: 모바일 app 설정에 모듈 등록**

`apps/mobile/app.json`의 expo.experimental 또는 `package.json` — rustra-jsi 등록 방식 확인 후 동일하게 `modules/ocr` 추가. (Expo autolinking이 `modules/` 디렉터리를 기본 스캔하므로 usually 무설정. 확인 후 불필요하면 스킵.)

**Step 3: 서비스 레이어 + 실패 테스트 작성**

`apps/mobile/src/features/capture/ocr/ocr-service.ts`:

```typescript
import {
  isOcrAvailable,
  recognizeText,
  type OcrError,
} from '../../../../modules/ocr/src/index';

export type OcrOutcome =
  | { status: 'ok'; text: string; confidence: number; language: string }
  | { status: 'no_text' }
  | { status: 'error'; message: string };

const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Runs on-device OCR over the picked screenshot. Never throws — returns a
 * discriminated outcome so the form can degrade gracefully.
 */
export async function runOcr(imageUri: string): Promise<OcrOutcome> {
  if (!isOcrAvailable()) {
    return { status: 'error', message: '이 기기에서는 OCR을 사용할 수 없습니다' };
  }
  try {
    const result = await recognizeText(imageUri);
    if (result.confidence < CONFIDENCE_THRESHOLD || result.text.trim() === '') {
      return { status: 'no_text' };
    }
    return {
      status: 'ok',
      text: result.text,
      confidence: result.confidence,
      language: result.language,
    };
  } catch (error) {
    const ocrError = error as Partial<OcrError>;
    return { status: 'error', message: ocrError.message ?? 'OCR 처리에 실패했습니다' };
  }
}
```

`ocr-service.test.ts` (bun test — globalThis 스터브로 순수 로직 검증):

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { runOcr } from './ocr-service';

const original = (globalThis as Record<string, unknown>).__glimpseOcr;

describe('runOcr', () => {
  afterEach(() => {
    (globalThis as Record<string, unknown>).__glimpseOcr = original;
  });

  test('returns error outcome when OCR module is unavailable', async () => {
    delete (globalThis as Record<string, unknown>).__glimpseOcr;
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('error');
  });

  test('returns ok with extracted text on success', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => ({
        text: '인식된 텍스트',
        confidence: 0.9,
        language: 'ko',
      }),
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') expect(outcome.text).toBe('인식된 텍스트');
  });

  test('returns no_text when confidence is below threshold', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => ({ text: '흐릿한 텍스트', confidence: 0.2, language: 'ko' }),
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('no_text');
  });

  test('returns error outcome when native call rejects', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => {
        throw { code: 'FAILED', message: 'engine error' };
      },
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('error');
  });
});
```

**Step 4: 테스트 실행**

Run: `cd apps/mobile && bun test src/features/capture/ocr/ocr-service.test.ts`
Expected: 4 pass. 모듈 임포트 경로 문제 시 `modules/ocr`을 tsconfig include에 넣는지 확인.

**Step 5: 커밋**

```bash
git add apps/mobile/modules/ocr apps/mobile/src/features/capture/ocr
git commit -m "feat(mobile): OCR 모듈 스캐폴딩 — 서비스 레이어와 폴백 계약 (TDD)"
```

---

## Task 4: iOS 네이티브 구현 (Vision)

**Files:**
- Create: `apps/mobile/modules/ocr/ios/OcrModule.swift`
- Create: `apps/mobile/modules/ocr/ios/OcrModule.podspec` (expo-module 정석: `podspec_name` 참조)

**Step 1: Swift 모듈 작성**

```swift
import ExpoModulesCore
import Vision
import UIKit

public class OcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Ocr")

    AsyncFunction("recognizeText") { (imageUri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        Self.recognize(uri: imageUri, promise: promise)
      }
    }
  }

  private static func recognize(uri: String, promise: Promise) {
    let cleaned = uri.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: cleaned),
          let cgImage = image.cgImage else {
      promise.reject("FAILED", "이미지를 불러올 수 없습니다")
      return
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ko-KR", "en-US"]
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
      try handler.perform([request])
      let observations = request.results ?? []
      let candidates = observations.compactMap { $0.topCandidates(1).first }
      let text = candidates.map(\.string).joined(separator: "\n")
      let confidence = candidates.isEmpty
        ? 0.0
        : candidates.map(\.confidence).reduce(0, +) / Double(candidates.count)

      promise.resolve([
        "text": text,
        "confidence": confidence,
        "language": candidates.first?.language ?? "unknown",
      ])
    } catch {
      promise.reject("FAILED", error.localizedDescription)
    }
  }
}
```

**Step 2: podspec 작성**

```ruby
require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OcrModule'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license']
  s.platforms = { ios: '15.1' }
  s.source = { path: __dir__ }
  s.source_files = '**/*.swift'
  s.dependency 'ExpoModulesCore'
end
```

**Step 3: 빌드 검증**

Run: `cd apps/mobile && bun run ios:core` (또는 최소 `xcodebuild -workspace ios/Glimpse.xcworkspace -scheme Glimpse -sdk iphonesimulator build | tail -5`)
Expected: OcrModule 컴파일 성공. JS 인터페이스가 expo-modules-core `requireNativeModule`을 쓰지 않고 global을 쓴 것과의 정합 — Task 4는 네이티브를 expo `Module`으로 만들지만 JS 노출은 Task 6에서 `requireOptionalNativeModule`로 연결한다. **주의**: 빌드 실패가 ShareExtension 선재결함이면 그 오류는 무시 기준 (별개 이슈).

**Step 4: 커밋**

```bash
git add apps/mobile/modules/ocr/ios
git commit -m "feat(mobile): iOS Vision OCR — VNRecognizeTextRequest ko-KR/en-US accurate"
```

---

## Task 5: Android 네이티브 구현 (ML Kit)

**Files:**
- Create: `apps/mobile/modules/ocr/android/build.gradle`
- Create: `apps/mobile/modules/ocr/android/src/main/java/dev/ll3/glimpse/ocr/OcrModule.kt`

**Step 1: build.gradle 작성**

```groovy
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
apply plugin: 'maven-publish'

group = 'dev.ll3.glimpse.ocr'
version = '1.0.0'

def expoModulesCorePlugin = new File(project(":expo-modules-core").projectDir.absolutePath, "ExpoModulesCorePlugin.gradle")
apply from: expoModulesCorePlugin
applyKotlinExpoModulesCorePlugin()
useCoreDependencies()
useExpoPublishing()

def expoDebugKeystore = new File(project(":app").projectDir.absolutePath, "debug.keystore")

android {
  namespace "dev.ll3.glimpse.ocr"
  compileSdkVersion safeExtGet("compileSdkVersion", 36)

  defaultConfig {
    minSdkVersion safeExtGet("minSdkVersion", 24)
    targetSdkVersion safeExtGet("targetSdkVersion", 36)
  }

  publishing {
    singleVariant("release") {
      withSourcesJar()
    }
  }

  lintOptions {
    abortOnError false
  }
}

dependencies {
  implementation "com.google.mlkit:text-recognition:16.0.1"
  implementation "com.google.mlkit:text-recognition-korean:16.0.1"
}
```

**Step 2: Kotlin 모듈 작성**

```kotlin
package dev.ll3.glimpse.ocr

import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

class OcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Ocr")

    AsyncFunction("recognizeText") { imageUri: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("FAILED", "Context를 가져올 수 없습니다")
        return@AsyncFunction
      }
      try {
        val inputImage = InputImage.fromFilePath(context, Uri.parse(imageUri))
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        recognizer.process(inputImage)
          .addOnSuccessListener { visionText ->
            val text = visionText.textBlocks.joinToString("\n") { it.text }
            promise.resolve(
              mapOf(
                "text" to text,
                "confidence" to 1.0, // ML Kit은 블록별 confidence 미제공 — 텍스트 있으면 신뢰로 간주
                "language" to (visionText.textBlocks.firstOrNull()?.recognizedLanguage ?: "unknown"),
              )
            )
          }
          .addOnFailureListener { e ->
            promise.reject("FAILED", e.message ?: "OCR 실패")
          }
      } catch (e: Exception) {
        promise.reject("FAILED", e.message ?: "이미지를 불러올 수 없습니다")
      }
    }
  }
}
```

**Step 3: 그래들 동기 및 빌드 검증**

Run: `cd apps/mobile/android && ./gradlew :glimpse-ocr:compileReleaseKotlin` (모듈명은 settings.gradle autolinking 결과에 따름)
Expected: BUILD SUCCESSFUL. autolinking이 모듈을 못 찾으면 `npx expo prebuild` 후 재시도.

**Step 4: 커밋**

```bash
git add apps/mobile/modules/ocr/android
git commit -m "feat(mobile): Android ML Kit OCR — 한국어 번들 인식기"
```

---

## Task 6: 활성 캡처 경로에 OCR 연결

**Files:**
- Modify: `apps/mobile/src/components/capture/UnifiedCaptureForm.tsx` (~213줄)
- Modify: `apps/mobile/app/capture.tsx` (하드코딩 body 제거)

**Step 1: UnifiedCaptureForm에 OCR 호출 추가**

`handlePickImage`의 성공 분기(`onChangeImageUri(result.assets[0].uri)`) 뒤에 OCR 상태 표시와 추출 로직 연결. 컴포넌트 로직 분리를 위해 `useOcrExtraction` 훅 생성 권장 (`src/hooks/useOcrExtraction.ts`) — 폼 컴포넌트 213줄이라 복잡도 임계 근접.

`useOcrExtraction.ts`:

```typescript
import { useState } from 'react';
import { runOcr } from '@/src/features/capture/ocr/ocr-service';
import { logger } from '@/src/utils/logger';

export type OcrState = 'idle' | 'running' | 'done' | 'no_text' | 'error';

export function useOcrExtraction() {
  const [ocrState, setOcrState] = useState<OcrState>('idle');

  const extract = async (imageUri: string): Promise<string | null> => {
    setOcrState('running');
    try {
      const outcome = await runOcr(imageUri);
      if (outcome.status === 'ok') {
        setOcrState('done');
        return outcome.text;
      }
      setOcrState(outcome.status === 'no_text' ? 'no_text' : 'error');
      return null;
    } catch (error) {
      logger.error('OCR extraction failed', error);
      setOcrState('error');
      return null;
    }
  };

  const reset = () => setOcrState('idle');

  return { ocrState, extract, reset };
}
```

UnifiedCaptureForm 변경점:
- `handlePickImage`에서 `onChangeImageUri(uri)` 후 `const text = await extract(uri); if (text) onChangeBody(text);`
- OCR 진행 중 인디케이터 (`ocrState === 'running'`일 때 quick bar에 ActivityIndicator)
- `no_text`/`error` 상태는 방해하지 않는 toast (기존 toast 패턴 재사용)

**Step 2: capture.tsx 하드코딩 제거**

`capture.tsx:52`의 `body: trimmedBody || (formState.imageUri ? '스크린샷 기록' : '')` — OCR 텍스트가 body로 들어오므로 그대로 두되, OCR 실패 시에만 폴백. 실제로는 `trimmedBody || ''`로 충분 (빈 body + imageUri 조합은 위 32줄 가드가 이미 허용). 변경:

```typescript
body: trimmedBody,
```

**Step 3: 게이트 통과 확인**

Run: `cd /Users/loopy/dev/ll3/Glimpse && bun run lint && bun run typecheck && bun test`
Expected: 전부 통과.

**Step 4: 수동 GUI 검증 (사용자 참여)**

시뮬레이터/실기기에서: (1) 캡처 화면 → 사진 첨부 → 한국어 스크린샷 선택 → OCR 인디케이터 → 본문에 텍스트 자동 삽입 (2) 텍스트 없는 이미지 → 'no_text' 안내 (3) 저장 → 라이브러리에서 스크린샷 항목에 추출 텍스트 확인.

**Step 5: 커밋**

```bash
git add apps/mobile/src/hooks/useOcrExtraction.ts apps/mobile/src/components/capture/UnifiedCaptureForm.tsx apps/mobile/app/capture.tsx
git commit -m "feat(mobile): 스크린샷 캡처에 온디바이스 OCR 연결 — 텍스트 자동 추출"
```

---

## Task 7: 문서 정합

**Files:**
- Modify: `docs/plans/2026-08-16-rustra-integration-design.md`
- Modify: 라운드 3 디자인/계획 문서 (완료 기록)
- Modify: 메모리 `rustra-glimpse-integration.md`

**Step 1: rustra 통합 디자인 문서 드리프트 수정**

- `:83` 부근 `desktop-core-client.ts` 참조 삭제 (1주차에 삭제된 파일)
- `:103` 뮤텍스 "3주차 재평가" 표 — 라운드 1·2 결과(미해결, rustra 측 기능 필요)로 갱신
- `:209` 헤딩 `###` → `##` 규격 통일
- GUI 검증 체크리스트: integration-plan 측을 진실 소스로 명시하는 문장 추가

**Step 2: OCR 항목 GUI 체크리스트 추가**

integration-plan의 모바일 체크리스트에 Task 6 Step 4의 3항목 추가.

**Step 3: 라운드 3 완료 기록 + 메모리 갱신**

계획 문서 상태를 "완료"로, 메모리의 잔여 목록에서 흡수된 항목 제거 (rustra 차기 흡수 → 완료, CI 도입 → 완료, OCR → 완료).

**Step 4: 커밋**

```bash
git add docs thoughts /Users/loopy/.claude/projects/-Users-loopy-dev-ll3-Glimpse/memory/ 2>/dev/null || git add docs thoughts
git commit -m "docs: 라운드 3 완료 기록 — 문서 드리프트 정정, GUI 체크리스트 갱신"
```

(메모리 파일은 레포 외부 — git add 대상에서 제외하고 Write로만 갱신)

---

## 검증 최종 게이트 (모든 태스크 후)

```bash
bun run lint && bun run typecheck && bun run desktop:typecheck && bun test && cargo test --workspace && cargo clippy --workspace --all-targets -- -D warnings
```

그리고 CI가 main push에서 두 잡 그린 것 확인 (Task 1 커밋 푸시 후).

## 파일 복잡도 평가 (CLAUDE.md 규정)

- `UnifiedCaptureForm.tsx` (213줄): 임계 근접 — OCR 로직은 `useOcrExtraction` 훅으로 분리해 폼 증가분 최소화
- `ScreenshotForm.tsx` (138줄): 미수정 (dead path 유지 — 별도 정리 이슈로 기록)
