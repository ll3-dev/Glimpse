/**
 * Test BYOK Connection
 *
 * Verifies whether the provided API key and Base URL are working correctly
 * by sending a minimal test request to the specified provider endpoint.
 */

import type { BYOKProviderType } from '@/src/stores/settings/byok.store';
import {
  DEFAULT_OPENAI_BASE_URL,
  getDefaultByokModel,
  normalizeBaseUrl,
} from '@/src/features/settings/byok.defaults';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export async function testBYOKConnection(params: {
  provider: BYOKProviderType;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
}): Promise<TestConnectionResult> {
  const { provider, apiKey, baseUrl, model } = params;

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    return {
      success: false,
      message: 'API 키를 입력해주세요.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let url: string;
    let headers: Record<string, string>;
    let body: string;

    if (provider === 'openai') {
      const activeBase = normalizeBaseUrl(baseUrl) || DEFAULT_OPENAI_BASE_URL;
      const activeModel = model?.trim() || getDefaultByokModel('openai');
      url = `${activeBase}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`,
      };
      body = JSON.stringify({
        model: activeModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });
    } else if (provider === 'anthropic') {
      const activeModel = model?.trim() || getDefaultByokModel('anthropic');
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01',
      };
      body = JSON.stringify({
        model: activeModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });
    } else {
      // google
      const activeModel = model?.trim() || getDefaultByokModel('google');
      url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${trimmedKey}`;
      headers = {
        'Content-Type': 'application/json',
      };
      body = JSON.stringify({
        contents: [{ parts: [{ text: 'hi' }] }],
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        } else if (parsed.message) {
          errorMsg = parsed.message;
        }
      } catch {
        if (errorText) errorMsg = errorText.slice(0, 100);
      }

      return {
        success: false,
        message: `연결 실패 (${errorMsg})`,
      };
    }

    return {
      success: true,
      message: `연결 성공! (${latencyMs}ms)`,
      latencyMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      message: isTimeout
        ? '연결 시간 초과 (네트워크 상태를 확인해주세요)'
        : `연결 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
