/**
 * Tests for Llama Service
 *
 * Tests path validation, state management, and error handling.
 * Note: Native llama.rn module is mocked in src/test/setup.ts since it's not available in test environment.
 */

import { describe, expect, mock, test } from 'bun:test';
import { createLlamaService } from './llama-service';

describe('createLlamaService', () => {
  describe('loadModel', () => {
    test('throws error for empty path', async () => {
      const service = createLlamaService();

      await expect(service.loadModel('')).rejects.toThrow('Model path is required');
    });

    test('throws error for non-string path', async () => {
      const service = createLlamaService();

      await expect(service.loadModel(null as unknown as string)).rejects.toThrow('Model path is required');
    });

    test('throws error for relative path', async () => {
      const service = createLlamaService();

      // Note: Error message partial match is intentional for flexibility
      // The full error message includes the received path for debugging
      await expect(service.loadModel('relative/path/model.gguf')).rejects.toThrow(
        'absolute path or file://'
      );
    });

    test('throws error for relative path starting with ./', async () => {
      const service = createLlamaService();

      // Note: Error message partial match is intentional for flexibility
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

    test('passes default options to initLlama when no options provided', async () => {
      // Create a mock that captures options
      const capturedOptions: Record<string, unknown>[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async (options: Record<string, unknown>) => {
          capturedOptions.push(options);
          return {
            completion: mock(async () => ({
              text: 'Generated text',
              tokens_evaluated: 10,
            })),
            release: mock(async () => {}),
          };
        }),
      }));

      // Re-import to use the new mock
      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toMatchObject({
        model: '/path/to/model.gguf',
        use_mlock: false,
        n_ctx: 2048,
        n_gpu_layers: 0,
      });
    });

    test('passes custom options to initLlama', async () => {
      // Create a mock that captures options
      const capturedOptions: Record<string, unknown>[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async (options: Record<string, unknown>) => {
          capturedOptions.push(options);
          return {
            completion: mock(async () => ({
              text: 'Generated text',
              tokens_evaluated: 10,
            })),
            release: mock(async () => {}),
          };
        }),
      }));

      // Re-import to use the new mock
      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf', {
        contextSize: 4096,
        gpuLayers: 32,
        useMlock: false,
      });

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toMatchObject({
        model: '/path/to/model.gguf',
        use_mlock: false,
        n_ctx: 4096,
        n_gpu_layers: 32,
      });
    });

    test('releases existing context before loading new model', async () => {
      const releaseCalls: string[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async () => ({
            text: 'Generated text',
            tokens_evaluated: 10,
          })),
          release: mock(async () => {
            releaseCalls.push('released');
          }),
        })),
      }));

      // Re-import to use the new mock
      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      // Load first model
      await service.loadModel('/path/to/model1.gguf');
      expect(service.isModelLoaded()).toBe(true);
      expect(releaseCalls).toHaveLength(0);

      // Load second model - should release first
      await service.loadModel('/path/to/model2.gguf');
      expect(service.isModelLoaded()).toBe(true);
      expect(releaseCalls).toHaveLength(1);
    });

    test('retries with smaller context when initial load fails', async () => {
      const capturedOptions: Record<string, unknown>[] = [];

      mock.module('llama.rn', () => ({
        initLlama: mock(async (options: Record<string, unknown>) => {
          capturedOptions.push(options);

          if (capturedOptions.length === 1) {
            throw new Error('load failed');
          }

          return {
            completion: mock(async () => ({
              text: 'Generated text',
              tokens_evaluated: 10,
            })),
            stopCompletion: mock(async () => {}),
            release: mock(async () => {}),
          };
        }),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');

      expect(capturedOptions).toHaveLength(2);
      expect(capturedOptions[0]?.use_mlock).toBe(false);
      expect(capturedOptions[1]?.use_mlock).toBe(false);
      expect(service.isModelLoaded()).toBe(true);
    });

    test('retries with smaller context sizes when model load keeps failing', async () => {
      const capturedOptions: Record<string, unknown>[] = [];

      mock.module('llama.rn', () => ({
        initLlama: mock(async (options: Record<string, unknown>) => {
          capturedOptions.push(options);

          if (capturedOptions.length < 2) {
            throw new Error('Failed to load model');
          }

          return {
            completion: mock(async () => ({
              text: 'Generated text',
              tokens_evaluated: 10,
            })),
            stopCompletion: mock(async () => {}),
            release: mock(async () => {}),
          };
        }),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf', {
        contextSize: 4096,
      });

      expect(capturedOptions[0]?.n_ctx).toBe(4096);
      expect(capturedOptions[1]?.n_ctx).toBe(2048);
      expect(service.isModelLoaded()).toBe(true);
    });

    test('falls back to CPU after exhausting Metal load candidates', async () => {
      const capturedOptions: Record<string, unknown>[] = [];

      mock.module('llama.rn', () => ({
        initLlama: mock(async (options: Record<string, unknown>) => {
          capturedOptions.push(options);

          if (options.n_gpu_layers !== 0) {
            throw new Error('Metal allocation failed');
          }

          return {
            completion: mock(async () => ({
              text: 'Generated text',
              tokens_evaluated: 10,
            })),
            stopCompletion: mock(async () => {}),
            release: mock(async () => {}),
          };
        }),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf', {
        contextSize: 4096,
        gpuLayers: -1,
      });

      expect(capturedOptions.map((options) => options.n_gpu_layers)).toEqual([-1, -1, -1, 0]);
      expect(capturedOptions.at(-1)?.flash_attn_type).toBeUndefined();
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

      // Note: Error message partial match is intentional
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

    test('passes default generation options when none provided', async () => {
      const capturedOptions: Record<string, unknown>[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async (options: Record<string, unknown>) => {
            capturedOptions.push(options);
            return {
              text: 'Generated text',
              tokens_evaluated: 10,
            };
          }),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      await service.generate('test prompt');

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toMatchObject({
        prompt: 'test prompt',
        n_predict: 256,
        temperature: 0.7,
        top_p: 0.9,
      });
      // Should have default stop tokens
      expect(capturedOptions[0].stop).toBeInstanceOf(Array);
    });

    test('passes structured messages through the GGUF Jinja chat template', async () => {
      const capturedOptions: Record<string, unknown>[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async (options: Record<string, unknown>) => {
            capturedOptions.push(options);
            return {
              text: 'Generated text',
              tokens_evaluated: 10,
            };
          }),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      await service.generate({
        messages: [
          { role: 'system', content: '한국어로 답하세요.' },
          { role: 'user', content: '안녕' },
        ],
        enableThinking: false,
      });

      expect(capturedOptions[0]).toMatchObject({
        messages: [
          { role: 'system', content: '한국어로 답하세요.' },
          { role: 'user', content: '안녕' },
        ],
        jinja: true,
        enable_thinking: false,
      });
      expect(capturedOptions[0]).not.toHaveProperty('prompt');
    });

    test('passes custom generation options', async () => {
      const capturedOptions: Record<string, unknown>[] = [];
      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async (options: Record<string, unknown>) => {
            capturedOptions.push(options);
            return {
              text: 'Generated text',
              tokens_evaluated: 10,
            };
          }),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      await service.generate('test prompt', {
        maxTokens: 512,
        temperature: 0.5,
        topP: 0.8,
        stopTokens: ['<|end|>', 'STOP'],
      });

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toMatchObject({
        prompt: 'test prompt',
        n_predict: 512,
        temperature: 0.5,
        top_p: 0.8,
        stop: ['<|end|>', 'STOP'],
      });
    });

    test('throws error when generation fails after model load', async () => {
      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async () => {
            throw new Error('GPU out of memory');
          }),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      expect(service.isModelLoaded()).toBe(true);

      // Note: Error message partial match is intentional for flexibility
      // The actual error is wrapped with context: "Generation failed: GPU out of memory"
      await expect(service.generate('test prompt')).rejects.toThrow('Generation failed');
    });
  });

  describe('generateStream', () => {
    test('streams with completion callback when queueCompletion is unavailable', async () => {
      const streamedTokens: string[] = [];

      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async (_options: Record<string, unknown>, onToken?: (data: { token?: string }) => void) => {
            onToken?.({ token: '안녕' });
            onToken?.({ token: '!' });
            return {
              text: '안녕!',
              tokens_evaluated: 2,
            };
          }),
          stopCompletion: mock(async () => {}),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      const result = await service.generateStream('test prompt', {
        onToken: (token) => streamedTokens.push(token),
      });

      expect(result.text).toBe('안녕!');
      expect(streamedTokens).toEqual(['안녕', '!']);
    });

    test('emits stream-token and stream-done events to event subscribers', async () => {
      const { subscribeStreamToken, subscribeStreamDone, streamEventHub } = await import('./stream-events');
      streamEventHub.clear();

      const receivedTokens: { requestId: string; token: string }[] = [];
      const receivedDones: { requestId: string; fullText: string }[] = [];

      const unToken = subscribeStreamToken((payload) => {
        receivedTokens.push(payload);
      });
      const unDone = subscribeStreamDone((payload) => {
        receivedDones.push(payload);
      });

      mock.module('llama.rn', () => ({
        initLlama: mock(async () => ({
          completion: mock(async (_options: Record<string, unknown>, onToken?: (data: { token?: string }) => void) => {
            onToken?.({ token: 'A' });
            onToken?.({ token: 'B' });
            return {
              text: 'AB',
              tokens_evaluated: 2,
            };
          }),
          stopCompletion: mock(async () => {}),
          release: mock(async () => {}),
        })),
      }));

      const { createLlamaService: createService } = await import('./llama-service');
      const service = createService();

      await service.loadModel('/path/to/model.gguf');
      const result = await service.generateStream('test prompt', {
        requestId: 'req-custom-1',
      });

      expect(result.text).toBe('AB');
      expect(receivedTokens).toEqual([
        { requestId: 'req-custom-1', token: 'A' },
        { requestId: 'req-custom-1', token: 'B' },
      ]);
      expect(receivedDones).toEqual([
        { requestId: 'req-custom-1', fullText: 'AB', stopReason: 'completed' },
      ]);

      unToken();
      unDone();
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
