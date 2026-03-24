import { useCallback, useEffect, useReducer } from 'react';
import { useShareIntentContext } from 'expo-share-intent';
import { buildSaveInputByChannel } from "@/src/features/capture/form/buildSaveInput";
import { captureFormReducer, createInitialState } from "@/src/features/capture/form/reducer";
import { parseShareIntent } from "@/src/features/capture/form/shareIntent";
import type { CaptureFormActions, CaptureFormState } from "@/src/features/capture/form/types";
import { type KnowledgeItemType } from '@glimpse/shared';

export function useCaptureFormState() {
  const [reducerState, dispatch] = useReducer(captureFormReducer, undefined, createInitialState);
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();
  const { channel, form } = reducerState;

  const resetForm = useCallback(() => {
    dispatch({ type: 'reset_form' });
  }, []);

  const setChannel = useCallback((nextChannel: KnowledgeItemType) => {
    dispatch({ type: "set_channel", value: nextChannel });
  }, []);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) {
      return;
    }

    const { sharedContent, shareText, shareUrl } =
      parseShareIntent(shareIntent);

    dispatch({
      type: "apply_share_intent",
      sharedContent,
      shareText,
      shareUrl,
    });

    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

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

  return {
    channel,
    setChannel,
    state,
    actions,
    resetForm,
    buildSaveInput,
  };
}
