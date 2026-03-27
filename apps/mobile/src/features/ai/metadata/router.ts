/**
 * Metadata target router
 *
 * Uses the effective target from AI target settings and executes exactly that target.
 */

import { Effect } from 'effect';
import type { MetadataInput, MetadataOutput, AIProviderError, AiMetadataService } from './types';
import { aiProviderError, isAIProviderError } from './types';
import { executeMetadataTargetEffect } from '../targets/executors';
import { resolveEffectiveTarget } from '../targets';
import { isAppError, type AppError } from '@/src/lib/effect-result';

export interface RouterConfig {
  resolveTarget?: () => ReturnType<typeof resolveEffectiveTarget>;
  executeTarget?: typeof executeMetadataTargetEffect;
  onTargetSelected?: (targetId: string) => void;
  onTargetSucceeded?: (targetId: string, result: MetadataOutput) => void;
  onTargetFailed?: (targetId: string, error: AIProviderError) => void;
}

const defaultConfig: RouterConfig = {};

/**
 * Map AppError to AIProviderError for type compatibility
 */
function mapErrorToProviderError(error: unknown): AIProviderError {
  if (isAIProviderError(error)) {
    return error;
  }
  if (isAppError(error)) {
    return aiProviderError(
      'AI_PROVIDER_INTERNAL_ERROR',
      'router',
      error.message,
      { cause: error }
    );
  }
  return aiProviderError(
    'AI_PROVIDER_INTERNAL_ERROR',
    'router',
    error instanceof Error ? error.message : 'Unknown error',
    { cause: error }
  );
}

export function createMetadataRouter(
  config: RouterConfig = defaultConfig
): AiMetadataService {
  const getTarget = config.resolveTarget ?? (() => resolveEffectiveTarget('metadata'));
  const executeTarget = config.executeTarget ?? executeMetadataTargetEffect;

  return {
    generate(input: MetadataInput): Effect.Effect<MetadataOutput, AIProviderError> {
      return Effect.gen(function* (_) {
        const target = getTarget();
        config.onTargetSelected?.(target.id);

        // Execute and map errors to AIProviderError
        const result = yield* _(
          executeTarget(target, input).pipe(
            Effect.mapError(mapErrorToProviderError),
            Effect.tap((data) => {
              config.onTargetSucceeded?.(target.id, data);
              return Effect.succeed(undefined);
            }),
            Effect.tapError((error) => {
              config.onTargetFailed?.(target.id, error);
              return Effect.succeed(undefined);
            })
          )
        );

        return result;
      });
    },
  };
}

export const metadataRouter = createMetadataRouter();
