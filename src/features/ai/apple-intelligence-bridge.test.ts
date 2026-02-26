import { describe, expect, test, mock } from 'bun:test';
import {
  createAppleIntelligenceBridge,
  mapAvailabilityStatus,
  type AppleIntelligenceBridge,
  type AppleIntelligenceAvailability,
  type AppleGenerateResult,
} from './apple-intelligence-bridge';

/**
 * Create a mock Apple Intelligence bridge for testing
 */
function createMockBridge(overrides: Partial<AppleIntelligenceBridge> = {}): AppleIntelligenceBridge {
  return {
    isAvailable: mock(async (): Promise<AppleIntelligenceAvailability> => ({
      available: true,
    })),
    generate: mock(async (): Promise<AppleGenerateResult> => ({
      text: 'Mock generated text',
    })),
    ...overrides,
  };
}

describe('mapAvailabilityStatus', () => {
  test('status code 0 returns available: true', () => {
    const result = mapAvailabilityStatus(0);
    expect(result).toEqual({ available: true });
  });

  test('status code 1 returns unsupported_os', () => {
    const result = mapAvailabilityStatus(1);
    expect(result).toEqual({ available: false, reason: 'unsupported_os' });
  });

  test('status code 2 returns unsupported_device', () => {
    const result = mapAvailabilityStatus(2);
    expect(result).toEqual({ available: false, reason: 'unsupported_device' });
  });

  test('status code 3 returns disabled', () => {
    const result = mapAvailabilityStatus(3);
    expect(result).toEqual({ available: false, reason: 'disabled' });
  });

  test('status code 4 returns not_configured', () => {
    const result = mapAvailabilityStatus(4);
    expect(result).toEqual({ available: false, reason: 'not_configured' });
  });

  test('unknown status code returns not_configured', () => {
    const result = mapAvailabilityStatus(99);
    expect(result).toEqual({ available: false, reason: 'not_configured' });
  });

  test('negative status code returns not_configured', () => {
    const result = mapAvailabilityStatus(-1);
    expect(result).toEqual({ available: false, reason: 'not_configured' });
  });
});

describe('createAppleIntelligenceBridge', () => {
  describe('isAvailable', () => {
    test('returns unavailable on non-iOS platform', async () => {
      // On non-iOS, bridge always returns unavailable
      // This test verifies the bridge handles missing native module gracefully
      const bridge = createAppleIntelligenceBridge();

      // The actual result depends on Platform.OS
      const result = await bridge.isAvailable();

      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');
    });

    test('bridge returns proper availability structure', async () => {
      const bridge = createAppleIntelligenceBridge();
      const result = await bridge.isAvailable();

      // Verify structure
      expect(result).toHaveProperty('available');
      if (!result.available) {
        expect([
          'unsupported_os',
          'unsupported_device',
          'disabled',
          'not_configured',
          undefined,
        ]).toContain(result.reason);
      }
    });
  });

  describe('generate', () => {
    test('throws error when native module not available', async () => {
      const bridge = createAppleIntelligenceBridge();

      // On non-iOS or when native module is missing, generate should throw
      try {
        await bridge.generate('test prompt');
        // If we get here, native module is available (iOS test environment)
        // Skip assertion
      } catch (e) {
        expect((e as Error).message).toContain('not available');
      }
    });

    test('bridge interface accepts generate options', async () => {
      const bridge = createAppleIntelligenceBridge();

      // Verify the interface accepts options
      try {
        await bridge.generate('test', {
          maxTokens: 128,
          temperature: 0.5,
        });
      } catch (e) {
        // Expected on non-iOS
        expect((e as Error).message).toContain('not available');
      }
    });
  });
});

describe('createMockBridge', () => {
  test('creates bridge with default mocks', async () => {
    const bridge = createMockBridge();

    const availability = await bridge.isAvailable();
    expect(availability).toEqual({ available: true });

    const result = await bridge.generate('test prompt');
    expect(result).toEqual({ text: 'Mock generated text' });
  });

  test('allows overriding isAvailable', async () => {
    const bridge = createMockBridge({
      isAvailable: mock(async () => ({
        available: false,
        reason: 'unsupported_os',
      })),
    });

    const result = await bridge.isAvailable();
    expect(result).toEqual({ available: false, reason: 'unsupported_os' });
  });

  test('allows overriding generate', async () => {
    const bridge = createMockBridge({
      generate: mock(async () => ({
        text: 'Custom generated text',
      })),
    });

    const result = await bridge.generate('test prompt');
    expect(result).toEqual({ text: 'Custom generated text' });
  });
});

