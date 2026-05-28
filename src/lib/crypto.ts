import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY não configurada no .env");
  // Se a key tem 64 hex chars (32 bytes), use direto
  if (key.length === 64) return Buffer.from(key, "hex");
  // Se é uma string qualquer, derive 32 bytes com SHA-256
  const { createHash } = require("crypto");
  return createHash("sha256").update(key).digest();
}

/**
 * Criptografa uma string com AES-256-GCM.
 * Retorna: iv:authTag:ciphertext (tudo em hex)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa uma string criptografada com encrypt().
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) throw new Error("Formato de criptografia inválido");
  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Mascara uma senha para exibição: "••••••" com os últimos 3 chars visíveis
 */
export function maskPassword(text: string): string {
  if (!text || text.length <= 3) return "••••••";
  return "••••••" + text.slice(-3);
}
