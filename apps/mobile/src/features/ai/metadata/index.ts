/**
 * AI Metadata Module
 *
 * Provider routing and metadata generation for capture flow.
 */

export type {
  MetadataOutput,
  MetadataInput,
  AIProviderErrorCode,
  AIProviderError,
  MetadataProvider,
  AiMetadataService,
} from './types';

export { aiProviderError, isAIProviderError } from './types';
export { stubProvider } from './stub-provider';
export { createMetadataRouter, metadataRouter, type RouterConfig } from './router';
