import { type KnowledgeItemType } from '@glimpse/shared';
import type { BuildSaveInputResult, CaptureFormState } from './types';

export function buildSaveInputByChannel(
  channel: KnowledgeItemType,
  state: CaptureFormState
): BuildSaveInputResult {
  switch (channel) {
    case 'note':
      if (!state.body.trim()) {
        return { errorMessage: 'Body is required.' };
      }
      return {
        input: {
          type: 'note',
          title: state.title.trim() || undefined,
          body: state.body.trim(),
        },
      };

    case 'link':
      if (!state.body.trim()) {
        return { errorMessage: 'URL is required.' };
      }
      return {
        input: {
          type: 'link',
          title: state.title.trim() || undefined,
          url: state.body.trim(),
        },
      };

    case 'highlight':
      if (!state.highlightText.trim()) {
        return { errorMessage: 'Highlight text is required.' };
      }
      return {
        input: {
          type: 'highlight',
          title: state.highlightSource.trim() || undefined,
          body: state.highlightText.trim(),
        },
      };

    case 'screenshot':
      if (!state.screenshotText.trim()) {
        return { errorMessage: 'Image text is required.' };
      }
      return {
        input: {
          type: 'screenshot',
          title: state.title.trim() || undefined,
          body: state.screenshotText.trim(),
        },
      };

    case 'share':
      if (!state.shareBody.trim() && !state.sharedContent.url && !state.sharedContent.imageUri) {
        return { errorMessage: 'No shared content.' };
      }
      return {
        input: {
          type: 'share',
          title: state.shareTitle.trim() || state.sharedContent.url || undefined,
          body: state.shareBody.trim(),
          url: state.sharedContent.url,
        },
      };

    default:
      return { errorMessage: 'Unsupported channel.' };
  }
}
