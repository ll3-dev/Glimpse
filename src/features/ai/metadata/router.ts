/**
 * Metadata Provider Router
 *
 * Implements the routing policy: Apple -> Local -> BYOK -> Stub
 * Each provider is tried in order, with fallback on failure.
 */

import type { Result } from '@/src/lib/effect-result';
import { appError } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput, AiMetadataService } from './types';
import { stubProvider } from './stub-provider';
import { appleProvider } from '../providers/apple-provider';
import { localLLMProvider } from '../providers/local-llm-provider';

/**
 * Provider priority order (highest to lowest)
 */
const PROVIDER_PRIORITY: readonly MetadataProvider[] = [
  appleProvider, // Apple Intelligence (iOS 18.1+, macOS 15.1+)
  localLLMProvider, // On-device LLM
  // BYOK provider will be added in unit 7
  stubProvider, // Always last as fallback
];

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Custom provider order (overrides default) */
  providers?: MetadataProvider[];
  /** Log provider selection (for debugging) */
  onProviderSelected?: (provider: string, reason: 'available' | 'fallback') => void;
  /** Log provider failure (for debugging) */
  onProviderFailed?: (provider: string, error: unknown) => void;
}

/**
 * Default router configuration
 */
const defaultConfig: RouterConfig = {};

/**
 * Create a metadata router with the routing policy.
 *
 * Routing rules:
 * 1. Try providers in priority order
 * 2. Skip unavailable providers (isAvailable() returns false)
 * 3. On generation failure, try next provider
 * 4. All failures fall back to stub (always available)
 */
export function createMetadataRouter(
  config: RouterConfig = defaultConfig
): AiMetadataService {
  const providers = config.providers ?? PROVIDER_PRIORITY;

  return {
    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      const errors: { provider: string; error: unknown }[] = [];

      for (const provider of providers) {
        // Check availability
        try {
          const available = await provider.isAvailable();
          if (!available) {
            config.onProviderFailed?.(provider.name, new Error('Provider unavailable'));
            errors.push({ provider: provider.name, error: 'unavailable' });
            continue;
          }
        } catch (error) {
          config.onProviderFailed?.(provider.name, error);
          errors.push({ provider: provider.name, error });
          continue;
        }

        // Attempt generation
        config.onProviderSelected?.(provider.name, 'available');
        try {
          const result = await provider.generate(input);
          if (result.success) {
            return result;
          }
          // Generation returned failure, try next provider
          config.onProviderFailed?.(provider.name, result.error);
          errors.push({ provider: provider.name, error: result.error });
        } catch (error) {
          config.onProviderFailed?.(provider.name, error);
          errors.push({ provider: provider.name, error });
        }
      }

      // All providers failed (should not reach here if stub is included)
      return {
        success: false,
        error: appError(
          'GENERATION_ERROR',
          'All metadata providers failed',
          { errors }
        ),
      };
    },
  };
}

/**
 * Default metadata router instance
 *
 * Uses the standard provider priority: Apple -> Local -> BYOK -> Stub
 */
export const metadataRouter = createMetadataRouter();
