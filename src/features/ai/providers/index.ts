/**
 * AI Providers
 *
 * Provider implementations for metadata generation.
 */

export { createAppleProvider, appleProvider, type AppleProviderConfig } from './apple-provider';
export {
  createLocalLLMProvider,
  localLLMProvider,
  type LocalLLMProviderConfig,
  buildSummaryPrompt,
  buildTagsPrompt,
  parseTagsResponse,
} from './local-llm-provider';
