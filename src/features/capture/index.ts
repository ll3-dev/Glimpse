/**
 * Capture Feature Module
 *
 * Handles knowledge item capture, processing, and storage.
 */

// Main use case
export {
  saveKnowledgeItem,
  type NoteInput,
  type LinkInput,
  type HighlightInput,
  type KnowledgeItemInput,
  type SaveResult,
  type SaveSuccessResult,
  type SaveFailureResult,
} from './saveKnowledgeItem';

// Stub functions (for testing or direct use)
export { generateSummaryStub, generateTagsStub } from './stubs';
