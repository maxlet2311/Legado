/**
 * Lógica pura de validación de configuración de IA, separada de `client.ts`
 * (server-only) para poder testearla directo con `node --test` sin pasar por
 * el guard de `server-only` (mismo patrón que `src/lib/utils/public-app-url.ts`
 * frente a `env.ts`).
 */

const MAX_PROMPT_LENGTH = 12000;

/**
 * El slug de modelo de Vercel AI Gateway ("provider/model", ej.
 * "anthropic/claude-sonnet-4.6") cambia con el catálogo del Gateway y usa
 * puntos para versión, no guiones -- no es lo mismo que el model ID de la
 * API directa de Anthropic. Nunca lo hardcodeamos: sin `AI_MODEL` configurado
 * explícitamente (confirmado contra `gateway.getAvailableModels()` o el
 * dashboard de Vercel), la asistencia de IA falla con un error de
 * configuración claro en vez de arriesgar una llamada con un slug inválido.
 */
function getAiConfig(): { ok: true; model: string } | { ok: false; error: string } {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    return { ok: false, error: "La asistencia de IA no está configurada todavía." };
  }
  return { ok: true, model };
}

function isPromptTooLong(prompt: string): boolean {
  return prompt.length > MAX_PROMPT_LENGTH;
}

export { getAiConfig, isPromptTooLong, MAX_PROMPT_LENGTH };
