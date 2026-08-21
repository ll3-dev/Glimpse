import { describe, expect, test } from 'bun:test';
import { createLlamaService } from './llama-service.factory.web';

describe('web llama service', () => {
  test('does not require a native module during import', async () => {
    const service = createLlamaService();

    expect(service.isModelLoaded()).toBe(false);
    expect(service.loadModel('/model.gguf')).rejects.toThrow('native Glimpse app');
    await service.stopGeneration();
    await service.unloadModel();
  });
});
