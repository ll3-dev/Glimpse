/**
 * Apple Intelligence Bridge
 *
 * Native bridge for Apple's on-device Foundation Models.
 * Available on iOS 18.1+ and macOS 15.1+.
 *
 * @module apple-intelligence-bridge
 */

import { NativeModules, Platform } from 'react-native';

/**
 * Apple Intelligence availability info
 */
export interface AppleIntelligenceAvailability {
  /** Whether Apple Intelligence is available on this device */
  available: boolean;
  /** Reason if not available */
  reason?: 'unsupported_os' | 'unsupported_device' | 'disabled' | 'not_configured';
}

/**
 * Options for Apple Intelligence generation
 */
export interface AppleGenerateOptions {
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-2) */
  temperature?: number;
}

/**
 * Result of Apple Intelligence generation
 */
export interface AppleGenerateResult {
  /** Generated text content */
  text: string;
}

/**
 * Native module interface
 */
interface AppleIntelligenceNativeModule {
  isAvailable(): Promise<number>;
  generate(
    prompt: string,
    options: { maxTokens?: number; temperature?: number },
    resolve: (result: { text: string }) => void,
    reject: (code: string, message: string, error?: Error) => void
  ): void;
}

/**
 * Map availability status code to reason
 */
function mapAvailabilityStatus(status: number): AppleIntelligenceAvailability {
  switch (status) {
    case 0: // available
      return { available: true };
    case 1: // unsupported_os
      return { available: false, reason: 'unsupported_os' };
    case 2: // unsupported_device
      return { available: false, reason: 'unsupported_device' };
    case 3: // disabled
      return { available: false, reason: 'disabled' };
    case 4: // not_configured
    default:
      return { available: false, reason: 'not_configured' };
  }
}

/**
 * Get the native module (may be null on non-iOS platforms)
 */
function getNativeModule(): AppleIntelligenceNativeModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const module = NativeModules.AppleIntelligenceModule;
  if (!module) {
    return null;
  }

  return module as AppleIntelligenceNativeModule;
}

/**
 * Apple Intelligence Bridge Interface
 *
 * Defines the contract for Apple Intelligence integration.
 */
export interface AppleIntelligenceBridge {
  /**
   * Check if Apple Intelligence is available on this device
   */
  isAvailable(): Promise<AppleIntelligenceAvailability>;

  /**
   * Generate text using Apple Intelligence
   * @param prompt - The input prompt
   * @param options - Generation options
   */
  generate(prompt: string, options?: AppleGenerateOptions): Promise<AppleGenerateResult>;
}

/**
 * Create an Apple Intelligence bridge instance
 *
 * This factory function returns a bridge implementation
 * that connects to the native Apple Intelligence module.
 */
export function createAppleIntelligenceBridge(): AppleIntelligenceBridge {
  const nativeModule = getNativeModule();

  return {
    async isAvailable(): Promise<AppleIntelligenceAvailability> {
      // Non-iOS platforms are not supported
      if (!nativeModule) {
        return {
          available: false,
          reason: 'unsupported_device',
        };
      }

      try {
        const status = await nativeModule.isAvailable();
        return mapAvailabilityStatus(status);
      } catch {
        return {
          available: false,
          reason: 'not_configured',
        };
      }
    },

    async generate(prompt: string, options?: AppleGenerateOptions): Promise<AppleGenerateResult> {
      if (!nativeModule) {
        throw new Error('Apple Intelligence is not available on this platform');
      }

      return new Promise((resolve, reject) => {
        nativeModule.generate(
          prompt,
          {
            maxTokens: options?.maxTokens ?? 256,
            temperature: options?.temperature ?? 0.7,
          },
          (result) => {
            resolve({ text: result.text });
          },
          (code, message) => {
            reject(new Error(`${code}: ${message}`));
          }
        );
      });
    },
  };
}

/**
 * Default Apple Intelligence bridge instance
 */
export const appleIntelligenceBridge = createAppleIntelligenceBridge();
