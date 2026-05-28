"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, FileText, Layers, Settings, Calculator, BookOpen, BarChart3, Shield, Package, ScrollText, Kanban, Users, DollarSign, Target, Trophy, Upload, ArrowRightLeft, PieChart, CreditCard, Inbox as InboxIcon, Megaphone, RefreshCcw, MessageSquare, GraduationCap, Clock, Activity, LayoutDashboard, KeyRound, ChevronDown, AlertTriangle, UserCheck, Receipt, Palmtree, FolderOpen, CalendarDays, Gavel, Eye, Bell, Repeat, Zap } from "lucide-react";
import type { Permissoes } from "@/lib/permissions";

// ── Category color mapping ──
const CATEGORY_COLORS: Record<string, { dot: string; glow: string; badge: string }> = {
  crm:          { dot: "#3b82f6", glow: "rgba(59,130,246,0.15)", badge: "rgba(59,130,246,0.15)" },
  inteligencia: { dot: "#a855f7", glow: "rgba(168,85,247,0.15)", badge: "rgba(168,85,247,0.15)" },
  cadastro:     { dot: "#22c55e", glow: "rgba(34,197,94,0.15)",  badge: "rgba(34,197,94,0.15)"  },
  sistema:      { dot: "#f97316", glow: "rgba(249,115,22,0.15)", badge: "rgba(249,115,22,0.15)" },
  rh:           { dot: "#ec4899", glow: "rgba(236,72,153,0.15)", badge: "rgba(236,72,153,0.15)" },
  contabil:     { dot: "#eab308", glow: "rgba(234,179,8,0.15)",  badge: "rgba(234,179,8,0.15)"  },
};

