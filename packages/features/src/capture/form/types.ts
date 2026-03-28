import { type KnowledgeItemType } from '@glimpse/shared';

export type SharedContent = {
  text?: string;
  url?: string;
  imageUri?: string;
};

export type BuildSaveInputResult =
  | { input: import('../index').KnowledgeItemInput }
  | { errorMessage: string };

export type CaptureFormState = {
  title: string;
  body: string;
  highlightText: string;
  highlightSource: string;
  screenshotText: string;
  shareTitle: string;
  shareBody: string;
  sharedContent: SharedContent;
};

export type CaptureFormActions = {
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  setHighlightText: (value: string) => void;
  setHighlightSource: (value: string) => void;
  setScreenshotText: (value: string) => void;
  setShareTitle: (value: string) => void;
  setShareBody: (value: string) => void;
};

export type ReducerState = {
  channel: KnowledgeItemType;
  form: CaptureFormState;
};

export type ReducerAction =
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

export type ShareIntentPayload = {
  sharedContent: SharedContent;
  shareText?: string;
  shareUrl?: string;
};
