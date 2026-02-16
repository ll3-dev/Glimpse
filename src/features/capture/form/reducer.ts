import type {
  CollectFormState,
  ReducerAction,
  ReducerState,
} from './types';

export function createInitialFormState(): CollectFormState {
  return {
    title: '',
    body: '',
    highlightText: '',
    highlightSource: '',
    screenshotText: '',
    shareTitle: '',
    shareBody: '',
    sharedContent: {},
  };
}

export function createInitialState(): ReducerState {
  return {
    channel: 'note',
    form: createInitialFormState(),
  };
}

export function collectFormReducer(
  state: ReducerState,
  action: ReducerAction
): ReducerState {
  switch (action.type) {
    case 'set_channel':
      return {
        channel: action.value,
        form: createInitialFormState(),
      };

    case 'reset_form':
      return {
        ...state,
        form: createInitialFormState(),
      };

    case 'set_title':
      return { ...state, form: { ...state.form, title: action.value } };

    case 'set_body':
      return { ...state, form: { ...state.form, body: action.value } };

    case 'set_highlight_text':
      return { ...state, form: { ...state.form, highlightText: action.value } };

    case 'set_highlight_source':
      return { ...state, form: { ...state.form, highlightSource: action.value } };

    case 'set_screenshot_text':
      return { ...state, form: { ...state.form, screenshotText: action.value } };

    case 'set_share_title':
      return { ...state, form: { ...state.form, shareTitle: action.value } };

    case 'set_share_body':
      return { ...state, form: { ...state.form, shareBody: action.value } };

    case 'apply_share_intent': {
      const nextForm: CollectFormState = {
        ...state.form,
        sharedContent: action.sharedContent,
      };

      if (action.shareText !== undefined) {
        nextForm.shareBody = action.shareText;
      }

      if (action.shareUrl !== undefined) {
        nextForm.shareTitle = action.shareUrl;
      }

      return {
        channel: 'share',
        form: nextForm,
      };
    }

    default:
      return state;
  }
}
