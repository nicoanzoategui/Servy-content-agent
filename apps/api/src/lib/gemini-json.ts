import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../utils/env";

const MODEL_ID = "gemini-2.5-flash";

function getModel(systemInstruction: string, jsonMode: boolean) {
  const key = env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_AI_API_KEY");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: {
      temperature: jsonMode ? 0.3 : 0.4,
      maxOutputTokens: jsonMode ? 4096 : 2048,
      ...(jsonMode ? { responseMimeType: "application/json" as const } : {}),
    },
  });
}

export async function geminiGenerateJson<T>(
  systemInstruction: string,
  userMessage: string,
): Promise<T> {
  const model = getModel(systemInstruction, true);
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  if (!text) throw new Error("Gemini vacío");
  return JSON.parse(text.trim()) as T;
}

export async function geminiGenerateText(
  systemInstruction: string,
  userMessage: string,
): Promise<string> {
  const model = getModel(systemInstruction, false);
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return text.trim();
}
