import * as ImageManipulator from "expo-image-manipulator";
import { callDefaultBackend, callOwnKeyModel, resolveAiMode } from "./provider";

export type StorageLocation = "kylskåp" | "frys" | "skafferi";

export type RecognizedItem = {
  name: string;
  category: string;
  estimatedQuantity: number;
  suggestedLocation: StorageLocation;
};

export type VisionRecognitionResult = {
  items: RecognizedItem[];
  /** One short, concrete tidy-up/organization tip for the whole photo, or "" if nothing to flag. */
  organizationTip: string;
};

const ITEM_SCHEMA =
  '{"name": string, "category": string, "estimatedQuantity": number, ' +
  '"suggestedLocation": "kylskåp" | "frys" | "skafferi"}';

const NAME_STYLE_HINT =
  "Håll name kort (1-3 ord, t.ex. \"Mjölk\", \"Äggkartong\") utan parenteser eller " +
  "kommentarer om varans skick eller placering.";

const RECEIPT_PROMPT =
  "Läs kvittot på bilden och lista alla matvaror som köpts. För varje vara, föreslå var den " +
  "bäst bör förvaras (kylskåp, frys eller skafferi) baserat på vad det är. " +
  `${NAME_STYLE_HINT} ` +
  `Svara ENDAST med giltig JSON: {"items": [${ITEM_SCHEMA}], "organizationTip": string}. ` +
  "Sätt organizationTip till en tom sträng — ett kvitto visar inget om hur varorna faktiskt " +
  "står förvarade. Ignorera icke-matvaror (påsar, pant, rabatter).";

const SHELF_PROMPT =
  "Bilden visar en hylla i ett kylskåp, frys eller skafferi. Identifiera varje synlig matvara " +
  "och föreslå var den bäst bör förvaras (kylskåp, frys eller skafferi). " +
  `${NAME_STYLE_HINT} Beskriv skick/placering i organizationTip istället för i name. ` +
  "Titta även på HUR varorna står placerade och ge EN kort, konkret städ- eller " +
  'organisationstips för hela bilden om du ser något som borde flyttas eller ordnas bättre ' +
  '(t.ex. "Flytta mjölken längre in, den står för nära dörren"). Om allt redan ser ' +
  "välorganiserat ut, sätt organizationTip till en tom sträng. " +
  `Svara ENDAST med giltig JSON: {"items": [${ITEM_SCHEMA}], "organizationTip": string}.`;

/** Compresses/resizes before upload — vision calls get slow and expensive on raw photos. */
async function prepareImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!result.base64) throw new Error("Image compression failed to produce base64 output.");
  return result.base64;
}

/** Strips markdown code fences (```json ... ```) some models wrap JSON in, then parses. */
function extractJson<T>(text: string): T | null {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function recognize(uri: string, prompt: string): Promise<VisionRecognitionResult> {
  const base64 = await prepareImage(uri);
  const mode = await resolveAiMode();

  if (mode.kind === "default") {
    return callDefaultBackend<VisionRecognitionResult>("recognize-items", {
      imageBase64: base64,
      prompt,
    });
  }

  const text = await callOwnKeyModel({
    provider: mode.provider,
    apiKey: mode.apiKey,
    systemPrompt: prompt,
    userText: "Analysera bilden enligt instruktionerna.",
    imageBase64: base64,
  });

  const parsed = extractJson<VisionRecognitionResult>(text);
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error(
      `AI-svaret gick inte att tolka. Rått svar (start): ${text.slice(0, 300)}`
    );
  }
  return { items: parsed.items, organizationTip: parsed.organizationTip ?? "" };
}

/** Photo of a grocery receipt -> recognized purchased items + a (usually empty) tip. */
export function recognizeReceipt(imageUri: string): Promise<VisionRecognitionResult> {
  return recognize(imageUri, RECEIPT_PROMPT);
}

/** Photo of a fridge/pantry shelf -> recognized items sitting on it + an organization tip. */
export function recognizeShelfPhoto(imageUri: string): Promise<VisionRecognitionResult> {
  return recognize(imageUri, SHELF_PROMPT);
}
