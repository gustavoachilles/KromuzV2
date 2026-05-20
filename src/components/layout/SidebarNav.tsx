"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, FileText, Layers, Settings, Calculator, BookOpen, BarChart3, Shield, Package, ScrollText, Kanban, Users, DollarSign, Target, Trophy, Upload, ArrowRightLeft, PieChart, CreditCard, Inbox, Megaphone, RefreshCcw, MessageSquare, GraduationCap, Clock, Activity, LayoutDashboard, KeyRound, ChevronDown, AlertTriangle, UserCheck, ClipboardList, Receipt, Palmtree, FolderOpen, CalendarDays, Gavel, Eye } from "lucide-react";
import type { Permissoes } from "@/lib/permissions";

export function SidebarNav({ permissoes }: { permissoes: Permissoes }) {
  const pathname = usePathname() ?? "";

  const p = (mod: string) => permissoes[mod] === true;

  // Detect which section has active route to auto-open it
  const crmPaths = ["/leads", "/esteira", "/comissoes", "/metas", "/ranking", "/inbox", "/recuperacao", "/marketing", "/canais"];
  const inteligenciaPaths = ["/simulador", "/motor-regras", "/roteiros", "/mapa-portabilidade", "/conhecimento"];
  const cadastroPaths = ["/regras", "/bancos", "/produtos", "/convenios", "/credenciais", "/importacao"];
  const sistemaPaths = ["/relatorios", "/auditoria", "/sla", "/configuracoes", "/assinatura"];
  const rhPaths = ["/rh"];

  const isInSection = (paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + "/"));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    crm: isInSection(crmPaths),
    inteligencia: isInSection(inteligenciaPaths),
    cadastro: isInSection(cadastroPaths),
    sistema: isInSection(sistemaPaths),
    rh: isInSection(rhPaths),
  }));

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasCrm = p("leads") || p("esteira") || p("comissoes") || p("metas") || p("ranking");
  const hasInteligencia = p("simulador") || p("motor_regras") || p("roteiros") || p("mapa_port");
  const hasCadastro = p("cadastro") || p("importacao");
  const hasSistema = p("relatorios") || p("auditoria") || p("configuracoes") || p("assinatura");
  const hasRh = p("rh");

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 text-sm overflow-y-auto scrollbar-none pb-20">
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

      {/* CRM */}
      {hasCrm && (
        <CollapsibleSection
          label="CRM"
          isOpen={openSections.crm}
          onToggle={() => toggleSection("crm")}
        >
          {p("leads") && (
            <NavLink href="/leads" icon={<Users className="h-4 w-4" />} active={pathname === "/leads"}>Leads</NavLink>
          )}
          {p("esteira") && (
            <NavLink href="/esteira" icon={<Kanban className="h-4 w-4" />} active={pathname === "/esteira"}>Esteira</NavLink>
          )}
          {p("comissoes") && (
            <NavLink href="/comissoes" icon={<DollarSign className="h-4 w-4" />} active={pathname === "/comissoes"}>Comissões</NavLink>
          )}
          {p("metas") && (
            <NavLink href="/metas" icon={<Target className="h-4 w-4" />} active={pathname === "/metas"}>Metas</NavLink>
          )}
          {p("ranking") && (
            <NavLink href="/ranking" icon={<Trophy className="h-4 w-4" />} active={pathname === "/ranking"}>Ranking</NavLink>
          )}
          {p("leads") && (
            <NavLink href="/inbox" icon={<Inbox className="h-4 w-4" />} active={pathname === "/inbox"}>Inbox</NavLink>
          )}
          {p("leads") && (
            <NavLink href="/recuperacao" icon={<RefreshCcw className="h-4 w-4" />} active={pathname === "/recuperacao"}>Recuperação</NavLink>
          )}
          {p("leads") && (
            <NavLink href="/marketing" icon={<Megaphone className="h-4 w-4" />} active={pathname === "/marketing"}>Marketing</NavLink>
          )}
          {p("leads") && (
            <NavLink href="/canais" icon={<MessageSquare className="h-4 w-4" />} active={pathname.startsWith("/canais")}>Canais</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Inteligência */}
      {hasInteligencia && (
        <CollapsibleSection
          label="Inteligência"
          isOpen={openSections.inteligencia}
          onToggle={() => toggleSection("inteligencia")}
        >
          {p("simulador") && (
            <NavLink href="/simulador" icon={<Calculator className="h-4 w-4" />} active={pathname === "/simulador"}>Simulador</NavLink>
          )}
          {p("motor_regras") && (
            <NavLink href="/motor-regras" icon={<Brain className="h-4 w-4" />} active={pathname === "/motor-regras"}>Motor de Regras</NavLink>
          )}
          {p("roteiros") && (
            <NavLink href="/roteiros" icon={<FileText className="h-4 w-4" />} active={pathname === "/roteiros"}>Roteiros</NavLink>
          )}
          {p("mapa_port") && (
            <NavLink href="/mapa-portabilidade" icon={<ArrowRightLeft className="h-4 w-4" />} active={pathname === "/mapa-portabilidade"}>Mapa Port.</NavLink>
          )}
          {p("roteiros") && (
            <NavLink href="/conhecimento" icon={<GraduationCap className="h-4 w-4" />} active={pathname === "/conhecimento"}>Base Conhecimento</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Cadastro */}
      {hasCadastro && (
        <CollapsibleSection
          label="Cadastro"
          isOpen={openSections.cadastro}
          onToggle={() => toggleSection("cadastro")}
        >
          {p("cadastro") && (
            <>
              <NavLink href="/regras" icon={<BookOpen className="h-4 w-4" />} active={pathname.startsWith("/regras")}>Regras</NavLink>
              <NavLink href="/bancos" icon={<Layers className="h-4 w-4" />} active={pathname.startsWith("/bancos")}>Bancos</NavLink>
              <NavLink href="/produtos" icon={<Package className="h-4 w-4" />} active={pathname.startsWith("/produtos")}>Produtos</NavLink>
              <NavLink href="/convenios" icon={<Shield className="h-4 w-4" />} active={pathname.startsWith("/convenios")}>Convênios</NavLink>
              <NavLink href="/credenciais" icon={<KeyRound className="h-4 w-4" />} active={pathname === "/credenciais"}>Credenciais</NavLink>
            </>
          )}
          {p("importacao") && (
            <NavLink href="/importacao" icon={<Upload className="h-4 w-4" />} active={pathname === "/importacao"}>Importar Clientes</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* Sistema */}
      {hasSistema && (
        <CollapsibleSection
          label="Sistema"
          isOpen={openSections.sistema}
          onToggle={() => toggleSection("sistema")}
        >
          {p("relatorios") && (
            <NavLink href="/relatorios" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/relatorios"}>Relatórios</NavLink>
          )}
          {p("auditoria") && (
            <NavLink href="/auditoria" icon={<ScrollText className="h-4 w-4" />} active={pathname === "/auditoria"}>Auditoria</NavLink>
          )}
          {p("auditoria") && (
            <NavLink href="/sla" icon={<Clock className="h-4 w-4" />} active={pathname === "/sla"}>SLA</NavLink>
          )}
          {p("configuracoes") && (
            <NavLink href="/configuracoes" icon={<Settings className="h-4 w-4" />} active={pathname === "/configuracoes"}>Configurações</NavLink>
          )}
          {p("assinatura") && (
            <NavLink href="/assinatura" icon={<CreditCard className="h-4 w-4" />} active={pathname === "/assinatura"}>Minha Assinatura</NavLink>
          )}
        </CollapsibleSection>
      )}

      {/* RH & Compliance */}
      {hasRh && (
        <CollapsibleSection
          label="RH & Compliance"
          isOpen={openSections.rh}
          onToggle={() => toggleSection("rh")}
        >
          <NavLink href="/rh" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/rh"}>Dashboard RH</NavLink>
          <NavLink href="/rh/funcionarios" icon={<UserCheck className="h-4 w-4" />} active={pathname.startsWith("/rh/funcionarios")}>Funcionários</NavLink>
          <NavLink href="/rh/ponto" icon={<Clock className="h-4 w-4" />} active={pathname.startsWith("/rh/ponto")}>Controle de Ponto</NavLink>
          <NavLink href="/rh/espelho" icon={<CalendarDays className="h-4 w-4" />} active={pathname.startsWith("/rh/espelho")}>Espelho de Ponto</NavLink>
          <NavLink href="/rh/ferias" icon={<Palmtree className="h-4 w-4" />} active={pathname.startsWith("/rh/ferias")}>Férias</NavLink>
          <NavLink href="/rh/passivo" icon={<AlertTriangle className="h-4 w-4" />} active={pathname.startsWith("/rh/passivo")}>Passivo Trabalhista</NavLink>
          <NavLink href="/rh/folha" icon={<Receipt className="h-4 w-4" />} active={pathname.startsWith("/rh/folha")}>Folha & Holerites</NavLink>
          <NavLink href="/rh/rescisao" icon={<Gavel className="h-4 w-4" />} active={pathname.startsWith("/rh/rescisao")}>Simulador Rescisão</NavLink>
          <NavLink href="/rh/documentos" icon={<FolderOpen className="h-4 w-4" />} active={pathname.startsWith("/rh/documentos")}>Documentos</NavLink>
          <NavLink href="/rh/auditoria" icon={<Eye className="h-4 w-4" />} active={pathname.startsWith("/rh/auditoria")}>Auditoria</NavLink>
        </CollapsibleSection>
      )}
    </nav>
  );
}


function CollapsibleSection({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-3 pb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 group cursor-pointer"
      >
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-500 group-hover:text-white transition-colors duration-300">
          {label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white transition-colors duration-300" />
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
            <div className="space-y-0.5 pt-1">
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
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 cursor-not-allowed opacity-60">
        {icon}
        <span className="font-medium text-[13px]">{children}</span>
        <span className="ml-auto text-[9px] uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded-md">soon</span>
      </span>
    );
  }

  return (
    <Link href={href} className="relative flex w-full outline-none group">
      <motion.div
        className={`relative flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all duration-300 ${
          active
            ? "text-white font-semibold"
            : "text-zinc-400 hover:text-white hover:bg-white/5 font-medium"
        }`}
        whileHover={{ x: active ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Background Ativo Animado (Efeito Magic Hover/Active) */}
        {active && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute inset-0 bg-white/10 rounded-xl border-l-[3px]"
            style={{
              borderColor: 'var(--brand-primary)',
              boxShadow: 'inset 0px 0px 12px color-mix(in srgb, var(--brand-primary) 20%, transparent)'
            }}
            initial={false}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 30,
            }}
          />
        )}
        
        {/* Conteúdo do Link */}
        <span className="relative z-10 flex items-center gap-3 w-full">
          <motion.div
            className={`flex items-center justify-center ${active ? "text-white" : "text-zinc-500 group-hover:text-white"}`}
            style={active ? { color: 'var(--brand-primary)' } : {}}
            whileHover={{ scale: 1.1, rotate: active ? 0 : [0, -5, 5, 0] }}
            transition={{ duration: 0.3 }}
          >
            {icon}
          </motion.div>
          <span className="text-[13px] tracking-wide relative top-[1px]">
            {children}
          </span>
        </span>
      </motion.div>
    </Link>
  );
}
