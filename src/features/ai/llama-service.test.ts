/**
 * Tests for Llama Service
 *
 * Tests path validation, state management, and error handling.
 * Note: Native llama.rn module is mocked in src/test/setup.ts since it's not available in test environment.
 */

import { describe, expect, test } from 'bun:test';
import { createLlamaService } from './llama-service';

describe('createLlamaService', () => {
  describe('loadModel', () => {
    test('throws error for empty path', async () => {
      const service = createLlamaService();

      await expect(service.loadModel('')).rejects.toThrow('Model path is required');
    });

    test('throws error for non-string path', async () => {
      const service = createLlamaService();

      // @ts-expect-error - Testing invalid input
      await expect(service.loadModel(null)).rejects.toThrow('Model path is required');
    });

    test('throws error for relative path', async () => {
      const service = createLlamaService();

      await expect(service.loadModel('relative/path/model.gguf')).rejects.toThrow(
        'absolute path or file://'
      );
    });

    test('throws error for relative path starting with ./', async () => {
      const service = createLlamaService();

      await expect(service.loadModel('./model.gguf')).rejects.toThrow('absolute path or file://');
    });

    test('accepts file:// URL path', async () => {
      const service = createLlamaService();

      // Should not throw path validation error
      await service.loadModel('file:///path/to/model.gguf');

      expect(service.isModelLoaded()).toBe(true);
    });

    test('accepts absolute path', async () => {
      const service = createLlamaService();

      // Should not throw path validation error
      await service.loadModel('/absolute/path/to/model.gguf');

      expect(service.isModelLoaded()).toBe(true);
    });
  });

  describe('isModelLoaded', () => {
    test('returns false initially', () => {
      const service = createLlamaService();
      expect(service.isModelLoaded()).toBe(false);
    });

    test('returns true after successful load', async () => {
      const service = createLlamaService();
      await service.loadModel('/path/to/model.gguf');
      expect(service.isModelLoaded()).toBe(true);
    });

    test('returns false after unload', async () => {
      const service = createLlamaService();
      await service.loadModel('/path/to/model.gguf');
      expect(service.isModelLoaded()).toBe(true);

      await service.unloadModel();
      expect(service.isModelLoaded()).toBe(false);
    });
  });

  describe('generate', () => {
    test('throws error when no model loaded', async () => {
      const service = createLlamaService();

      await expect(service.generate('test prompt')).rejects.toThrow('No model loaded');
    });

    test('returns generated text with timing when model is loaded', async () => {
      const service = createLlamaService();
      await service.loadModel('/path/to/model.gguf');

      const result = await service.generate('test prompt');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokensGenerated');
      expect(result).toHaveProperty('timingMs');
      expect(typeof result.text).toBe('string');
      expect(typeof result.tokensGenerated).toBe('number');
      expect(typeof result.timingMs).toBe('number');
    });
  });

  describe('unloadModel', () => {
    test('can be called when no model is loaded', async () => {
      const service = createLlamaService();

      // Should not throw
      await service.unloadModel();
      expect(service.isModelLoaded()).toBe(false);
    });

    test('clears loaded model state', async () => {
      const service = createLlamaService();
      await service.loadModel('/path/to/model.gguf');
      expect(service.isModelLoaded()).toBe(true);

      await service.unloadModel();

      expect(service.isModelLoaded()).toBe(false);
    });
  });

  describe('multiple instances', () => {
    test('each service instance has independent state', async () => {
      const service1 = createLlamaService();
      const service2 = createLlamaService();

      expect(service1.isModelLoaded()).toBe(false);
      expect(service2.isModelLoaded()).toBe(false);

      await service1.loadModel('/path/to/model.gguf');

      expect(service1.isModelLoaded()).toBe(true);
      expect(service2.isModelLoaded()).toBe(false);
    });

    test('loading different models in different instances works independently', async () => {
      const service1 = createLlamaService();
      const service2 = createLlamaService();

      await service1.loadModel('/path/to/model1.gguf');
      await service2.loadModel('/path/to/model2.gguf');

      expect(service1.isModelLoaded()).toBe(true);
      expect(service2.isModelLoaded()).toBe(true);
    });
  });
});
