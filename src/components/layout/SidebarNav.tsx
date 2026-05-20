"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <nav className="flex-1 px-3 py-2 space-y-0.5 text-sm overflow-y-auto">
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
    <div className="pt-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 group cursor-pointer"
      >
        <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition">
          {label}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-400 dark:text-zinc-600 transition-transform duration-200 ${
            isOpen ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-0.5 pt-0.5">
          {children}
        </div>
      </div>
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
      <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 cursor-not-allowed">
        {icon}
        {children}
        <span className="ml-auto text-[10px] uppercase tracking-wider">soon</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition font-medium ${
        active
          ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      }`}
      style={active ? { color: 'var(--brand-primary)', backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' } : {}}
    >
      {icon}
      {children}
    </Link>
  );
}
