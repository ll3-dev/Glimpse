import { type KnowledgeItemType } from '@glimpse/shared';
import { type CaptureFormActions, type CaptureFormState } from '@/src/features/capture';
import { CaptureForm } from './CaptureForm';
import { HighlightForm } from './HighlightForm';
import { ScreenshotForm } from './ScreenshotForm';
import { ShareForm } from './ShareForm';

type CaptureChannelFormProps = {
  channel: KnowledgeItemType;
  bottomInset: number;
  state: CaptureFormState;
  actions: CaptureFormActions;
};

export function CaptureChannelForm({
  channel,
  bottomInset,
  state,
  actions,
}: CaptureChannelFormProps) {
  if (channel === 'note' || channel === 'link') {
    return (
      <CaptureForm
        channel={channel}
        title={state.title}
        body={state.body}
        bottomInset={bottomInset}
        onChangeTitle={actions.setTitle}
        onChangeBody={actions.setBody}
        placeholder={channel === 'link' ? 'https://... URL을 입력하세요' : '자유롭게 기록하세요...'}
      />
    );
  }

  if (channel === 'highlight') {
    return (
      <HighlightForm
        text={state.highlightText}
        source={state.highlightSource}
        bottomInset={bottomInset}
        onChangeText={actions.setHighlightText}
        onChangeSource={actions.setHighlightSource}
      />
    );
  }

  if (channel === 'screenshot') {
    return (
      <ScreenshotForm
        extractedText={state.screenshotText}
        onChangeExtractedText={actions.setScreenshotText}
        bottomInset={bottomInset}
      />
    );
  }

  if (channel === 'share') {
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
  }

  return null;
}

