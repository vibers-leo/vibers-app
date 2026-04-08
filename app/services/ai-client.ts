import * as SecureStore from "expo-secure-store";

export type Provider = "claude" | "gemini" | "groq";

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
  {
    id: "gemini",
    name: "Gemini (Google)",
    models: [
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite (무료)" },
      { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash (무료)" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (무료)" },
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
};

export async function loadSettings() {
  const [provider, model, claudeKey, geminiKey, groqKey, openaiKey, englishMode, ttsEnabled] =
    await Promise.all([
      SecureStore.getItemAsync(STORE_KEYS.provider),
      SecureStore.getItemAsync(STORE_KEYS.model),
      SecureStore.getItemAsync(STORE_KEYS.claudeKey),
      SecureStore.getItemAsync(STORE_KEYS.geminiKey),
      SecureStore.getItemAsync(STORE_KEYS.groqKey),
      SecureStore.getItemAsync(STORE_KEYS.openaiKey),
      SecureStore.getItemAsync(STORE_KEYS.englishMode),
      SecureStore.getItemAsync(STORE_KEYS.ttsEnabled),
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
  };
}

export async function sendMessage(
  messages: AIMessage[],
  provider: Provider,
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
  switch (provider) {
    case "claude":
      return sendClaude(messages, model, apiKey, systemPrompt);
    case "gemini":
      return sendGemini(messages, model, apiKey, systemPrompt);
    case "groq":
      return sendGroq(messages, model, apiKey, systemPrompt);
  }
}

async function sendClaude(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
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
      system: systemPrompt || "You are a helpful coding assistant for vibe coding.",
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude 오류 ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

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
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

async function sendGroq(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
  const msgs = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: msgs, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq 오류 ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}
