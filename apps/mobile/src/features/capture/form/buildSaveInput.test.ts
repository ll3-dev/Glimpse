import { describe, expect, test } from 'bun:test';
import { buildSaveInputByChannel } from './buildSaveInput';
import type { CaptureFormState } from './types';
import type { KnowledgeItemType } from '@glimpse/shared';

const createEmptyFormState = (): CaptureFormState => ({
  title: '',
  body: '',
  highlightText: '',
  highlightSource: '',
  screenshotText: '',
  shareTitle: '',
  shareBody: '',
  sharedContent: {},
});

describe('buildSaveInputByChannel', () => {
  describe('note channel', () => {
    test('returns error when body is empty', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('note', state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe('본문을 입력해주세요.');
      }
    });

    test('returns input with trimmed body', () => {
      const state = { ...createEmptyFormState(), body: '  valid body  ' };
      const result = buildSaveInputByChannel('note', state);
      expect('input' in result).toBe(true);
      if ('input' in result) {
        expect(result.input.type).toBe('note');
        expect(result.input.body).toBe('valid body');
      }
    });

    test('includes title when provided', () => {
      const state = {
        ...createEmptyFormState(),
        title: '  My Title  ',
        body: 'body',
      };
      const result = buildSaveInputByChannel('note', state);
      if ('input' in result && result.input.type === 'note') {
        expect(result.input.title).toBe('My Title');
      }
    });

    test('title is undefined when empty', () => {
      const state = { ...createEmptyFormState(), body: 'body' };
      const result = buildSaveInputByChannel('note', state);
      if ('input' in result && result.input.type === 'note') {
        expect(result.input.title).toBeUndefined();
      }
    });
  });

  describe('link channel', () => {
    test('returns error when URL is empty', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('link', state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe('URL을 입력해주세요.');
      }
    });

    test('returns input with URL in body field', () => {
      const state = { ...createEmptyFormState(), body: 'https://example.com' };
      const result = buildSaveInputByChannel('link', state);
      if ('input' in result && result.input.type === 'link') {
        expect(result.input.url).toBe('https://example.com');
      }
    });
  });

  describe('highlight channel', () => {
    test('returns error when highlight text is empty', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('highlight', state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe('하이라이트 텍스트를 입력해주세요.');
      }
    });

    test('returns input with highlight text', () => {
      const state = {
        ...createEmptyFormState(),
        highlightText: '  highlighted text  ',
        highlightSource: '  source  ',
      };
      const result = buildSaveInputByChannel('highlight', state);
      if ('input' in result && result.input.type === 'highlight') {
        expect(result.input.body).toBe('highlighted text');
        expect(result.input.title).toBe('source');
      }
    });
  });

  describe('screenshot channel', () => {
    test('returns error when screenshot text is empty', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('screenshot', state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe(
          '이미지를 선택하고 텍스트를 추출해주세요.'
        );
      }
    });

    test('returns input with screenshot text', () => {
      const state = {
        ...createEmptyFormState(),
        screenshotText: 'extracted text',
      };
      const result = buildSaveInputByChannel('screenshot', state);
      if ('input' in result && result.input.type === 'screenshot') {
        expect(result.input.body).toBe('extracted text');
      }
    });
  });

  describe('share channel', () => {
    test('returns error when no shared content', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('share', state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe('공유된 내용이 없습니다.');
      }
    });

    test('returns input when shareBody is provided', () => {
      const state = { ...createEmptyFormState(), shareBody: 'shared text' };
      const result = buildSaveInputByChannel('share', state);
      if ('input' in result && result.input.type === 'share') {
        expect(result.input.body).toBe('shared text');
      }
    });

    test('returns input when sharedContent has URL', () => {
      const state = {
        ...createEmptyFormState(),
        sharedContent: { url: 'https://example.com' },
      };
      const result = buildSaveInputByChannel('share', state);
      if ('input' in result && result.input.type === 'share') {
        expect(result.input.url).toBe('https://example.com');
      }
    });

    test('returns input when sharedContent has imageUri', () => {
      const state = {
        ...createEmptyFormState(),
        sharedContent: { imageUri: 'file:///path/to/image.jpg' },
      };
      const result = buildSaveInputByChannel('share', state);
      expect('input' in result).toBe(true);
    });

    test("title is undefined when shareTitle and url are both empty", () => {
      const state = {
        ...createEmptyFormState(),
        shareBody: "some content",
        sharedContent: { imageUri: "file:///path/to/image.jpg" },
      };
      const result = buildSaveInputByChannel("share", state);
      if ("input" in result && result.input.type === "share") {
        expect(result.input.title).toBeUndefined();
      }
    });

    test('uses sharedContent URL as title when shareTitle is empty', () => {
      const state = {
        ...createEmptyFormState(),
        sharedContent: { url: 'https://example.com' },
      };
      const result = buildSaveInputByChannel('share', state);
      if ('input' in result && result.input.type === 'share') {
        expect(result.input.title).toBe('https://example.com');
      }
    });

    test('prefers shareTitle over sharedContent URL', () => {
      const state = {
        ...createEmptyFormState(),
        shareTitle: 'Custom Title',
        sharedContent: { url: 'https://example.com' },
      };
      const result = buildSaveInputByChannel('share', state);
      if ('input' in result && result.input.type === 'share') {
        expect(result.input.title).toBe('Custom Title');
      }
    });
  });

  describe('unknown channel', () => {
    test('returns error for unsupported channel', () => {
      const state = createEmptyFormState();
      const result = buildSaveInputByChannel('unknown' as KnowledgeItemType, state);
      expect('errorMessage' in result).toBe(true);
      if ('errorMessage' in result) {
        expect(result.errorMessage).toBe('지원하지 않는 채널입니다.');
      }
    });
  });
});
