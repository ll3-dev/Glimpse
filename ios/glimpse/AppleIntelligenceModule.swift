//
//  AppleIntelligenceModule.swift
//  glimpse
//
//  Native module for Apple Intelligence integration.
//  Available on iOS 18.1+ with Apple Intelligence enabled devices.
//

import Foundation
import React

/// Availability status for Apple Intelligence
@objc public enum AppleIntelligenceAvailabilityStatus: NSInteger {
  case available = 0
  case unsupportedOS = 1
  case unsupportedDevice = 2
  case disabled = 3
  case notConfigured = 4
}

/// Native module for Apple Intelligence Foundation Models
/// This module provides access to on-device AI capabilities.
///
/// Usage from JavaScript:
/// ```typescript
/// import { NativeModules } from 'react-native';
/// const { AppleIntelligenceModule } = NativeModules;
///
/// const status = await AppleIntelligenceModule.isAvailable();
/// const result = await AppleIntelligenceModule.generate(prompt, options);
/// ```
@objc(AppleIntelligenceModule)
public class AppleIntelligenceModule: NSObject {

  // MARK: - Constants

  private let errorDomain = "AppleIntelligenceModule"

  // MARK: - Availability Check

  /// Check if Apple Intelligence is available on this device
  ///
  /// Returns a status code:
  /// - 0: available
  /// - 1: unsupported_os (iOS < 18.1)
  /// - 2: unsupported_device (device doesn't support Apple Intelligence)
  /// - 3: disabled (user has disabled Apple Intelligence)
  /// - 4: not_configured (not fully set up)
  ///
  /// - Parameter resolve: Promise resolve callback with status code
  @objc
  public func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock) {
    let status = checkAvailability()
    resolve(status.rawValue)
  }

  /// Synchronous availability check for internal use
  private func checkAvailability() -> AppleIntelligenceAvailabilityStatus {
    // Check iOS version (requires iOS 18.1+)
    if #available(iOS 18.1, macOS 15.1, *) {
      // TODO: Add actual device capability check when FoundationModels is integrated
      // This would check for:
      // - A17+ or M-series chip
      // - Apple Intelligence enabled in settings
      // - Model downloaded and ready

      // For now, return notConfigured to trigger fallback
      return .notConfigured
    } else {
      return .unsupportedOS
    }
  }

  // MARK: - Text Generation

  /// Generate text using Apple Intelligence
  ///
  /// - Parameters:
  ///   - prompt: The input prompt for text generation
  ///   - options: Dictionary with optional keys:
  ///     - maxTokens: Maximum tokens to generate (default: 256)
  ///     - temperature: Sampling temperature 0-2 (default: 0.7)
  ///   - resolve: Promise resolve callback with { text: string }
  ///   - reject: Promise reject callback with (code, message, error)
  @objc
  public func generate(
    _ prompt: String,
    options: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    // Validate prompt
    guard !prompt.isEmpty else {
      reject(
        "INVALID_PROMPT",
        "Prompt cannot be empty",
        NSError(domain: errorDomain, code: -1, userInfo: nil)
      )
      return
    }

    // Check availability
    let status = checkAvailability()
    guard status == .available else {
      let (code, message) = errorInfo(for: status)
      reject(code, message, nil)
      return
    }

    // Extract options
    let maxTokens = (options["maxTokens"] as? Int) ?? 256
    let _ = (options["temperature"] as? Double) ?? 0.7

    // TODO: Integrate with Apple Foundation Models API (iOS 18.1+)
    // When available, use:
    //
    // @available(iOS 18.1, macOS 15.1, *)
    // import FoundationModels
    //
    // let session = LanguageModelSession()
    // let response = try await session.generateText(prompt)
    //
    // For now, return placeholder to trigger fallback

    reject(
      "AI_PROVIDER_UNAVAILABLE",
      "Apple Intelligence SDK integration pending. Falling back to next provider.",
      NSError(
        domain: errorDomain,
        code: -2,
        userInfo: [
          NSLocalizedDescriptionKey: "Integration pending",
          "maxTokens": maxTokens
        ]
      )
    )
  }

  // MARK: - Error Handling

  /// Get error code and message for availability status
  private func errorInfo(for status: AppleIntelligenceAvailabilityStatus) -> (String, String) {
    switch status {
    case .available:
      return ("AVAILABLE", "Apple Intelligence is available")
    case .unsupportedOS:
      return ("UNSUPPORTED_OS", "Apple Intelligence requires iOS 18.1 or later")
    case .unsupportedDevice:
      return ("UNSUPPORTED_DEVICE", "This device does not support Apple Intelligence")
    case .disabled:
      return ("DISABLED", "Apple Intelligence is disabled in Settings")
    case .notConfigured:
      return ("NOT_CONFIGURED", "Apple Intelligence is not configured")
    }
  }

  /// Get availability status name for logging
  private func availabilityStatusName(_ status: AppleIntelligenceAvailabilityStatus) -> String {
    switch status {
    case .available:
      return "available"
    case .unsupportedOS:
      return "unsupported_os"
    case .unsupportedDevice:
      return "unsupported_device"
    case .disabled:
      return "disabled"
    case .notConfigured:
      return "not_configured"
    }
  }
}
