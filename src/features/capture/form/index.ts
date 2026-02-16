export {
  useCollectFormState,
  type BuildSaveInputResult,
  type CollectFormActions,
  type CollectFormState,
  type SharedContent,
} from './useFormState';

export {
  buildSaveInputByChannel,
} from './buildSaveInput';

export {
  collectFormReducer,
  createInitialState,
  createInitialFormState,
} from './reducer';

export {
  parseShareIntent,
} from './shareIntent';

export type {
  ReducerState,
  ReducerAction,
  ShareIntentPayload,
} from './types';
