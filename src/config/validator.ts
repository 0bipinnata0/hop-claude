import type { ValidationResult } from '../types/index.js';

/**
 * 验证 API Key 是否有效
 * @param apiKey API Key
 * @param baseUrl 可选的自定义 Base URL
 * @returns 验证结果
 */
export async function validateApiKey(
  apiKey: string,
  baseUrl?: string
): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API Key cannot be empty' };
  }

  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/v1/messages`
    : 'https://api.anthropic.com/v1/messages';

  try {
    // 发送一个最小的测试请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    // 检查响应状态
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API Key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API Key does not have permission' };
    }

    // 200 或其他非错误状态都认为 API Key 有效
    if (response.ok || response.status === 400) {
      return { valid: true };
    }

    // 其他错误
    const errorText = await response.text();
    return { valid: false, error: `API request failed: ${response.status} ${errorText}` };
  } catch (error: unknown) {
    // 网络错误或其他异常
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message.includes('fetch')) {
      return { valid: false, error: 'Network error: Unable to reach API endpoint' };
    }
    return { valid: false, error: `Validation error: ${err.message}` };
  }
}
