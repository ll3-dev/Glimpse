/**
 * Search Feature Module
 *
 * Exports all search-related use cases and types.
 * This module handles client-side filtering of knowledge items.
 */

export * from './filterKnowledgeItems';
export * from './parseQueryToKeyword';
export {
  useSemanticRerankEnabled,
  DEFAULT_EMBEDDING_MODEL,
} from './semantic-settings';
export {
  providerSupportsEmbedding,
  embedBatchWithBYOK,
  buildEmbeddingsUrl,
  type EmbeddingClientConfig,
} from './byok-embedding-client';
