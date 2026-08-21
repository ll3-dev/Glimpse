import { useCallback, useReducer } from 'react';
import type { KnowledgeItemType } from '@glimpse/shared';

import { buildSaveInputByChannel } from '@/src/features/capture/form/buildSaveInput';
import { captureFormReducer, createInitialState } from '@/src/features/capture/form/reducer';
import type { CaptureFormActions, CaptureFormState } from '@/src/features/capture/form/types';

/** Web capture does not subscribe to native share intents. */
export function useCaptureFormState() {
  const [reducerState, dispatch] = useReducer(captureFormReducer, undefined, createInitialState);
  const { channel, form } = reducerState;

  const resetForm = useCallback(() => dispatch({ type: 'reset_form' }), []);
  const setChannel = useCallback((nextChannel: KnowledgeItemType) => {
    dispatch({ type: 'set_channel', value: nextChannel });
  }, []);
  const buildSaveInput = useCallback(
    () => buildSaveInputByChannel(channel, form),
    [channel, form],
  );

  const state: CaptureFormState = {
    title: form.title,
    body: form.body,
    highlightText: form.highlightText,
    highlightSource: form.highlightSource,
    screenshotText: form.screenshotText,
    shareTitle: form.shareTitle,
    shareBody: form.shareBody,
    sharedContent: form.sharedContent,
  };

  const actions: CaptureFormActions = {
    setTitle: (value) => dispatch({ type: 'set_title', value }),
    setBody: (value) => dispatch({ type: 'set_body', value }),
    setHighlightText: (value) => dispatch({ type: 'set_highlight_text', value }),
    setHighlightSource: (value) => dispatch({ type: 'set_highlight_source', value }),
    setScreenshotText: (value) => dispatch({ type: 'set_screenshot_text', value }),
    setShareTitle: (value) => dispatch({ type: 'set_share_title', value }),
    setShareBody: (value) => dispatch({ type: 'set_share_body', value }),
  };

  return { channel, setChannel, state, actions, resetForm, buildSaveInput };
}
