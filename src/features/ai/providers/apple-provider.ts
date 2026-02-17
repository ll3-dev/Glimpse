/**
 * Apple Intelligence Metadata Provider
 *
 * Uses Apple's on-device Foundation Models for metadata generation.
 * Available on iOS 18.1+ and macOS 15.1+.
 *
 * TODO: Integrate with @react-native-ai/apple or equivalent native module
 */

import type { Result } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput } from '../metadata/types';
import { aiProviderError } from '../metadata/types';
import { checkAppleIntelligenceAvailability } from '@/src/features/settings/appleIntelligence.version';
import { resolveDefaultPlatform } from '@/src/features/settings/appleIntelligence.platform';

/**
 * Apple provider configuration
 */
export interface AppleProviderConfig {
  /** Platform info (defaults to resolveDefaultPlatform()) */
  platform?: { OS: string; Version: string | number };
  /** Check if toggle is enabled (defaults to false - should be wired to store) */
  isToggleEnabled?: () => boolean;
}

/**
 * Create an Apple Intelligence metadata provider.
 *
 * Availability requirements:
 * - iOS 18.1+ or macOS 15.1+
 * - User has enabled Apple Intelligence toggle
 * - Device supports Apple Intelligence (A17+ or M-series chip)
 */
export function createAppleProvider(config: AppleProviderConfig = {}): MetadataProvider {
  const platform = config.platform ?? resolveDefaultPlatform();
  const isToggleEnabled = config.isToggleEnabled ?? (() => false);

  return {
    name: 'apple',

    async isAvailable(): Promise<boolean> {
      // Check platform version availability
      const { available } = checkAppleIntelligenceAvailability(platform);
      if (!available) {
        return false;
      }

      // Check if user has enabled the toggle
      if (!isToggleEnabled()) {
        return false;
      }

      // TODO: Add device capability check (A17+ / M-series)
      // This would require native module integration

      return true;
    },

    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      // Double-check availability
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'apple',
            'Apple Intelligence is not available on this device or is disabled'
          ),
        };
      }

      // TODO: Integrate with Apple Foundation Models API
      // Example integration pattern:
      // const response = await AppleLLM.generate({
      //   prompt: buildPrompt(input),
      //   model: 'default',
      // });

      // For now, return unavailable to trigger fallback
      return {
        success: false,
        error: aiProviderError(
          'AI_PROVIDER_UNAVAILABLE',
          'apple',
          'Apple Intelligence SDK integration pending. Falling back to next provider.',
          { pendingIntegration: true }
        ),
      };
    },
  };
}

/**
 * Default Apple provider instance
 *
 * Note: Uses default platform detection and disabled toggle.
 * For production use, wire up the toggle to the settings store.
 */
export const appleProvider = createAppleProvider();
