// Types
export type {
  BuildSaveInputResult,
  CaptureFormActions,
  CaptureFormState,
  SharedContent,
  ReducerState,
  ReducerAction,
  ShareIntentPayload,
} from './types';

// Functions
export {
  buildSaveInputByChannel,
} from './buildSaveInput';

export {
  captureFormReducer,
  createInitialState,
  createInitialFormState,
} from './reducer';

export {
  parseShareIntent,
} from './shareIntent';
