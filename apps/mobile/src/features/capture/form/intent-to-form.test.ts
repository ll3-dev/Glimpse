import { describe, expect, test } from 'bun:test';
import { shareIntentToFormState } from './intent-to-form';

describe('shareIntentToFormState', () => {
  test('webUrl only becomes body', () => {
    expect(
      shareIntentToFormState({ webUrl: 'https://example.com' }),
    ).toEqual({ body: 'https://example.com' });
  });

  test('text only becomes body', () => {
    expect(shareIntentToFormState({ text: '공유된 텍스트' })).toEqual({
      body: '공유된 텍스트',
    });
  });

  test('text + webUrl prefers webUrl as body', () => {
    expect(
      shareIntentToFormState({
        text: 'Check this out',
        webUrl: 'https://example.com/article',
      }),
    ).toEqual({ body: 'https://example.com/article' });
  });

  test('text + title fills both body and title', () => {
    expect(
      shareIntentToFormState({ text: '공유된 텍스트', title: '공유 제목' }),
    ).toEqual({ title: '공유 제목', body: '공유된 텍스트' });
  });

  test('first file path becomes imageUri', () => {
    expect(
      shareIntentToFormState({
        files: [{ path: '/path/to/image.jpg' }],
      }),
    ).toEqual({ imageUri: '/path/to/image.jpg' });
  });

  test('empty input yields empty patch', () => {
    expect(shareIntentToFormState({})).toEqual({});
  });

  test('null fields yield empty patch', () => {
    expect(
      shareIntentToFormState({
        text: null,
        webUrl: null,
        title: null,
        files: null,
      }),
    ).toEqual({});
  });

  test('whitespace-only text does not create empty body', () => {
    expect(shareIntentToFormState({ text: '   \n\t ' })).toEqual({});
  });

  test('whitespace-only webUrl falls back to text body', () => {
    expect(
      shareIntentToFormState({ text: '공유된 텍스트', webUrl: '   ' }),
    ).toEqual({ body: '공유된 텍스트' });
  });

  test('whitespace-only title is ignored', () => {
    expect(
      shareIntentToFormState({ text: '본문', title: '   ' }),
    ).toEqual({ body: '본문' });
  });

  test('file entry without path is ignored', () => {
    expect(
      shareIntentToFormState({
        files: [undefined as unknown as { path: string }],
      }),
    ).toEqual({});
  });

  test('maps full payload at once', () => {
    expect(
      shareIntentToFormState({
        text: '함께 공유된 텍스트',
        webUrl: 'https://example.com/article',
        title: '기사 제목',
        files: [
          { path: '/path/to/first.jpg' },
          { path: '/path/to/second.jpg' },
        ],
      }),
    ).toEqual({
      title: '기사 제목',
      body: 'https://example.com/article',
      imageUri: '/path/to/first.jpg',
    });
  });
});
