import { describe, expect, it } from 'vitest';
import { formatAiProviderError, requestAiProvider, type AiProviderRequest } from './aiProvider';

const baseRequest: AiProviderRequest = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: 'test-key',
  prompt: 'hello',
};

describe('requestAiProvider', () => {
  it('calls OpenAI Responses API with bearer auth and parses output text', async () => {
    let requestedUrl = '';
    let requestedHeaders: HeadersInit | undefined;
    let requestedBody = '';
    const fetchClient = async (url: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers;
      requestedBody = String(init?.body);
      return (
      new Response(JSON.stringify({ output_text: 'TodoFlow AI config OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      );
    };

    await expect(requestAiProvider(baseRequest, fetchClient)).resolves.toBe('TodoFlow AI config OK');
    expect(requestedUrl).toBe('https://api.openai.com/v1/responses');
    expect(requestedHeaders).toEqual({ Authorization: 'Bearer test-key', 'Content-Type': 'application/json' });
    expect(JSON.parse(requestedBody)).toEqual({ model: 'gpt-4.1-mini', input: 'hello' });
  });

  it('throws provider API error messages from failed responses', async () => {
    const fetchClient = async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(requestAiProvider(baseRequest, fetchClient)).rejects.toThrow('Invalid API key');
  });

  it('requires an API key before making provider requests', async () => {
    let called = false;
    const fetchClient = async () => {
      called = true;
      return new Response('{}');
    };

    await expect(requestAiProvider({ ...baseRequest, apiKey: ' ' }, fetchClient)).rejects.toThrow('API key is required.');
    expect(called).toBe(false);
  });

  it('calls Claude Messages API with Anthropic headers and parses text content', async () => {
    let requestedUrl = '';
    let requestedHeaders: HeadersInit | undefined;
    let requestedBody = '';
    const fetchClient = async (url: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers;
      requestedBody = String(init?.body);
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'TodoFlow AI config OK' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await expect(
      requestAiProvider(
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: 'claude-key', prompt: 'hello' },
        fetchClient
      )
    ).resolves.toBe('TodoFlow AI config OK');
    expect(requestedUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(requestedHeaders).toEqual({
      'x-api-key': 'claude-key',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestedBody)).toEqual({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: 'hello' }],
    });
  });

  it('calls Gemini generateContent with the AI Studio API key header and parses text', async () => {
    let requestedUrl = '';
    let requestedHeaders: HeadersInit | undefined;
    let requestedBody = '';
    const fetchClient = async (url: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers;
      requestedBody = String(init?.body);
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'TodoFlow AI config OK' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await expect(
      requestAiProvider(
        { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'studio-key', prompt: 'hello' },
        fetchClient
      )
    ).resolves.toBe('TodoFlow AI config OK');
    expect(requestedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(requestedHeaders).toEqual({ 'x-goog-api-key': 'studio-key', 'Content-Type': 'application/json' });
    expect(JSON.parse(requestedBody)).toEqual({ contents: [{ parts: [{ text: 'hello' }] }] });
  });

  it('calls a custom AI endpoint with bearer auth and parses text', async () => {
    let requestedUrl = '';
    let requestedHeaders: HeadersInit | undefined;
    let requestedBody = '';
    const fetchClient = async (url: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers;
      requestedBody = String(init?.body);
      return new Response(JSON.stringify({ text: 'Custom TodoFlow response' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await expect(
      requestAiProvider(
        {
          provider: 'custom',
          model: 'dailyflow-todoflow-v1',
          apiKey: 'custom-key',
          prompt: 'hello',
          customUrl: 'https://ai.example.test/todoflow',
        },
        fetchClient
      )
    ).resolves.toBe('Custom TodoFlow response');
    expect(requestedUrl).toBe('https://ai.example.test/todoflow');
    expect(requestedHeaders).toEqual({ Authorization: 'Bearer custom-key', 'Content-Type': 'application/json' });
    expect(JSON.parse(requestedBody)).toEqual({ model: 'dailyflow-todoflow-v1', prompt: 'hello' });
  });

  it('stringifies custom provider object outputs instead of returning non-string values', async () => {
    const fetchClient = async () =>
      new Response(JSON.stringify({ output: { text: 'Nested custom response' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(
      requestAiProvider(
        {
          provider: 'custom',
          model: 'dailyflow-todoflow-v1',
          apiKey: 'custom-key',
          prompt: 'hello',
          customUrl: 'https://ai.example.test/todoflow',
        },
        fetchClient
      )
    ).resolves.toBe(JSON.stringify({ text: 'Nested custom response' }, null, 2));
  });
});

describe('formatAiProviderError', () => {
  it('removes Electron invoke prefixes and adds high-demand guidance', () => {
    const error = new Error(
      "Error invoking remote method 'ai-request': Error: This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
    );

    expect(formatAiProviderError(error)).toBe(
      'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later. Try again in a moment or select another model/provider.'
    );
  });

  it('falls back to a clear generic message for unknown errors', () => {
    expect(formatAiProviderError(null)).toBe('AI request failed. Please check your API key, model, and network connection.');
  });
});
