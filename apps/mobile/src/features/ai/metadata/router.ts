/**
 * Metadata target router
 *
 * Uses the effective target from AI target settings and executes exactly that target.
 */

import type { Result } from '@/src/lib/effect-result';
import { isFailure } from '@/src/lib/effect-result';
import type { MetadataInput, MetadataOutput, AiMetadataService } from './types';
import { executeMetadataTarget, resolveEffectiveTarget } from '../targets';

export interface RouterConfig {
  resolveTarget?: () => ReturnType<typeof resolveEffectiveTarget>;
  executeTarget?: typeof executeMetadataTarget;
  onTargetSelected?: (targetId: string) => void;
  onTargetSucceeded?: (targetId: string, result: MetadataOutput) => void;
  onTargetFailed?: (targetId: string, error: unknown) => void;
}

const defaultConfig: RouterConfig = {};

export function createMetadataRouter(
  config: RouterConfig = defaultConfig
): AiMetadataService {
  const getTarget = config.resolveTarget ?? (() => resolveEffectiveTarget('metadata'));
  const executeTarget = config.executeTarget ?? executeMetadataTarget;

  return {
    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      const target = getTarget();
      config.onTargetSelected?.(target.id);

      const result = await executeTarget(target, input);
      if (result.success) {
        config.onTargetSucceeded?.(target.id, result.data);
      } else if (isFailure(result)) {
        config.onTargetFailed?.(target.id, result.error);
      }
      return result;
    },
  };
}

export const metadataRouter = createMetadataRouter();
