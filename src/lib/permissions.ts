// Módulos do sistema Kromuz — cada um pode ser habilitado/desabilitado por cargo
export const MODULOS_SISTEMA = [
  { slug: "dashboard",     label: "Dashboard",          grupo: "Geral" },
  { slug: "financeiro",    label: "Financeiro",         grupo: "Geral" },
  { slug: "vendedores",    label: "Vendedores",         grupo: "Geral" },
  { slug: "leads",         label: "Leads",              grupo: "CRM" },
  { slug: "esteira",       label: "Esteira",            grupo: "CRM" },
  { slug: "comissoes",     label: "Comissões",          grupo: "CRM" },
  { slug: "metas",         label: "Metas",              grupo: "CRM" },
  { slug: "ranking",       label: "Ranking",            grupo: "CRM" },
  { slug: "simulador",     label: "Simulador",          grupo: "Inteligência" },
  { slug: "motor_regras",  label: "Motor de Regras",    grupo: "Inteligência" },
  { slug: "roteiros",      label: "Roteiros",           grupo: "Inteligência" },
  { slug: "mapa_port",     label: "Mapa Portabilidade", grupo: "Inteligência" },
  { slug: "cadastro",      label: "Cadastro (Bancos/Produtos/Convênios/Regras)", grupo: "Cadastro" },
  { slug: "importacao",    label: "Importação de Leads", grupo: "Cadastro" },
  { slug: "relatorios",    label: "Relatórios",         grupo: "Sistema" },
  { slug: "auditoria",     label: "Auditoria",          grupo: "Sistema" },
  { slug: "configuracoes", label: "Configurações",      grupo: "Sistema" },
  { slug: "assinatura",    label: "Minha Assinatura",   grupo: "Sistema" },
  { slug: "rh",            label: "RH & Compliance",    grupo: "RH" },
] as const;

export type ModuloSlug = typeof MODULOS_SISTEMA[number]["slug"];

export type Permissoes = Record<string, boolean>;

// Permissões padrão para os 3 cargos de sistema
export const PERMISSOES_ADMIN: Permissoes = Object.fromEntries(
  MODULOS_SISTEMA.map(m => [m.slug, true])
);

export const PERMISSOES_GERENTE: Permissoes = {
  ...PERMISSOES_ADMIN,
  auditoria: false,
  configuracoes: false,
  assinatura: false,
};

export const PERMISSOES_VENDEDOR: Permissoes = {
  dashboard: true,
  financeiro: false,
  vendedores: false,
  leads: true,
  esteira: true,
  comissoes: true,
  metas: true,
  ranking: true,
  simulador: true,
  motor_regras: false,
  roteiros: false,
  mapa_port: true,
  cadastro: false,
  importacao: false,
  relatorios: false,
  auditoria: false,
  configuracoes: false,
  assinatura: false,
  rh: false,
};

/**
 * Verifica se um objeto de permissões permite acesso a um módulo específico.
 * Se não houver permissões definidas (null/undefined), usa fallback do perfilSlug.
 */
export function temPermissao(
  permissoes: Permissoes | null | undefined,
  modulo: string,
  perfilSlug?: string
): boolean {
  // Se tem permissões do cargo, usa elas
  if (permissoes && typeof permissoes === "object") {
    return permissoes[modulo] === true;
  }

  // Fallback para perfilSlug legado
  if (perfilSlug === "admin") return true;
  if (perfilSlug === "gerente") return PERMISSOES_GERENTE[modulo] !== false;
  return PERMISSOES_VENDEDOR[modulo] === true;
}
