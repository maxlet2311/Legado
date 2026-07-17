import "server-only";

import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;

/** Token aleatorio criptográficamente seguro (256 bits). Nunca se persiste en texto plano. */
function generateActivationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Hash determinístico usado como clave de búsqueda; el token nunca se guarda ni se loguea. */
function hashActivationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { generateActivationToken, hashActivationToken };
