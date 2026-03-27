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
} from './form/buildSaveInput';
export {
  captureFormReducer,
  createInitialState,
  createInitialFormState,
} from './form/reducer';
export {
  parseShareIntent,
} from './form/shareIntent';
export {
  type BuildSaveInputResult,
  type CaptureFormActions,
  type CaptureFormState,
  type SharedContent,
  type ReducerState,
  type ReducerAction,
  type ShareIntentPayload,
} from './form/types';

// Re-export hook from hooks folder
export { useCaptureFormState } from '@/src/hooks/useCaptureFormState';
