import { describe, expect, test } from 'bun:test';
import {
  createInitialFormState,
  createInitialState,
  collectFormReducer,
} from './reducer';
import type { ReducerState, ReducerAction, SharedContent } from './types';

describe('createInitialFormState', () => {
  test('returns form state with all empty strings and empty sharedContent', () => {
    const state = createInitialFormState();
    expect(state.title).toBe('');
    expect(state.body).toBe('');
    expect(state.highlightText).toBe('');
    expect(state.highlightSource).toBe('');
    expect(state.screenshotText).toBe('');
    expect(state.shareTitle).toBe('');
    expect(state.shareBody).toBe('');
    expect(state.sharedContent).toEqual({});
  });
});

describe('createInitialState', () => {
  test('returns state with note channel and initial form', () => {
    const state = createInitialState();
    expect(state.channel).toBe('note');
    expect(state.form).toEqual(createInitialFormState());
  });
});

describe('collectFormReducer', () => {
  let state: ReducerState;

  test('set_channel resets form to initial state', () => {
    state = {
      channel: 'note',
      form: { ...createInitialFormState(), body: 'some content' },
    };

    const action: ReducerAction = { type: 'set_channel', value: 'link' };
    const newState = collectFormReducer(state, action);

    expect(newState.channel).toBe('link');
    expect(newState.form).toEqual(createInitialFormState());
  });

  test('reset_form keeps channel but resets form', () => {
    state = {
      channel: 'highlight',
      form: { ...createInitialFormState(), highlightText: 'some highlight' },
    };

    const action: ReducerAction = { type: 'reset_form' };
    const newState = collectFormReducer(state, action);

    expect(newState.channel).toBe('highlight');
    expect(newState.form).toEqual(createInitialFormState());
  });

  test('set_title updates title', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_title', value: 'New Title' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.title).toBe('New Title');
  });

  test('set_body updates body', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_body', value: 'New body content' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.body).toBe('New body content');
  });

  test('set_highlight_text updates highlightText', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_highlight_text', value: 'Highlighted' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.highlightText).toBe('Highlighted');
  });

  test('set_highlight_source updates highlightSource', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_highlight_source', value: 'Source' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.highlightSource).toBe('Source');
  });

  test('set_screenshot_text updates screenshotText', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_screenshot_text', value: 'OCR text' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.screenshotText).toBe('OCR text');
  });

  test('set_share_title updates shareTitle', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_share_title', value: 'Share Title' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.shareTitle).toBe('Share Title');
  });

  test('set_share_body updates shareBody', () => {
    state = createInitialState();
    const action: ReducerAction = { type: 'set_share_body', value: 'Share body' };
    const newState = collectFormReducer(state, action);
    expect(newState.form.shareBody).toBe('Share body');
  });

  describe('apply_share_intent', () => {
    test('sets channel to share', () => {
      state = createInitialState();
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent: { text: 'shared' },
      };
      const newState = collectFormReducer(state, action);
      expect(newState.channel).toBe('share');
    });

    test('applies sharedContent', () => {
      state = createInitialState();
      const sharedContent: SharedContent = {
        text: 'Shared text',
        url: 'https://example.com',
        imageUri: 'file:///image.jpg',
      };
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent,
      };
      const newState = collectFormReducer(state, action);
      expect(newState.form.sharedContent).toEqual(sharedContent);
    });

    test('applies shareText to shareBody', () => {
      state = createInitialState();
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent: {},
        shareText: 'Text from share',
      };
      const newState = collectFormReducer(state, action);
      expect(newState.form.shareBody).toBe('Text from share');
    });

    test('applies shareUrl to shareTitle', () => {
      state = createInitialState();
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent: {},
        shareUrl: 'https://example.com',
      };
      const newState = collectFormReducer(state, action);
      expect(newState.form.shareTitle).toBe('https://example.com');
    });

    test('handles missing shareText and shareUrl', () => {
      state = createInitialState();
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent: { url: 'https://example.com' },
      };
      const newState = collectFormReducer(state, action);
      expect(newState.form.shareBody).toBe('');
      expect(newState.form.shareTitle).toBe('');
    });

    test('preserves existing form state while updating sharedContent', () => {
      state = {
        channel: 'note',
        form: {
          ...createInitialFormState(),
          title: 'Existing Title',
          body: 'Existing Body',
        },
      };
      const action: ReducerAction = {
        type: 'apply_share_intent',
        sharedContent: { text: 'New shared' },
        shareText: 'New text',
      };
      const newState = collectFormReducer(state, action);
      // Form should have new values
      expect(newState.form.sharedContent.text).toBe('New shared');
      expect(newState.form.shareBody).toBe('New text');
      // Channel should change
      expect(newState.channel).toBe('share');
    });
  });

  test('returns unchanged state for unknown action', () => {
    state = createInitialState();
    const action = { type: 'unknown_action' } as unknown as ReducerAction;
    const newState = collectFormReducer(state, action);
    expect(newState).toEqual(state);
  });
});