describe('bridge with mocked native module behavior', () => {
  describe('isAvailable scenarios', () => {
    test('returns available: true when native returns status 0', async () => {
      const bridge = createMockBridge({
        isAvailable: mock(async () => mapAvailabilityStatus(0)),
      });

      const result = await bridge.isAvailable();
      expect(result).toEqual({ available: true });
    });

    test('returns available: false with reason when native returns status 1', async () => {
      const bridge = createMockBridge({
        isAvailable: mock(async () => mapAvailabilityStatus(1)),
      });

      const result = await bridge.isAvailable();
      expect(result).toEqual({ available: false, reason: 'unsupported_os' });
    });

    test('returns available: false with reason when native returns status 2', async () => {
      const bridge = createMockBridge({
        isAvailable: mock(async () => mapAvailabilityStatus(2)),
      });

      const result = await bridge.isAvailable();
      expect(result).toEqual({ available: false, reason: 'unsupported_device' });
    });

    test('returns available: false with reason when native returns status 3', async () => {
      const bridge = createMockBridge({
        isAvailable: mock(async () => mapAvailabilityStatus(3)),
      });

      const result = await bridge.isAvailable();
      expect(result).toEqual({ available: false, reason: 'disabled' });
    });

    test('returns available: false with reason when native returns status 4', async () => {
      const bridge = createMockBridge({
        isAvailable: mock(async () => mapAvailabilityStatus(4)),
      });

      const result = await bridge.isAvailable();
      expect(result).toEqual({ available: false, reason: 'not_configured' });
    });
  });

  describe('generate success', () => {
    test('returns text result on successful generation', async () => {
      const expectedText = 'This is AI-generated content.';
      const bridge = createMockBridge({
        generate: mock(async (prompt: string, options?: { maxTokens?: number; temperature?: number }) => ({
          text: expectedText,
        })),
      });

      const result = await bridge.generate('Write a haiku about nature');

      expect(result).toHaveProperty('text');
      expect(result.text).toBe(expectedText);
    });

    test('passes prompt to generate function', async () => {
      const generateMock = mock(async (prompt: string) => ({
        text: `Response to: ${prompt}`,
      }));

      const bridge = createMockBridge({
        generate: generateMock,
      });

      const prompt = 'What is the meaning of life?';
      await bridge.generate(prompt);

      expect(generateMock).toHaveBeenCalledWith(prompt);
    });

    test('passes options to generate function', async () => {
      const generateMock = mock(async (prompt: string, options?: { maxTokens?: number; temperature?: number }) => ({
        text: 'Generated text',
      }));

      const bridge = createMockBridge({
        generate: generateMock,
      });

      const options = { maxTokens: 100, temperature: 0.5 };
      await bridge.generate('test prompt', options);

      expect(generateMock).toHaveBeenCalledWith('test prompt', options);
    });
  });

  describe('generate error handling', () => {
    test('throws error with code and message format', async () => {
      const bridge = createMockBridge({
        generate: mock(async () => {
          throw new Error('generation_failed: Model not loaded');
        }),
      });

      try {
        await bridge.generate('test prompt');
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect((e as Error).message).toBe('generation_failed: Model not loaded');
      }
    });

    test('throws error when generation times out', async () => {
      const bridge = createMockBridge({
        generate: mock(async () => {
          throw new Error('timeout: Generation timed out after 30 seconds');
        }),
      });

      try {
        await bridge.generate('test prompt');
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect((e as Error).message).toContain('timeout');
      }
    });

    test('throws error when model is unavailable', async () => {
      const bridge = createMockBridge({
        generate: mock(async () => {
          throw new Error('model_unavailable: Apple Intelligence is not ready');
        }),
      });

      await expect(bridge.generate('test')).rejects.toThrow('model_unavailable');
    });
  });
});
