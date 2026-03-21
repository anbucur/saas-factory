const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_MODEL = 'MiniMax-M2.7';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  tokensUsed: number;
}

let _runtimeApiKey: string | null = null;

export function setRuntimeApiKey(key: string | null): void {
  _runtimeApiKey = key;
}

export function getRuntimeApiKey(): string | null {
  return _runtimeApiKey;
}

export async function callLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<LLMResponse> {
  const apiKey = _runtimeApiKey || process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    // Fallback to template-based responses when no API key
    return generateFallbackResponse(systemPrompt, messages);
  }

  const { maxTokens = 4096, temperature = 0.7 } = options;

  const doFetch = () => fetch(MINIMAX_API_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(180_000), // 3 minute timeout — MiniMax M2.7 reasoning can be slow
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  try {
    let response: Response;
    try {
      response = await doFetch();
    } catch (firstErr: any) {
      // Retry once on timeout before giving up
      if (firstErr?.name === 'TimeoutError' || firstErr?.name === 'AbortError') {
        console.warn('[LLM] Request timed out, retrying once...');
        response = await doFetch();
      } else {
        throw firstErr;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] API error: ${response.status} - ${errorText}`);
      return generateFallbackResponse(systemPrompt, messages);
    }

    const data = await response.json() as any;
    
    // Check for API-level errors (even if HTTP status is 200)
    if (!data.choices || data.choices.length === 0) {
      const errorMsg = data.base_resp?.status_msg || 'Unknown API Error';
      console.error(`[LLM] API Error: ${errorMsg}`);
      if (systemPrompt.includes('system health check')) {
         throw new Error(`MiniMax API Error: ${errorMsg}`);
      }
      return generateFallbackResponse(systemPrompt, messages);
    }

    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return { content, tokensUsed };
  } catch (error) {
    console.error('[LLM] Request failed:', error);
    return generateFallbackResponse(systemPrompt, messages);
  }
}

function generateFallbackResponse(systemPrompt: string, messages: LLMMessage[]): LLMResponse {
  throw new Error(
    'LLM API key not configured. Set MINIMAX_API_KEY environment variable or configure API key in Settings. ' +
    'Agent cannot generate response without LLM access.'
  );
}
