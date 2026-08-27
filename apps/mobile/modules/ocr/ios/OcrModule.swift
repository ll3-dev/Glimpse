import ExpoModulesCore
import UIKit
import Vision

/**
 온디바이스 OCR — VNRecognizeTextRequest (iOS 16+, ko-KR/en-US, accurate).
 JS 계약: globalThis.__glimpseOcr.recognizeText(imageUri) → OcrResult.
 */
public class OcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Ocr")

    OnCreate {
      guard let appContext = appContext else { return }
      installGlobal(appContext: appContext)
    }

    AsyncFunction("recognizeText") { (imageUri: String, promise: Promise) in
      Self.performRecognition(imageUri: imageUri, promise: promise)
    }
  }

  private func installGlobal(appContext: AppContext) {
    // JS global에 설치 — rustra-jsi와 동일한 global 계약 패턴.
    // SDK 57에서 eval은 @JavaScriptActor 격리됨 — evalAsync로 hop.
    Task {
      try? await appContext.runtime.evalAsync(
        """
        (function () {
          globalThis.__glimpseOcr = {
            recognizeText: function (imageUri) {
              return globalThis.ExpoModules.Ocr.recognizeText(imageUri);
            }
          };
        })();
        """
      )
    }
  }

  private static func performRecognition(imageUri: String, promise: Promise) {
    let cleaned = imageUri.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: cleaned),
          let cgImage = image.cgImage else {
      promise.reject("FAILED", "이미지를 불러올 수 없습니다")
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
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
        // VNConfidence(Float)를 Double로 명시 변환 — reduce의 컨텍스트 타입 혼동 방지
        let confidence: Double = candidates.isEmpty
          ? 0.0
          : candidates.map { Double($0.confidence) }.reduce(0, +) / Double(candidates.count)

        promise.resolve([
          "text": text,
          "confidence": confidence,
          // VNRecognizedText에 언어 프로퍼티가 없어 요청 언어 세트를 그대로 보고한다
          "language": "ko-KR,en-US",
        ])
      } catch {
        promise.reject("FAILED", error.localizedDescription)
      }
    }
  }
}
