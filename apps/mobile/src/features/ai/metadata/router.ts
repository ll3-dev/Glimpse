/**
 * Metadata Provider Router
 *
 * Implements the routing policy: Apple -> Local -> BYOK -> Stub
 * Each provider is tried in order, with fallback on failure.
 *
 * Routing rules:
 * 1. Try providers in priority order
 * 2. Skip unavailable providers (isAvailable() returns false)
 * 3. On generation failure, try next provider
 * 4. All failures fall back to stub (always available)
 */

import type { Result } from '@/src/lib/effect-result';
import { appError, isFailure } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput, AiMetadataService } from './types';
import { stubProvider } from './stub-provider';
import { appleProvider } from '../providers/apple-provider';
import { localLLMProvider } from '../providers/local-llm-provider';
import { byokProvider } from '../providers/byok-provider';

/**
 * Provider priority order (highest to lowest)
 */
const PROVIDER_PRIORITY: readonly MetadataProvider[] = [
  appleProvider, // Apple Intelligence (iOS 18.1+, macOS 15.1+)
  localLLMProvider, // On-device LLM
  byokProvider, // External APIs (OpenAI, Anthropic, Google)
  stubProvider, // Always last as fallback
];

/**
 * Provider error record for logging
 */
interface ProviderErrorRecord {
  provider: string;
  stage: 'availability' | 'generation';
  error: unknown;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Custom provider order (overrides default) */
  providers?: MetadataProvider[];
  /** Log provider selection (for debugging) */
  onProviderSelected?: (provider: string, reason: 'available' | 'fallback') => void;
  /** Log provider success (for debugging) */
  onProviderSucceeded?: (provider: string, result: MetadataOutput) => void;
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
 * The router guarantees:
 * - Apple success → Local/Stub are NOT called
 * - Apple failure → Falls back to Local
 * - Local failure → Falls back to BYOK → Stub
 * - All errors are recorded and available in final error details
 */
export function createMetadataRouter(
  config: RouterConfig = defaultConfig
): AiMetadataService {
  const providers = config.providers ?? PROVIDER_PRIORITY;

  return {
    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      const errors: ProviderErrorRecord[] = [];
      let lastAttemptedProvider: string | null = null;

      for (const provider of providers) {
        // ============================================================
        // Step 1: Check availability
        // ============================================================
        let available = false;
        try {
          available = await provider.isAvailable();
        } catch (error) {
          // Availability check threw an error - record and skip
          errors.push({
            provider: provider.name,
            stage: 'availability',
            error,
          });
          config.onProviderFailed?.(provider.name, error);
          continue;
        }

        if (!available) {
          // Provider is not available - skip
          const unavailableError = new Error('Provider unavailable');
          errors.push({
            provider: provider.name,
            stage: 'availability',
            error: unavailableError,
          });
          config.onProviderFailed?.(provider.name, unavailableError);
          continue;
        }

        // ============================================================
        // Step 2: Attempt generation
        // ============================================================
        lastAttemptedProvider = provider.name;
        const reason = errors.length === 0 ? 'available' : 'fallback';
        config.onProviderSelected?.(provider.name, reason);

        try {
          const result = await provider.generate(input);

          if (result.success) {
            // SUCCESS: Return immediately, skip remaining providers
            config.onProviderSucceeded?.(provider.name, result.data);
            return result;
          }

          // FAILURE: Generation returned failure, record error and try next
          // Use isFailure guard for proper type narrowing
          if (isFailure(result)) {
            errors.push({
              provider: provider.name,
              stage: 'generation',
              error: result.error,
            });
            config.onProviderFailed?.(provider.name, result.error);
          }
        } catch (error) {
          // EXCEPTION: Unexpected error, record and try next
          errors.push({
            provider: provider.name,
            stage: 'generation',
            error,
          });
          config.onProviderFailed?.(provider.name, error);
        }
      }

      // ============================================================
      // All providers failed
      // ============================================================
      // This should only happen if stub provider is missing or broken
      const attemptedProviders = errors.map((e) => e.provider);
      const failedAtStage = errors.map((e) => ({
        provider: e.provider,
        stage: e.stage,
      }));

      return {
        success: false,
        error: appError(
          'GENERATION_ERROR',
          `All metadata providers failed. Attempted: [${attemptedProviders.join(', ')}]`,
          {
            lastAttemptedProvider,
            failedProviders: failedAtStage,
            totalErrors: errors.length,
          }
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
