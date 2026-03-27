/**
 * Stub Metadata Provider
 *
 * Default provider using heuristic-based stub functions.
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
 * Stub provider that wraps existing stub functions.
 * Always available in default mode.
 */
export const stubProvider: MetadataProvider = {
  name: "stub",

  async isAvailable(): Promise<boolean> {
    // Stub is always available
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