export function SidebarNav({ permissoes }: { permissoes: Permissoes }) {
  const pathname = usePathname() ?? "";

  const p = (mod: string) => permissoes[mod] === true;

  // Detect which section has active route to auto-open it
  const crmPaths = ["/leads", "/esteira", "/comissoes", "/metas", "/ranking", "/inbox", "/inbox/dashboard", "/inbox/mensagens-rapidas", "/recuperacao", "/marketing", "/canais", "/calendario", "/automacoes"];
  const inteligenciaPaths = ["/simulador", "/motor-regras", "/roteiros", "/mapa-portabilidade", "/conhecimento"];
  const cadastroPaths = ["/regras", "/bancos", "/produtos", "/convenios", "/credenciais", "/importacao"];
  const sistemaPaths = ["/relatorios", "/auditoria", "/sla", "/configuracoes", "/assinatura"];
  const rhPaths = ["/rh"];
  const contabilPaths = ["/contabil"];

  const isInSection = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + "/"));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    crm: isInSection(crmPaths),
    inteligencia: isInSection(inteligenciaPaths),
    cadastro: isInSection(cadastroPaths),
    sistema: isInSection(sistemaPaths),
    rh: isInSection(rhPaths),
    contabil: isInSection(contabilPaths),
  }));

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasCrm = p("leads") || p("esteira") || p("comissoes") || p("metas") || p("ranking");
  const hasInteligencia = p("simulador") || p("motor_regras") || p("roteiros") || p("mapa_port");
  const hasCadastro = p("cadastro") || p("importacao");
  const hasSistema = p("relatorios") || p("auditoria") || p("configuracoes") || p("assinatura");
  const hasRh = p("rh");
  const hasContabil = p("contabil");

  // Count items per section for badges
  const crmCount = useMemo(() => {
    let c = 0;
    if (p("leads")) c += 8; // Leads, Inbox, Dashboard Atend, Msg Rápidas, Recuperação, Marketing, Canais, Calendário, Campanhas, Automações
    if (p("esteira")) c += 1;
    if (p("comissoes")) c += 1;
    if (p("metas")) c += 1;
    if (p("ranking")) c += 1;
    return c;
  }, [permissoes]);

  return (
    <nav className="px-3 py-2 text-sm pb-6">
      {/* ── Quick Access (no category) ── */}
      <div className="space-y-0.5 mb-2">
        {p("dashboard") && (
          <NavLink href="/mesa" icon={<LayoutDashboard className="h-4 w-4" />} active={pathname === "/mesa"}>
            Mesa
          </NavLink>
        )}
        {p("dashboard") && (
          <NavLink href="/dashboard" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/dashboard"}>
            Dashboard
          </NavLink>
        )}
        {p("financeiro") && (
          <NavLink href="/dashboard-financeiro" icon={<DollarSign className="h-4 w-4" />} active={pathname === "/dashboard-financeiro"}>
            Financeiro
          </NavLink>
        )}
        {p("vendedores") && (
          <NavLink href="/vendedores" icon={<PieChart className="h-4 w-4" />} active={pathname === "/vendedores"}>
            Vendedores
          </NavLink>
        )}
        {p("vendedores") && (
          <NavLink href="/dashboard-vendedores" icon={<Activity className="h-4 w-4" />} active={pathname === "/dashboard-vendedores"}>
            Perf. Vendedores
          </NavLink>
        )}
      </div>

      {/* ── Separator ── */}
      <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* CRM */}
      {hasCrm && (
        <CollapsibleSection
          label="CRM"
          colorKey="crm"
          isOpen={openSections.crm}
          onToggle={() => toggleSection("crm")}
          hasActiveChild={isInSection(crmPaths)}
        >
          {p("leads") && (
            <NavLink isSubItem href="/leads" icon={<Users className="h-4 w-4" />} active={pathname === "/leads"}>Leads</NavLink>
          )}
          {p("esteira") && (
            <NavLink isSubItem href="/esteira" icon={<Kanban className="h-4 w-4" />} active={pathname === "/esteira"}>Esteira</NavLink>
          )}
          {p("comissoes") && (
            <NavLink isSubItem href="/comissoes" icon={<DollarSign className="h-4 w-4" />} active={pathname === "/comissoes"}>Comissões</NavLink>
          )}
          {p("metas") && (
            <NavLink isSubItem href="/metas" icon={<Target className="h-4 w-4" />} active={pathname === "/metas"}>Metas</NavLink>
          )}
          {p("ranking") && (
            <NavLink isSubItem href="/ranking" icon={<Trophy className="h-4 w-4" />} active={pathname === "/ranking"}>Ranking</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/inbox" icon={<InboxIcon className="h-4 w-4" />} active={pathname === "/inbox"}>Inbox</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/inbox/dashboard" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/inbox/dashboard"}>Dash Atendimento</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/inbox/mensagens-rapidas" icon={<Zap className="h-4 w-4" />} active={pathname === "/inbox/mensagens-rapidas"}>Mensagens Rápidas</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/recuperacao" icon={<RefreshCcw className="h-4 w-4" />} active={pathname === "/recuperacao"}>Recuperação</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/marketing" icon={<Megaphone className="h-4 w-4" />} active={pathname === "/marketing"}>Marketing</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/canais" icon={<MessageSquare className="h-4 w-4" />} active={pathname.startsWith("/canais")}>Canais</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/calendario" icon={<CalendarDays className="h-4 w-4" />} active={pathname === "/calendario"}>Calendário</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/marketing/campanhas" icon={<Megaphone className="h-4 w-4" />} active={pathname.startsWith("/marketing/campanhas")}>Campanhas</NavLink>
          )}
          {p("leads") && (
            <NavLink isSubItem href="/automacoes" icon={<Repeat className="h-4 w-4" />} active={pathname.startsWith("/automacoes")}>Automações</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Inteligência */}
      {hasInteligencia && (
        <CollapsibleSection
          label="Inteligência"
          colorKey="inteligencia"
          isOpen={openSections.inteligencia}
          onToggle={() => toggleSection("inteligencia")}
          hasActiveChild={isInSection(inteligenciaPaths)}
        >
          {p("simulador") && (
            <NavLink isSubItem href="/simulador" icon={<Calculator className="h-4 w-4" />} active={pathname === "/simulador"}>Simulador</NavLink>
          )}
          {p("motor_regras") && (
            <NavLink isSubItem href="/motor-regras" icon={<Brain className="h-4 w-4" />} active={pathname === "/motor-regras"}>Motor de Regras</NavLink>
          )}
          {p("roteiros") && (
            <NavLink isSubItem href="/roteiros" icon={<FileText className="h-4 w-4" />} active={pathname === "/roteiros"}>Roteiros</NavLink>
          )}
          {p("mapa_port") && (
            <NavLink isSubItem href="/mapa-portabilidade" icon={<ArrowRightLeft className="h-4 w-4" />} active={pathname === "/mapa-portabilidade"}>Mapa Port.</NavLink>
          )}
          {p("roteiros") && (
            <NavLink isSubItem href="/conhecimento" icon={<GraduationCap className="h-4 w-4" />} active={pathname === "/conhecimento"}>Base Conhecimento</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Cadastro */}
      {hasCadastro && (
        <CollapsibleSection
          label="Cadastro"
          colorKey="cadastro"
          isOpen={openSections.cadastro}
          onToggle={() => toggleSection("cadastro")}
          hasActiveChild={isInSection(cadastroPaths)}
        >
          {p("cadastro") && (
            <>
              <NavLink isSubItem href="/regras" icon={<BookOpen className="h-4 w-4" />} active={pathname.startsWith("/regras")}>Regras</NavLink>
              <NavLink isSubItem href="/bancos" icon={<Layers className="h-4 w-4" />} active={pathname.startsWith("/bancos")}>Bancos</NavLink>
              <NavLink isSubItem href="/produtos" icon={<Package className="h-4 w-4" />} active={pathname.startsWith("/produtos")}>Produtos</NavLink>
              <NavLink isSubItem href="/convenios" icon={<Shield className="h-4 w-4" />} active={pathname.startsWith("/convenios")}>Convênios</NavLink>
              <NavLink isSubItem href="/credenciais" icon={<KeyRound className="h-4 w-4" />} active={pathname === "/credenciais"}>Credenciais</NavLink>
            </>
          )}
          {p("importacao") && (
            <NavLink isSubItem href="/importacao" icon={<Upload className="h-4 w-4" />} active={pathname === "/importacao"}>Importar Clientes</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Sistema */}
      {hasSistema && (
        <CollapsibleSection
          label="Sistema"
          colorKey="sistema"
          isOpen={openSections.sistema}
          onToggle={() => toggleSection("sistema")}
          hasActiveChild={isInSection(sistemaPaths)}
        >
          {p("relatorios") && (
            <NavLink isSubItem href="/relatorios" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/relatorios"}>Relatórios</NavLink>
          )}
          {p("auditoria") && (
            <NavLink isSubItem href="/auditoria" icon={<ScrollText className="h-4 w-4" />} active={pathname === "/auditoria"}>Auditoria</NavLink>
          )}
          {p("auditoria") && (
            <NavLink isSubItem href="/sla" icon={<Clock className="h-4 w-4" />} active={pathname === "/sla"}>SLA</NavLink>
          )}
          {p("configuracoes") && (
            <NavLink isSubItem href="/configuracoes" icon={<Settings className="h-4 w-4" />} active={pathname === "/configuracoes"}>Configurações</NavLink>
          )}
          {p("assinatura") && (
            <NavLink isSubItem href="/assinatura" icon={<CreditCard className="h-4 w-4" />} active={pathname === "/assinatura"}>Minha Assinatura</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* RH & Compliance */}
      {hasRh && (
        <CollapsibleSection
          label="RH & Compliance"
          colorKey="rh"
          isOpen={openSections.rh}
          onToggle={() => toggleSection("rh")}
          hasActiveChild={isInSection(rhPaths)}
        >
          <NavLink isSubItem href="/rh" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/rh"}>Dashboard RH</NavLink>
          <NavLink isSubItem href="/rh/funcionarios" icon={<UserCheck className="h-4 w-4" />} active={pathname.startsWith("/rh/funcionarios")}>Funcionários</NavLink>
          <NavLink isSubItem href="/rh/ponto" icon={<Clock className="h-4 w-4" />} active={pathname.startsWith("/rh/ponto")}>Controle de Ponto</NavLink>
          <NavLink isSubItem href="/rh/espelho" icon={<CalendarDays className="h-4 w-4" />} active={pathname.startsWith("/rh/espelho")}>Espelho de Ponto</NavLink>
          <NavLink isSubItem href="/rh/ferias" icon={<Palmtree className="h-4 w-4" />} active={pathname.startsWith("/rh/ferias")}>Férias</NavLink>
          <NavLink isSubItem href="/rh/passivo" icon={<AlertTriangle className="h-4 w-4" />} active={pathname.startsWith("/rh/passivo")}>Passivo Trabalhista</NavLink>
          <NavLink isSubItem href="/rh/folha" icon={<Receipt className="h-4 w-4" />} active={pathname.startsWith("/rh/folha")}>Folha & Holerites</NavLink>
          <NavLink isSubItem href="/rh/rescisao" icon={<Gavel className="h-4 w-4" />} active={pathname.startsWith("/rh/rescisao")}>Simulador Rescisão</NavLink>
          <NavLink isSubItem href="/rh/documentos" icon={<FolderOpen className="h-4 w-4" />} active={pathname.startsWith("/rh/documentos")}>Documentos</NavLink>
          <NavLink isSubItem href="/rh/auditoria" icon={<Eye className="h-4 w-4" />} active={pathname.startsWith("/rh/auditoria")}>Auditoria</NavLink>
        </CollapsibleSection>
      )}

      {/* Contábil & Fiscal */}
      {hasContabil && (
        <CollapsibleSection
          label="Contábil & Fiscal"
          colorKey="contabil"
          isOpen={openSections.contabil}
          onToggle={() => toggleSection("contabil")}
          hasActiveChild={isInSection(contabilPaths)}
        >
          <NavLink isSubItem href="/contabil" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/contabil"}>DRE</NavLink>
          <NavLink isSubItem href="/contabil/lancamentos" icon={<Receipt className="h-4 w-4" />} active={pathname === "/contabil/lancamentos"}>Contas a Pagar/Receber</NavLink>
          <NavLink isSubItem href="/contabil/contas-bancarias" icon={<CreditCard className="h-4 w-4" />} active={pathname === "/contabil/contas-bancarias"}>Contas Bancárias</NavLink>
          <NavLink isSubItem href="/contabil/orcamento" icon={<Shield className="h-4 w-4" />} active={pathname === "/contabil/orcamento"}>Orçamento</NavLink>
          <NavLink isSubItem href="/contabil/carteira" icon={<DollarSign className="h-4 w-4" />} active={pathname.startsWith("/contabil/carteira")}>Carteira Vendedores</NavLink>
          <NavLink isSubItem href="/contabil/radar" icon={<AlertTriangle className="h-4 w-4" />} active={pathname === "/contabil/radar"}>Radar Vencimentos</NavLink>
          <NavLink isSubItem href="/contabil/patrimonio" icon={<Package className="h-4 w-4" />} active={pathname === "/contabil/patrimonio"}>Patrimônio</NavLink>
          <NavLink isSubItem href="/contabil/bordero" icon={<ScrollText className="h-4 w-4" />} active={pathname === "/contabil/bordero"}>Motor Borderô</NavLink>
          <NavLink isSubItem href="/contabil/simulador" icon={<Calculator className="h-4 w-4" />} active={pathname === "/contabil/simulador"}>Simulador Tributário</NavLink>
          <NavLink isSubItem href="/contabil/categorias" icon={<FolderOpen className="h-4 w-4" />} active={pathname === "/contabil/categorias"}>Plano de Contas</NavLink>
          <NavLink isSubItem href="/contabil/dashboard" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/contabil/dashboard"}>Dashboard BI</NavLink>
          <NavLink isSubItem href="/contabil/conciliacao" icon={<Repeat className="h-4 w-4" />} active={pathname === "/contabil/conciliacao"}>Conciliação Bancária</NavLink>
          <NavLink isSubItem href="/contabil/notificacoes" icon={<Bell className="h-4 w-4" />} active={pathname === "/contabil/notificacoes"}>Central de Alertas</NavLink>
          <NavLink isSubItem href="/contabil/auditoria" icon={<Eye className="h-4 w-4" />} active={pathname === "/contabil/auditoria"}>Auditoria</NavLink>
        </CollapsibleSection>
      )}
    </nav>
  );
}


function CollapsibleSection({
  label,
  colorKey,
  isOpen,
  onToggle,
  hasActiveChild,
  children,
}: {
  label: string;
  colorKey: string;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveChild?: boolean;
  children: React.ReactNode;
}) {
  const colors = CATEGORY_COLORS[colorKey] || CATEGORY_COLORS.crm;
  const childCount = Array.isArray(children) ? children.filter(Boolean).length : (children ? 1 : 0);

  return (
    <div className="mt-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer outline-none rounded-xl transition-all duration-300 hover:bg-white/[0.03]"
        style={hasActiveChild && !isOpen ? { backgroundColor: colors.glow } : {}}
      >
        {/* Colored dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0 transition-all duration-300 group-hover:scale-125"
          style={{
            backgroundColor: colors.dot,
            boxShadow: isOpen || hasActiveChild ? `0 0 8px ${colors.dot}` : 'none',
          }}
        />

        {/* Label */}
        <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors duration-300 flex-1 text-left">
          {label}
        </span>

        {/* Item count badge */}
        {!isOpen && childCount > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
            style={{ backgroundColor: colors.badge, color: colors.dot }}
          >
            {childCount}
          </span>
        )}

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div
              className="space-y-0.5 pt-1 pb-2 ml-[17px] pl-3 relative"
              style={{
                borderLeft: `2px solid ${colors.dot}20`,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  disabled,
  active,
  isSubItem = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  isSubItem?: boolean;
}) {
  if (disabled) {
    return (
      <span className={`flex items-center gap-2.5 py-2 rounded-xl text-zinc-600 cursor-not-allowed opacity-50 ${isSubItem ? 'pl-3 pr-3' : 'px-3'}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-[13px] font-medium">{children}</span>
        <span className="ml-auto text-[9px] uppercase tracking-wider bg-zinc-800/80 text-zinc-500 px-1.5 py-0.5 rounded-md border border-zinc-700/50">soon</span>
      </span>
    );
  }

  return (
    <Link href={href} className="relative flex w-full outline-none group">
      <motion.div
        className={`relative flex items-center gap-2.5 w-full rounded-xl transition-all duration-200 ${
          isSubItem ? 'py-[7px] pl-3 pr-3' : 'py-2.5 px-3'
        } ${
          active
            ? "text-white"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
        }`}
        whileHover={{ x: active ? 0 : 3 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Active background */}
        {active && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-xl"
            style={{
              background: isSubItem
                ? 'linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 15%, transparent), transparent)'
                : 'linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 20%, transparent), color-mix(in srgb, var(--brand-primary) 5%, transparent))',
              borderLeft: isSubItem ? '2px solid var(--brand-primary)' : '3px solid var(--brand-primary)',
              boxShadow: `inset 0 0 20px color-mix(in srgb, var(--brand-primary) 10%, transparent)`,
            }}
            initial={false}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2.5 w-full">
          <motion.span
            className={`shrink-0 ${active ? "" : isSubItem ? "text-zinc-500 group-hover:text-zinc-300" : "text-zinc-400 group-hover:text-zinc-200"}`}
            style={active ? { color: 'var(--brand-primary)' } : {}}
            whileHover={{ scale: 1.15 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.span>
          <span className={`${isSubItem ? 'text-[13px] font-medium' : 'text-[14px] font-semibold'} tracking-wide whitespace-nowrap`}>
            {children}
          </span>
        </span>
      </motion.div>
    </Link>
  );
}
