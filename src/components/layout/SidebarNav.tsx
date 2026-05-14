"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, FileText, Layers, Settings, Calculator, BookOpen, BarChart3, Shield, Package, ScrollText, Kanban, Users, DollarSign, Target, Trophy, Upload, ArrowRightLeft, PieChart, CreditCard } from "lucide-react";

export function SidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 text-sm overflow-y-auto">
      <NavLink href="/dashboard" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/dashboard"}>
        Dashboard
      </NavLink>
      <NavLink href="/dashboard-financeiro" icon={<DollarSign className="h-4 w-4" />} active={pathname === "/dashboard-financeiro"}>
        Financeiro
      </NavLink>
      <NavLink href="/vendedores" icon={<PieChart className="h-4 w-4" />} active={pathname === "/vendedores"}>
        Vendedores
      </NavLink>

      <SectionLabel>CRM</SectionLabel>
      <NavLink href="/leads" icon={<Users className="h-4 w-4" />} active={pathname === "/leads"}>
        Leads
      </NavLink>
      <NavLink href="/esteira" icon={<Kanban className="h-4 w-4" />} active={pathname === "/esteira"}>
        Esteira
      </NavLink>
      <NavLink href="/comissoes" icon={<DollarSign className="h-4 w-4" />} active={pathname === "/comissoes"}>
        Comissões
      </NavLink>
      <NavLink href="/metas" icon={<Target className="h-4 w-4" />} active={pathname === "/metas"}>
        Metas
      </NavLink>
      <NavLink href="/ranking" icon={<Trophy className="h-4 w-4" />} active={pathname === "/ranking"}>
        Ranking
      </NavLink>

      <SectionLabel>Inteligência</SectionLabel>
      <NavLink href="/simulador" icon={<Calculator className="h-4 w-4" />} active={pathname === "/simulador"}>
        Simulador
      </NavLink>
      <NavLink href="/motor-regras" icon={<Brain className="h-4 w-4" />} active={pathname === "/motor-regras"}>
        Motor de Regras
      </NavLink>
      <NavLink href="/roteiros" icon={<FileText className="h-4 w-4" />} active={pathname === "/roteiros"}>
        Roteiros
      </NavLink>
      <NavLink href="/mapa-portabilidade" icon={<ArrowRightLeft className="h-4 w-4" />} active={pathname === "/mapa-portabilidade"}>
        Mapa Port.
      </NavLink>

      <SectionLabel>Cadastro</SectionLabel>
      <NavLink href="/regras" icon={<BookOpen className="h-4 w-4" />} active={pathname.startsWith("/regras")}>
        Regras
      </NavLink>
      <NavLink href="/bancos" icon={<Layers className="h-4 w-4" />} active={pathname.startsWith("/bancos")}>
        Bancos
      </NavLink>
      <NavLink href="/produtos" icon={<Package className="h-4 w-4" />} active={pathname.startsWith("/produtos")}>
        Produtos
      </NavLink>
      <NavLink href="/convenios" icon={<Shield className="h-4 w-4" />} active={pathname.startsWith("/convenios")}>
        Convênios
      </NavLink>
      <NavLink href="/importacao" icon={<Upload className="h-4 w-4" />} active={pathname === "/importacao"}>
        Importar
      </NavLink>

      <SectionLabel>Sistema</SectionLabel>
      <NavLink href="/relatorios" icon={<BarChart3 className="h-4 w-4" />} active={pathname === "/relatorios"}>
        Relatórios
      </NavLink>
      <NavLink href="/auditoria" icon={<ScrollText className="h-4 w-4" />} active={pathname === "/auditoria"}>
        Auditoria
      </NavLink>
      <NavLink href="/configuracoes" icon={<Settings className="h-4 w-4" />} active={pathname === "/configuracoes"}>
        Configurações
      </NavLink>
      <NavLink href="/assinatura" icon={<CreditCard className="h-4 w-4" />} active={pathname === "/assinatura"}>
        Minha Assinatura
      </NavLink>
    </nav>
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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
        active
          ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand font-medium"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 pb-1 px-3">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-600">
        {children}
      </span>
    </div>
  );
}
