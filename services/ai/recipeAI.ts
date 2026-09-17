import { callDefaultBackend, callOwnKeyModel, resolveAiMode } from "./provider";

export type RecipeSuggestion = {
  title: string;
  usesExpiringItems: string[];
  ingredients: string[];
  steps: string[];
};

const SYSTEM_PROMPT =
  "Du är en hjälpsam kock. Föreslå recept baserat på tillgängliga ingredienser, " +
  "prioritera ingredienser som snart går ut. Svara ENDAST med giltig JSON: " +
  '{"recipes": [{"title": string, "usesExpiringItems": string[], "ingredients": string[], "steps": string[]}]}';

/**
 * Generates recipe suggestions from anonymous ingredient names only —
 * no user identity is ever sent, whether via the user's own key (direct
 * client call) or the default Supabase Edge Function proxy.
 */
export async function generateRecipes(params: {
  availableIngredients: string[];
  expiringItems: string[];
}): Promise<RecipeSuggestion[]> {
  const mode = await resolveAiMode();

  if (mode.kind === "default") {
    const result = await callDefaultBackend<{ recipes: RecipeSuggestion[] }>("generate-recipe", {
      ingredients: params.availableIngredients,
      expiringItems: params.expiringItems,
    });
    return result.recipes;
  }

  const userText = JSON.stringify({
    ingredients: params.availableIngredients,
    expiringItems: params.expiringItems,
  });

  const text = await callOwnKeyModel({
    provider: mode.provider,
    apiKey: mode.apiKey,
    systemPrompt: SYSTEM_PROMPT,
    userText,
  });

  const parsed = extractJson<{ recipes: RecipeSuggestion[] }>(text);
  return parsed?.recipes ?? [];
}

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
