/**
 * Local LLM provider — shared on-box inference via Ollama (v2.3.42).
 *
 * WHAT: the Hetzner host runs a shared Ollama service (127.0.0.1:11434,
 * `gemma-4-heretic`, keep-alive 24h) that sibling projects already use for
 * local inference. fwber's AI features (wingman, roasts, narrative reports)
 * previously required cloud keys (NVIDIA/OpenRouter/OpenAI) and silently died
 * without them. This module makes the local model a first-class provider so
 * the features work with ZERO cloud configuration, and survive cloud outages.
 *
 * DESIGN:
 * - OpenAI-compatible endpoint: Ollama exposes `/v1/chat/completions`, so the
 *   existing `openai` SDK works unchanged against it.
 * - Used as the LAST fallback when cloud providers are missing/failing (cloud
 *   models are higher quality when available), or FIRST when
 *   `AI_PREFER_LOCAL=true` (zero-cost operation / privacy-sensitive setups).
 * - Config via env — the service is opt-in per deployment:
 *     OLLAMA_BASE_URL   e.g. http://127.0.0.1:11434 (unset = disabled)
 *     OLLAMA_MODEL      default gemma-4-heretic
 *     OLLAMA_API_KEY    optional; Ollama ignores auth, SDK requires non-empty
 *     AI_PREFER_LOCAL   "true" = try local before cloud providers
 *
 * CONTENT NOTE: the shared model is deliberately uncensored; prompt design is
 * the safety layer (see the system prompts in wingman-ai.ts which constrain
 * tone, e.g. "roast with love", "never mean-spirited"). If the deployment ever
 * serves minors or unmoderated content, put a moderation pass in front of it.
 */
import OpenAI from 'openai';

/** Whether a local model endpoint is configured. */
export function isLocalLlmConfigured(): boolean {
  return Boolean(process.env.OLLAMA_BASE_URL);
}

/** Model tag on the local Ollama instance. */
export function localLlmModel(): string {
  return process.env.OLLAMA_MODEL || 'gemma-4-heretic';
}

let localClient: OpenAI | null = null;

/**
 * OpenAI-SDK client bound to the local Ollama `/v1` endpoint.
 * Returns null when `OLLAMA_BASE_URL` is unset.
 */
export function getLocalLlm(): OpenAI | null {
  if (!isLocalLlmConfigured()) return null;
  if (localClient) return localClient;

  const baseUrl = (process.env.OLLAMA_BASE_URL || '').replace(/\/+$/, '');
  localClient = new OpenAI({
    // Ollama does not authenticate; the SDK rejects an empty key so we pass a
    // placeholder. Never sent anywhere except loopback.
    apiKey: process.env.OLLAMA_API_KEY || 'ollama',
    baseURL: `${baseUrl}/v1`,
  });
  return localClient;
}

/**
 * One-shot chat completion against the local model.
 * Returns trimmed text, or '' on any failure (callers treat '' as "provider
 * unavailable" and continue down their fallback chain).
 */
export async function localChatCompletion(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string> {
  const client = getLocalLlm();
  if (!client) return '';

  const { temperature = 0.9, maxTokens = 800, timeoutMs = 30000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await client.chat.completions.create(
      {
        model: localLlmModel(),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      { signal: controller.signal }
    );
    return resp.choices[0]?.message?.content?.trim() || '';
  } catch (err: any) {
    console.error('[AI] Local LLM failed:', err?.message);
    return '';
  } finally {
    clearTimeout(timer);
  }
}
