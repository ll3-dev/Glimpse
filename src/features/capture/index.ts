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
  type ScreenshotInput,
  type ShareInput,
  type KnowledgeItemInput,
  type SaveResult,
  type SaveSuccessResult,
  type SaveFailureResult,
} from './saveKnowledgeItem';

// Stub functions (for testing or direct use)
export { generateSummaryStub, generateTagsStub } from './stubs';

// Form state management
export {
  useCollectFormState,
  buildSaveInputByChannel,
  collectFormReducer,
  createInitialState,
  createInitialFormState,
  parseShareIntent,
  type BuildSaveInputResult,
  type CollectFormActions,
  type CollectFormState,
  type SharedContent,
  type ReducerState,
  type ReducerAction,
  type ShareIntentPayload,
} from './form';
