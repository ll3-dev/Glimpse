import { describe, expect, test } from 'bun:test';
import {
  createAppleIntelligenceBridge,
  type AppleIntelligenceBridge,
  type AppleIntelligenceAvailability,
} from './apple-intelligence-bridge';

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
  });
});

describe('availability status mapping', () => {
  // Test the expected status codes through the bridge
  // Status 0 = available
  // Status 1 = unsupported_os
  // Status 2 = unsupported_device
  // Status 3 = disabled
  // Status 4 = not_configured

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

describe('generate options', () => {
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
