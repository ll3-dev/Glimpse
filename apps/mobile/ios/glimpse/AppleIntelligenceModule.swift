import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

@objc(AppleIntelligenceModule)
final class AppleIntelligenceModule: NSObject {
  @objc
  func isAvailable(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      switch SystemLanguageModel.default.availability {
      case .available:
        resolve(0)
      case .unavailable(.deviceNotEligible):
        resolve(2)
      case .unavailable(.appleIntelligenceNotEnabled):
        resolve(3)
      case .unavailable(.modelNotReady):
        resolve(4)
      @unknown default:
        resolve(4)
      }
      return
    }
    #endif

    resolve(1)
  }

  @objc
  func generate(
    _ prompt: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      reject("invalid_prompt", "Prompt must not be empty", nil)
      return
    }

    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      let maxTokens = max(1, min(options["maxTokens"] as? Int ?? 256, 4_096))
      let temperature = max(0, min(options["temperature"] as? Double ?? 0.7, 2))

      Task {
        do {
          guard SystemLanguageModel.default.availability == .available else {
            reject("model_unavailable", "Apple Intelligence model is not available", nil)
            return
          }

          let session = LanguageModelSession(model: .default)
          let response = try await session.respond(
            to: prompt,
            options: GenerationOptions(
              temperature: temperature,
              maximumResponseTokens: maxTokens
            )
          )
          resolve(["text": response.content])
        } catch {
          reject("generation_failed", error.localizedDescription, error)
        }
      }
      return
    }
    #endif

    reject("unsupported_os", "Foundation Models requires iOS 26 or later", nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }
}
