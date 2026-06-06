// ─────────────────────────────────────────────────────────────────────────────
// PLANOS COMERCIAIS KROMUZ — Feature Flags por Plano
// ─────────────────────────────────────────────────────────────────────────────

export type PlanoSlug = "start" | "pro" | "black" | "beta";

export const PLANOS: Record<PlanoSlug, {
  nome: string;
  badge: string;
  cor: string;
  modulosPermitidos: string[];
  limiteUsuarios: number;
  limiteLeads: number;
}> = {
  start: {
    nome: "Kromuz Start",
    badge: "START",
    cor: "#22c55e", // verde
    modulosPermitidos: [
      "dashboard", "leads", "simulador", "motor_regras", "esteira",
      "comissoes", "cadastro", "vendedores", "assinatura",
    ],
    limiteUsuarios: 5,
    limiteLeads: 1000,
  },
  pro: {
    nome: "Kromuz Pro",
    badge: "PRO",
    cor: "#3b82f6", // azul
    modulosPermitidos: [
      "dashboard", "leads", "simulador", "motor_regras", "esteira",
      "comissoes", "cadastro", "vendedores", "assinatura",
      // + PRO exclusivos:
      "mapa_port", "relatorios", "ranking", "metas", "roteiros",
      "importacao", "auditoria", "financeiro",
    ],
    limiteUsuarios: 10,
    limiteLeads: 10000,
  },
  black: {
    nome: "Kromuz Black",
    badge: "BLACK",
    cor: "#a855f7", // roxo
    modulosPermitidos: [
      "dashboard", "leads", "simulador", "motor_regras", "esteira",
      "comissoes", "cadastro", "vendedores", "assinatura",
      "mapa_port", "relatorios", "ranking", "metas", "roteiros",
      "importacao", "auditoria", "financeiro",
      // + BLACK exclusivos:
      "rh", "contabil",
    ],
    limiteUsuarios: Infinity,
    limiteLeads: Infinity,
  },
  beta: {
    nome: "Beta",
    badge: "BETA",
    cor: "#f97316", // laranja
    modulosPermitidos: ["*"], // wildcard = tudo liberado
    limiteUsuarios: Infinity,
    limiteLeads: Infinity,
  },
};

/**
 * Retorna os módulos permitidos para um plano.
 * Se o plano não existir, retorna beta (tudo liberado).
 */
export function getModulosPermitidosPorPlano(planoSlug: string): string[] {
  const plano = PLANOS[planoSlug as PlanoSlug];
  if (!plano) return PLANOS.beta.modulosPermitidos;
  return plano.modulosPermitidos;
}

/**
 * Verifica se um módulo específico é permitido pelo plano.
 */
export function moduloPermitidoPeloPlano(planoSlug: string, modulo: string): boolean {
  const modulos = getModulosPermitidosPorPlano(planoSlug);
  if (modulos.includes("*")) return true;
  return modulos.includes(modulo);
}

/**
 * Retorna os dados do plano (nome, badge, cor, limites).
 */
export function getPlano(planoSlug: string) {
  return PLANOS[planoSlug as PlanoSlug] || PLANOS.beta;
}
