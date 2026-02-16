import { useCallback, useEffect, useReducer } from 'react';
import { useShareIntentContext } from 'expo-share-intent';
import { type KnowledgeItemInput } from '@/src/features/capture';
import { type KnowledgeItemType } from '@/src/db/schema';
import { type SharedContent } from './ShareForm';

type BuildSaveInputResult =
  | { input: KnowledgeItemInput }
  | { errorMessage: string };

export type CollectFormState = {
  title: string;
  body: string;
  highlightText: string;
  highlightSource: string;
  screenshotText: string;
  shareTitle: string;
  shareBody: string;
  sharedContent: SharedContent;
};

export type CollectFormActions = {
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  setHighlightText: (value: string) => void;
  setHighlightSource: (value: string) => void;
  setScreenshotText: (value: string) => void;
  setShareTitle: (value: string) => void;
  setShareBody: (value: string) => void;
};

type ReducerState = {
  channel: KnowledgeItemType;
  form: CollectFormState;
};

type ReducerAction =
  | { type: 'set_channel'; value: KnowledgeItemType }
  | { type: 'reset_form' }
  | { type: 'set_title'; value: string }
  | { type: 'set_body'; value: string }
  | { type: 'set_highlight_text'; value: string }
  | { type: 'set_highlight_source'; value: string }
  | { type: 'set_screenshot_text'; value: string }
  | { type: 'set_share_title'; value: string }
  | { type: 'set_share_body'; value: string }
  | {
      type: 'apply_share_intent';
      sharedContent: SharedContent;
      shareText?: string;
      shareUrl?: string;
    };

function createInitialFormState(): CollectFormState {
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

function createInitialState(): ReducerState {
  return {
    channel: 'note',
    form: createInitialFormState(),
  };
}

function collectFormReducer(state: ReducerState, action: ReducerAction): ReducerState {
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

export function useCollectFormState() {
  const [reducerState, dispatch] = useReducer(collectFormReducer, undefined, createInitialState);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const { channel, form } = reducerState;
  const {
    title,
    body,
    highlightText,
    highlightSource,
    screenshotText,
    shareTitle,
    shareBody,
    sharedContent,
  } = form;

  const resetForm = useCallback(() => {
    dispatch({ type: 'reset_form' });
  }, []);

  const handleChannelChange = useCallback(
    (nextChannel: KnowledgeItemType) => {
      dispatch({ type: 'set_channel', value: nextChannel });
    },
    []
  );

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) {
      return;
    }

    const nextSharedContent: SharedContent = {};
    let shareText: string | undefined;
    let shareUrl: string | undefined;

    if (shareIntent.text) {
      nextSharedContent.text = shareIntent.text;
      shareText = shareIntent.text;
    }

    if (shareIntent.webUrl) {
      nextSharedContent.url = shareIntent.webUrl;
      shareUrl = shareIntent.webUrl;
    }

    if (shareIntent.files && shareIntent.files.length > 0) {
      nextSharedContent.imageUri = shareIntent.files[0].path;
    }

    dispatch({
      type: 'apply_share_intent',
      sharedContent: nextSharedContent,
      shareText,
      shareUrl,
    });
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  const buildSaveInput = useCallback((): BuildSaveInputResult => {
    switch (channel) {
      case 'note':
        if (!body.trim()) {
          return { errorMessage: '본문을 입력해주세요.' };
        }
        return {
          input: {
            type: 'note',
            title: title.trim() || undefined,
            body: body.trim(),
          },
        };

      case 'link':
        if (!body.trim()) {
          return { errorMessage: 'URL을 입력해주세요.' };
        }
        return {
          input: {
            type: 'link',
            title: title.trim() || undefined,
            url: body.trim(),
          },
        };

      case 'highlight':
        if (!highlightText.trim()) {
          return { errorMessage: '하이라이트 텍스트를 입력해주세요.' };
        }
        return {
          input: {
            type: 'highlight',
            title: highlightSource.trim() || undefined,
            body: highlightText.trim(),
          },
        };

      case 'screenshot':
        if (!screenshotText.trim()) {
          return { errorMessage: '이미지를 선택하고 텍스트를 추출해주세요.' };
        }
        return {
          input: {
            type: 'screenshot',
            title: title.trim() || undefined,
            body: screenshotText.trim(),
          },
        };

      case 'share':
        if (!shareBody.trim() && !sharedContent.url && !sharedContent.imageUri) {
          return { errorMessage: '공유된 내용이 없습니다.' };
        }
        return {
          input: {
            type: 'share',
            title: shareTitle.trim() || sharedContent.url || undefined,
            body: shareBody.trim(),
            url: sharedContent.url,
          },
        };

      default:
        return { errorMessage: '지원하지 않는 채널입니다.' };
    }
  }, [
    body,
    channel,
    highlightSource,
    highlightText,
    screenshotText,
    shareBody,
    shareTitle,
    sharedContent.imageUri,
    sharedContent.url,
    title,
  ]);

  const state: CollectFormState = {
    title,
    body,
    highlightText,
    highlightSource,
    screenshotText,
    shareTitle,
    shareBody,
    sharedContent,
  };

  const actions: CollectFormActions = {
    setTitle: (value) => dispatch({ type: 'set_title', value }),
    setBody: (value) => dispatch({ type: 'set_body', value }),
    setHighlightText: (value) => dispatch({ type: 'set_highlight_text', value }),
    setHighlightSource: (value) => dispatch({ type: 'set_highlight_source', value }),
    setScreenshotText: (value) => dispatch({ type: 'set_screenshot_text', value }),
    setShareTitle: (value) => dispatch({ type: 'set_share_title', value }),
    setShareBody: (value) => dispatch({ type: 'set_share_body', value }),
  };

  return {
    channel,
    setChannel: handleChannelChange,
    state,
    actions,
    resetForm,
    buildSaveInput,
  };
}
