import * as ImageManipulator from "expo-image-manipulator";
import { callDefaultBackend, callOwnKeyModel, resolveAiMode } from "./provider";

export type RecognizedItem = {
  name: string;
  category: string;
  estimatedQuantity: number;
};

const RECEIPT_PROMPT =
  "Läs kvittot på bilden och lista alla matvaror som köpts. Svara ENDAST med giltig JSON: " +
  '{"items": [{"name": string, "category": string, "estimatedQuantity": number}]}. ' +
  "Ignorera icke-matvaror (påsar, pant, rabatter).";

const SHELF_PROMPT =
  "Bilden visar en hylla i ett kylskåp eller skafferi. Identifiera varje synlig matvara. " +
  'Svara ENDAST med giltig JSON: {"items": [{"name": string, "category": string, "estimatedQuantity": number}]}.';

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

async function recognize(uri: string, prompt: string): Promise<RecognizedItem[]> {
  const base64 = await prepareImage(uri);
  const mode = await resolveAiMode();

  if (mode.kind === "default") {
    const result = await callDefaultBackend<{ items: RecognizedItem[] }>("recognize-items", {
      imageBase64: base64,
      prompt,
    });
    return result.items;
  }

  const text = await callOwnKeyModel({
    provider: mode.provider,
    apiKey: mode.apiKey,
    systemPrompt: prompt,
    userText: "Analysera bilden enligt instruktionerna.",
    imageBase64: base64,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { items: RecognizedItem[] };
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

/** Photo of a grocery receipt -> recognized purchased items. */
export function recognizeReceipt(imageUri: string): Promise<RecognizedItem[]> {
  return recognize(imageUri, RECEIPT_PROMPT);
}

/** Photo of a fridge/pantry shelf -> recognized items sitting on it. */
export function recognizeShelfPhoto(imageUri: string): Promise<RecognizedItem[]> {
  return recognize(imageUri, SHELF_PROMPT);
}
