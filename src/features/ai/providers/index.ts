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
  buildSummaryPrompt as buildLocalSummaryPrompt,
  buildTagsPrompt as buildLocalTagsPrompt,
  parseTagsResponse as parseLocalTagsResponse,
} from './local-llm-provider';
export {
  createBYOKProvider,
  byokProvider,
  type BYOKProviderConfig,
  API_CONFIGS,
} from './byok-provider';
