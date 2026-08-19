import { describe, test, expect, afterEach } from 'bun:test';
import { runOcr } from './ocr-service';

const original = (globalThis as Record<string, unknown>).__glimpseOcr;

describe('runOcr', () => {
  afterEach(() => {
    (globalThis as Record<string, unknown>).__glimpseOcr = original;
  });

  test('returns error outcome when OCR module is unavailable', async () => {
    delete (globalThis as Record<string, unknown>).__glimpseOcr;
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('error');
  });

  test('returns ok with extracted text on success', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => ({
        text: '인식된 텍스트',
        confidence: 0.9,
        language: 'ko',
      }),
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') expect(outcome.text).toBe('인식된 텍스트');
  });

  test('returns no_text when confidence is below threshold', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => ({
        text: '흐릿한 텍스트',
        confidence: 0.2,
        language: 'ko',
      }),
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('no_text');
  });

  test('returns no_text when recognized text is empty', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => ({ text: '   ', confidence: 0.9, language: 'ko' }),
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('no_text');
  });

  test('returns error outcome when native call rejects', async () => {
    (globalThis as Record<string, unknown>).__glimpseOcr = {
      recognizeText: async () => {
        throw { code: 'FAILED', message: 'engine error' };
      },
    };
    const outcome = await runOcr('file:///tmp/x.png');
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.message).toBe('engine error');
    }
  });
});
