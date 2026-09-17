import { getApiKey, getSavedProvider, type AiProvider } from "./keyStore";

/**
 * TODO: replace with your real Supabase project URL once the Edge Functions
 * (`generate-recipe`, `recognize-items`) are deployed. This is the fallback
 * "default mode" backend — it holds your own AI key server-side so users
 * without their own key can still use the app (consider rate-limiting it).
 */
export const SUPABASE_FUNCTIONS_URL = "https://YOUR-PROJECT.supabase.co/functions/v1";

export type AiMode =
  | { kind: "own-key"; provider: AiProvider; apiKey: string }
  | { kind: "default" };

/** Own-key mode when the user has saved a key; otherwise the Supabase-proxied default. */
export async function resolveAiMode(): Promise<AiMode> {
  const apiKey = await getApiKey();
  const provider = await getSavedProvider();
  if (apiKey && provider) {
    return { kind: "own-key", provider, apiKey };
  }
  return { kind: "default" };
}

const ANTHROPIC_MODEL = "claude-sonnet-5";
const OPENAI_MODEL = "gpt-4o-mini";

/** Sends a single-turn prompt (optionally with an image) directly to the user's own provider. */
export async function callOwnKeyModel(params: {
  provider: AiProvider;
  apiKey: string;
  systemPrompt: string;
  userText: string;
  imageBase64?: string;
}): Promise<string> {
  if (params.provider === "anthropic") {
    return callAnthropic(params);
  }
  return callOpenAi(params);
}

async function callAnthropic(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  imageBase64?: string;
}): Promise<string> {
  const content: Record<string, unknown>[] = [{ type: "text", text: params.userText }];
  if (params.imageBase64) {
    content.unshift({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: params.imageBase64 },
    });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: params.systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  return json.content?.[0]?.text ?? "";
}

async function callOpenAi(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  imageBase64?: string;
}): Promise<string> {
  const userContent: Record<string, unknown>[] = [{ type: "text", text: params.userText }];
  if (params.imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${params.imageBase64}` },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/** Calls our Supabase Edge Function fallback, which holds our own key server-side. */
export async function callDefaultBackend<T>(functionName: string, body: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Edge function error: ${response.status} ${await response.text()}`);
  }
  return response.json();
}
