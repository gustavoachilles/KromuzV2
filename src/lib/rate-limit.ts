// ─────────────────────────────────────────────────────────────────
// Rate Limiter em Memória (por IP + rota)
// ─────────────────────────────────────────────────────────────────

const store: Map<string, { count: number; resetAt: number }> = new Map();

// Limpar entradas expiradas a cada 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * Rate limiter simples em memória.
 * @param key - Identificador único (ex: IP + rota)
 * @param maxRequests - Máximo de requisições na janela
 * @param windowMs - Janela de tempo em ms (padrão: 60s)
 * @returns true se o rate limit foi excedido
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}

/**
 * Extrai o IP do request (compatível com Vercel/Next.js).
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
