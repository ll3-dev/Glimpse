import { type KnowledgeItemType } from '@/src/db/schema';
import type { BuildSaveInputResult, CaptureFormState } from './types';

export function buildSaveInputByChannel(
  channel: KnowledgeItemType,
  state: CaptureFormState
): BuildSaveInputResult {
  switch (channel) {
    case 'note':
      if (!state.body.trim()) {
        return { errorMessage: '본문을 입력해주세요.' };
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
        return { errorMessage: 'URL을 입력해주세요.' };
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
        return { errorMessage: '하이라이트 텍스트를 입력해주세요.' };
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
        return { errorMessage: '이미지를 선택하고 텍스트를 추출해주세요.' };
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
        return { errorMessage: '공유된 내용이 없습니다.' };
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
      return { errorMessage: '지원하지 않는 채널입니다.' };
  }
}
