/**
 * Local Fallback Metadata Provider
 *
 * Default provider using deterministic preview and tag functions.
 * Used when the app stays in the default inference mode.
 */

import { Effect } from "effect";
import type {
  MetadataProvider,
  MetadataInput,
  MetadataOutput,
  AIProviderError,
} from "../metadata/types";
import {
  generateSummaryStub,
  generateTagsStub,
} from "@/src/features/capture/stubs";

/**
 * Fallback provider that wraps the local preview and tag functions.
 * Always available in default mode.
 */
export const stubProvider: MetadataProvider = {
  name: "stub",

  async isAvailable(): Promise<boolean> {
    // The deterministic local fallback is always available.
    return true;
  },

  generate(
    input: MetadataInput,
  ): Effect.Effect<MetadataOutput, AIProviderError> {
    return Effect.gen(function* (_) {
      const content = input.title
        ? `${input.title}\n\n${input.content}`
        : input.content;

      const summary = generateSummaryStub(content);
      const tags = generateTagsStub(content);

      return { summary, tags };
    });
  },
};
