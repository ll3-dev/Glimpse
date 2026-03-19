import { Activity } from 'react';
import { type KnowledgeItemType } from '@/src/db/schema';
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
  return (
    <>
      <Activity mode={channel === 'note' || channel === 'link' ? 'visible' : 'hidden'}>
        <CaptureForm
          title={state.title}
          body={state.body}
          bottomInset={bottomInset}
          onChangeTitle={actions.setTitle}
          onChangeBody={actions.setBody}
          placeholder={channel === 'link' ? 'URL을 입력하세요...' : '자유롭게 기록하세요...'}
        />
      </Activity>

      <Activity mode={channel === 'highlight' ? 'visible' : 'hidden'}>
        <HighlightForm
          text={state.highlightText}
          source={state.highlightSource}
          bottomInset={bottomInset}
          onChangeText={actions.setHighlightText}
          onChangeSource={actions.setHighlightSource}
        />
      </Activity>

      <Activity mode={channel === 'screenshot' ? 'visible' : 'hidden'}>
        <ScreenshotForm
          extractedText={state.screenshotText}
          onChangeExtractedText={actions.setScreenshotText}
          bottomInset={bottomInset}
        />
      </Activity>

      <Activity mode={channel === 'share' ? 'visible' : 'hidden'}>
        <ShareForm
          sharedContent={state.sharedContent}
          editedTitle={state.shareTitle}
          editedBody={state.shareBody}
          bottomInset={bottomInset}
          onChangeTitle={actions.setShareTitle}
          onChangeBody={actions.setShareBody}
        />
      </Activity>
    </>
  );
}
