export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface AiProviderRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
  prompt: string;
  customUrl?: string;
}

type FetchClient = typeof fetch;

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getErrorMessage(data: any, fallback: string): string {
  return data?.error?.message || fallback;
}

function stripElectronInvokePrefix(message: string): string {
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
}

export function formatAiProviderError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = stripElectronInvokePrefix(rawMessage);
  if (!message) {
    return 'AI request failed. Please check your API key, model, and network connection.';
  }

  if (/high demand/i.test(message)) {
    return `${message} Try again in a moment or select another model/provider.`;
  }

  return message;
}

function getOpenAiText(data: any): string {
  return data.output_text || data.output?.[0]?.content?.[0]?.text || JSON.stringify(data, null, 2);
}

function getClaudeText(data: any): string {
  return data.content?.map((item: { text?: string }) => item.text).filter(Boolean).join('\n') || JSON.stringify(data, null, 2);
}

function getGeminiText(data: any): string {
  return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join('\n') || JSON.stringify(data, null, 2);
}

function getCustomText(data: any): string {
  return (
    data.output_text ||
    data.text ||
    data.response ||
    data.output ||
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.text ||
    JSON.stringify(data, null, 2)
  );
}

export async function requestAiProvider(
  config: AiProviderRequest,
  fetchClient: FetchClient = fetch
): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error('API key is required.');
  }

  if (config.provider === 'openai') {
    const response = await fetchClient('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: config.prompt,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, 'OpenAI request failed.'));
    return getOpenAiText(data);
  }

  if (config.provider === 'anthropic') {
    const response = await fetchClient('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: config.prompt }],
      }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, 'Claude request failed.'));
    return getClaudeText(data);
  }

  if (config.provider === 'custom') {
    const customUrl = config.customUrl?.trim();
    if (!customUrl) {
      throw new Error('Custom AI URL is required.');
    }

    const response = await fetchClient(customUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt: config.prompt,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, 'Custom AI request failed.'));
    return getCustomText(data);
  }

  const response = await fetchClient(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: config.prompt }] }],
    }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(getErrorMessage(data, 'Gemini request failed.'));
  return getGeminiText(data);
}
