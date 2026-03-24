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

// Form state management (types and functions)
export {
  buildSaveInputByChannel,
  captureFormReducer,
  createInitialState,
  createInitialFormState,
  parseShareIntent,
  type BuildSaveInputResult,
  type CaptureFormActions,
  type CaptureFormState,
  type SharedContent,
  type ReducerState,
  type ReducerAction,
  type ShareIntentPayload,
} from './form';

// Re-export hook from hooks folder
export { useCaptureFormState } from '@/src/hooks/useCaptureFormState';
