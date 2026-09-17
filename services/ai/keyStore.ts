import * as SecureStore from "expo-secure-store";

export type AiProvider = "anthropic" | "openai";

const KEY_STORAGE_KEY = "kyl2ai.ai.apiKey";
const PROVIDER_STORAGE_KEY = "kyl2ai.ai.provider";

/**
 * User-supplied API keys live in the device Keychain/Keystore via
 * expo-secure-store — never in SQLite/AsyncStorage, and never sent
 * anywhere except directly to the chosen provider's own API.
 */
export async function saveApiKey(provider: AiProvider, apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, apiKey);
  await SecureStore.setItemAsync(PROVIDER_STORAGE_KEY, provider);
}

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_STORAGE_KEY);
}

export async function getSavedProvider(): Promise<AiProvider | null> {
  const value = await SecureStore.getItemAsync(PROVIDER_STORAGE_KEY);
  return value === "anthropic" || value === "openai" ? value : null;
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_STORAGE_KEY);
  await SecureStore.deleteItemAsync(PROVIDER_STORAGE_KEY);
}

export async function hasOwnKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}
