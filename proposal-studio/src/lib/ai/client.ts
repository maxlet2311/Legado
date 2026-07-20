import "server-only";

import { generateObject, generateText } from "ai";
import type { z } from "zod";

import { getAiConfig, isPromptTooLong } from "@/lib/ai/config";

const DEFAULT_MAX_OUTPUT_TOKENS = 700;
const TIMEOUT_MS = 15000;

interface AiTextResult {
  data?: string;
  error?: string;
}

/**
 * Wrapper mínimo sobre el AI SDK. Nunca lanza: la asistencia de IA debe fallar
 * de forma segura sin impedir la edición manual del editor (regla del sprint).
 * No loguea el prompt ni la respuesta -- solo el tipo de error.
 */
async function generateAiText(params: {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<AiTextResult> {
  const config = getAiConfig();
  if (!config.ok) return { error: config.error };
  if (isPromptTooLong(params.prompt)) {
    return { error: "El contexto es demasiado extenso para generar una sugerencia." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateText({
      model: config.model,
      system: params.system,
      prompt: params.prompt,
      maxOutputTokens: params.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      abortSignal: controller.signal,
    });
    const text = result.text.trim();
    if (!text) {
      return { error: "No pudimos generar una sugerencia. Podés seguir editando manualmente." };
    }
    return { data: text };
  } catch (error) {
    console.error("[ai.generate_text]", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return { error: "No pudimos generar la sugerencia en este momento. Podés seguir editando manualmente." };
  } finally {
    clearTimeout(timeout);
  }
}

interface AiObjectResult<T> {
  data?: T;
  error?: string;
}

/** Igual que `generateAiText` pero con salida estructurada validada por zod (para listas/JSON). */
async function generateAiObject<T>(params: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
}): Promise<AiObjectResult<T>> {
  const config = getAiConfig();
  if (!config.ok) return { error: config.error };
  if (isPromptTooLong(params.prompt)) {
    return { error: "El contexto es demasiado extenso para generar una sugerencia." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateObject({
      model: config.model,
      system: params.system,
      prompt: params.prompt,
      schema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      abortSignal: controller.signal,
    });
    return { data: result.object };
  } catch (error) {
    console.error("[ai.generate_object]", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return { error: "No pudimos generar sugerencias en este momento." };
  } finally {
    clearTimeout(timeout);
  }
}

export { generateAiText, generateAiObject };
export type { AiTextResult, AiObjectResult };
