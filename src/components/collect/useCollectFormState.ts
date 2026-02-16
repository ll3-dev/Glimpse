import { useCallback, useEffect, useReducer } from 'react';
import { useShareIntentContext } from 'expo-share-intent';
import { buildSaveInputByChannel } from "./collectForm.buildSaveInput";
import { collectFormReducer, createInitialState } from "./collectForm.reducer";
import { parseShareIntent } from "./collectForm.shareIntent";
import type { CollectFormActions, CollectFormState } from "./collectForm.types";
import { type KnowledgeItemType } from "@/src/db/schema";

export type {
  BuildSaveInputResult,
  CollectFormActions,
  CollectFormState,
} from "./collectForm.types";

export function useCollectFormState() {
  const [reducerState, dispatch] = useReducer(collectFormReducer, undefined, createInitialState);
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

  const state: CollectFormState = {
    title: form.title,
    body: form.body,
    highlightText: form.highlightText,
    highlightSource: form.highlightSource,
    screenshotText: form.screenshotText,
    shareTitle: form.shareTitle,
    shareBody: form.shareBody,
    sharedContent: form.sharedContent,
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
    setChannel,
    state,
    actions,
    resetForm,
    buildSaveInput,
  };
}
