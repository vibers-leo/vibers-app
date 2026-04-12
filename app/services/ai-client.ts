import * as SecureStore from "expo-secure-store";

export type Provider = "claude" | "gemini" | "groq" | "openai";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  id: Provider;
  name: string;
  models: { id: string; name: string }[];
  keyPlaceholder: string;
  keyHint: string;
  free: boolean;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini",
    name: "Gemini (Google)",
    models: [
      { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash (최신, 무료)" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (무료)" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (무료)" },
    ],
    keyPlaceholder: "AIza...",
    keyHint: "aistudio.google.com에서 무료 발급",
    free: true,
  },
  {
    id: "groq",
    name: "Groq (초고속 무료)",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" },
    ],
    keyPlaceholder: "gsk_...",
    keyHint: "console.groq.com에서 무료 발급",
    free: true,
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    models: [
      { id: "gpt-4o", name: "GPT-4o (최신)" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini (빠름)" },
    ],
    keyPlaceholder: "sk-...",
    keyHint: "platform.openai.com에서 발급",
    free: false,
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 (빠름)" },
    ],
    keyPlaceholder: "sk-ant-...",
    keyHint: "console.anthropic.com에서 발급",
    free: false,
  },
];

export const STORE_KEYS = {
  provider: "ai_provider",
  model: "ai_model",
  claudeKey: "api_key_claude",
  geminiKey: "api_key_gemini",
  groqKey: "api_key_groq",
  openaiKey: "api_key_openai",
  englishMode: "english_mode",
  ttsEnabled: "tts_enabled",
  systemPrompt: "system_prompt",
  ttsVoice: "tts_voice",
};

export async function loadSettings() {
  const [provider, model, claudeKey, geminiKey, groqKey, openaiKey, englishMode, ttsEnabled, systemPrompt, ttsVoice] =
    await Promise.all([
      SecureStore.getItemAsync(STORE_KEYS.provider),
      SecureStore.getItemAsync(STORE_KEYS.model),
      SecureStore.getItemAsync(STORE_KEYS.claudeKey),
      SecureStore.getItemAsync(STORE_KEYS.geminiKey),
      SecureStore.getItemAsync(STORE_KEYS.groqKey),
      SecureStore.getItemAsync(STORE_KEYS.openaiKey),
      SecureStore.getItemAsync(STORE_KEYS.englishMode),
      SecureStore.getItemAsync(STORE_KEYS.ttsEnabled),
      SecureStore.getItemAsync(STORE_KEYS.systemPrompt),
      SecureStore.getItemAsync(STORE_KEYS.ttsVoice),
    ]);
  return {
    provider: (provider as Provider) || "gemini",
    model: model || "gemini-2.0-flash-lite",
    claudeKey: claudeKey || "",
    geminiKey: geminiKey || "",
    groqKey: groqKey || "",
    openaiKey: openaiKey || "",
    englishMode: englishMode === "true",
    ttsEnabled: ttsEnabled !== "false",
    systemPrompt: systemPrompt || "",
    ttsVoice: ttsVoice || "ko-female",
  };
}

export function getKeyForProvider(
  provider: Provider,
  keys: { claudeKey: string; geminiKey: string; groqKey: string; openaiKey: string }
): string {
  switch (provider) {
    case "claude": return keys.claudeKey;
    case "gemini": return keys.geminiKey;
    case "groq": return keys.groqKey;
    case "openai": return keys.openaiKey;
  }
}

// ── 비스트리밍 (호환용) ──

export async function sendMessage(
  messages: AIMessage[],
  provider: Provider,
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
  let result = "";
  await sendMessageStream(messages, provider, model, apiKey, systemPrompt, (chunk) => {
    result += chunk;
  });
  return result;
}

// ── 스트리밍 전송 ──

export async function sendMessageStream(
  messages: AIMessage[],
  provider: Provider,
  model: string,
  apiKey: string,
  systemPrompt: string | undefined,
  onChunk: (text: string) => void
): Promise<void> {
  switch (provider) {
    case "claude":
      return streamClaude(messages, model, apiKey, systemPrompt, onChunk);
    case "gemini":
      return fallbackNonStream(() => sendGemini(messages, model, apiKey, systemPrompt), onChunk);
    case "groq":
      return streamOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        messages, model, apiKey, systemPrompt, onChunk
      );
    case "openai":
      return streamOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        messages, model, apiKey, systemPrompt, onChunk
      );
  }
}

async function fallbackNonStream(
  fn: () => Promise<string>,
  onChunk: (text: string) => void
): Promise<void> {
  const text = await fn();
  onChunk(text);
}

// ── Claude 스트리밍 (SSE) ──

async function streamClaude(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  systemPrompt: string | undefined,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      system: systemPrompt || "You are a helpful coding assistant for vibe coding.",
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude 오류 ${res.status}`);
  }
  await parseSSE(res, (event, data) => {
    if (event === "content_block_delta" && data?.delta?.text) {
      onChunk(data.delta.text);
    }
  });
}

// ── OpenAI 호환 스트리밍 (Groq, OpenAI) ──

async function streamOpenAICompatible(
  url: string,
  messages: AIMessage[],
  model: string,
  apiKey: string,
  systemPrompt: string | undefined,
  onChunk: (text: string) => void
): Promise<void> {
  const msgs = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...messages]
    : messages;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: msgs, max_tokens: 2048, stream: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const name = url.includes("groq") ? "Groq" : "OpenAI";
    throw new Error(err?.error?.message || `${name} 오류 ${res.status}`);
  }
  await parseSSE(res, (_event, data) => {
    const delta = data?.choices?.[0]?.delta?.content;
    if (delta) onChunk(delta);
  });
}

// ── Gemini 비스트리밍 ──

async function sendGemini(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: any = { contents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  const apiVersion = model.includes("preview") || model.includes("2.5") ? "v1beta" : "v1";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini 오류 ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ── SSE 파서 (RN fetch 호환 — 텍스트 전체 수신 후 파싱) ──

async function parseSSE(
  res: Response,
  onEvent: (event: string, data: any) => void
): Promise<void> {
  const text = await res.text();
  let currentEvent = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break;
      try {
        const data = JSON.parse(raw);
        onEvent(currentEvent, data);
      } catch {
        // JSON 파싱 실패 무시
      }
    }
  }
}
