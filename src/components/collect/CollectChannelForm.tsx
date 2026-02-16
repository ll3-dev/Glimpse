import { type KnowledgeItemType } from '@/src/db/schema';
import { CollectForm } from './CollectForm';
import { HighlightForm } from './HighlightForm';
import { ScreenshotForm } from './ScreenshotForm';
import { ShareForm } from './ShareForm';
import {
  type CollectFormActions,
  type CollectFormState,
} from './useCollectFormState';

type CollectChannelFormProps = {
  channel: KnowledgeItemType;
  bottomInset: number;
  state: CollectFormState;
  actions: CollectFormActions;
};

export function CollectChannelForm({
  channel,
  bottomInset,
  state,
  actions,
}: CollectChannelFormProps) {
  switch (channel) {
    case 'note':
    case 'link':
      return (
        <CollectForm
          title={state.title}
          body={state.body}
          bottomInset={bottomInset}
          onChangeTitle={actions.setTitle}
          onChangeBody={actions.setBody}
          placeholder={channel === 'link' ? 'URL을 입력하세요...' : '자유롭게 기록하세요...'}
        />
      );

    case 'highlight':
      return (
        <HighlightForm
          text={state.highlightText}
          source={state.highlightSource}
          bottomInset={bottomInset}
          onChangeText={actions.setHighlightText}
          onChangeSource={actions.setHighlightSource}
        />
      );

    case 'screenshot':
      return (
        <ScreenshotForm
          extractedText={state.screenshotText}
          onChangeExtractedText={actions.setScreenshotText}
          bottomInset={bottomInset}
        />
      );

    case 'share':
      return (
        <ShareForm
          sharedContent={state.sharedContent}
          editedTitle={state.shareTitle}
          editedBody={state.shareBody}
          bottomInset={bottomInset}
          onChangeTitle={actions.setShareTitle}
          onChangeBody={actions.setShareBody}
        />
      );

    default:
      return null;
  }
}
