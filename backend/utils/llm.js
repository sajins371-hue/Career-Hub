/**
 * Single swappable LLM entry point. Every AI-assisted feature in this app calls
 * through here so there's exactly one place a real provider is wired.
 *
 * Provider order:
 *   1. LLM_BASE_URL  — any OpenAI-compatible endpoint (Google Gemini free tier, Ollama on your
 *                      own machine, Groq, OpenRouter, ...). Key is optional (Ollama needs none).
 *   2. ANTHROPIC_API_KEY
 *   3. OPENAI_API_KEY
 * With none configured it returns a clearly-labeled stub string, so every endpoint that calls
 * this still returns a valid response end-to-end in dev/test without a key.
 *
 * Uses the global `fetch` (Node 18+, matching this project's other runtime assumptions)
 * rather than adding an SDK dependency.
 */
async function callLLM(prompt) {
  if (process.env.LLM_BASE_URL) {
    return callOpenAICompatible({
      baseUrl: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      label: 'LLM provider',
      maxTokens: Number(process.env.LLM_MAX_TOKENS) || 2000, // headroom: some models spend tokens "thinking"
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 60000 // local models can be slow
    }, prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAICompatible({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      label: 'OpenAI',
      maxTokens: 1200
    }, prompt);
  }
  return `[AI integration not configured] Prompt was:\n${prompt.slice(0, 300)}...`;
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function callAnthropic(prompt) {
  const resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Anthropic API error ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();
  return (data.content || [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim();
}

// Works for OpenAI itself and for any service that copies its /chat/completions API.
async function callOpenAICompatible({ baseUrl, apiKey, model, label, maxTokens, timeoutMs }, prompt) {
  if (!model) throw new Error(`${label}: model name is not set (LLM_MODEL)`);
  const resp = await fetchWithTimeout(`${String(baseUrl).replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { Authorization: `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  }, timeoutMs);

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`${label} error ${resp.status}: ${errBody.slice(0, 300)}`);
  }


  const data = await resp.json();
  const content = (data.choices?.[0]?.message?.content || '').trim();

  console.info(`[LLM] ${label} request succeeded (model: ${model})`);

  return content;
}

/** True if an LLM provider key is configured, so callers can choose heuristic-only
 * behavior instead of call-and-catch every time. */
function isLLMConfigured() {
  return !!(process.env.LLM_BASE_URL || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

module.exports = { callLLM, isLLMConfigured };
