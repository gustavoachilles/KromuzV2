"use client";

import {
  BarChart3,
  Users,
  Building2,
  BookOpen,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

type StatusGroup = {
  status: string;
  _count: number;
  _sum: { valorLiberado: number | null; valorComissao: number | null };
};

type TipoGroup = {
  tipoOperacao: string;
  _count: number;
  _sum: { valorLiberado: number | null };
};

type KPIs = {
  totalPropostas: number;
  totalLeads: number;
  totalBancos: number;
  totalRegras: number;
};

const statusLabel: Record<string, string> = {
  RASCUNHO: "Rascunho", SIMULADA: "Simulada", DIGITADA: "Digitada",
  PENDENTE: "Pendente", APROVADA: "Aprovada", REPROVADA: "Reprovada",
  PAGA: "Paga", CANCELADA: "Cancelada",
};

const statusColor: Record<string, string> = {
  RASCUNHO: "bg-zinc-400", SIMULADA: "bg-sky-500", DIGITADA: "bg-amber-500",
  PENDENTE: "bg-orange-500", APROVADA: "bg-emerald-500", REPROVADA: "bg-red-500",
  PAGA: "bg-brand", CANCELADA: "bg-zinc-500",
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova", REFINANCIAMENTO: "Refinanciamento",
  PORTABILIDADE: "Portabilidade", PORTABILIDADE_REFIN: "Port + Refin",
  CARTAO_CONSIGNADO: "Cartão Consig.", CARTAO_BENEFICIO: "Cartão Benefício",
};

const tipoColor: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "bg-emerald-500", REFINANCIAMENTO: "bg-amber-500",
  PORTABILIDADE: "bg-brand/80", PORTABILIDADE_REFIN: "bg-brand",
  CARTAO_CONSIGNADO: "bg-brand/60", CARTAO_BENEFICIO: "bg-pink-500",
};

function formatMoney(v: number | null) {
  if (!v) return "R$ 0,00";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function RelatoriosClient({
  propostasPorStatus,
  propostasPorTipo,
  kpis,
}: {
  propostasPorStatus: StatusGroup[];
  propostasPorTipo: TipoGroup[];
  kpis: KPIs;
}) {
  const totalLiberado = propostasPorStatus.reduce((s, x) => s + (x._sum.valorLiberado || 0), 0);
  const totalComissao = propostasPorStatus.reduce((s, x) => s + (x._sum.valorComissao || 0), 0);
  const pagos = propostasPorStatus.find((x) => x.status === "PAGA");
  const aprovados = propostasPorStatus.find((x) => x.status === "APROVADA");
  const produzido = (pagos?._sum.valorLiberado || 0) + (aprovados?._sum.valorLiberado || 0);

  const maxStatus = Math.max(...propostasPorStatus.map((x) => x._count), 1);
  const maxTipo = Math.max(...propostasPorTipo.map((x) => x._count), 1);

  const taxaConversao = kpis.totalLeads > 0
    ? (((pagos?._count || 0) / kpis.totalLeads) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-brand mb-1">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Relatórios</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Performance consolidada da operação</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiMini icon={<FileText className="h-4 w-4" />} label="Propostas" value={kpis.totalPropostas} color="brand" />
          <KpiMini icon={<Users className="h-4 w-4" />} label="Leads" value={kpis.totalLeads} color="brand" />
          <KpiMini icon={<DollarSign className="h-4 w-4" />} label="Vol. Liberado" value={formatMoney(totalLiberado)} color="emerald" />
          <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Produção" value={formatMoney(produzido)} color="brand" />
          <KpiMini icon={<CheckCircle2 className="h-4 w-4" />} label="Conversão" value={`${taxaConversao}%`} color="amber" />
          <KpiMini icon={<DollarSign className="h-4 w-4" />} label="Comissões" value={formatMoney(totalComissao)} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Propostas por Status */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold mb-1">Propostas por Status</h2>
            <p className="text-xs text-zinc-500 mb-6">{kpis.totalPropostas} propostas no total</p>

            {propostasPorStatus.length === 0 ? (
              <p className="text-center text-zinc-400 py-12 text-sm">Nenhuma proposta ainda.</p>
            ) : (
              <div className="space-y-3">
                {propostasPorStatus
                  .sort((a, b) => b._count - a._count)
                  .map((r) => (
                    <div key={r.status} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 w-24 shrink-0 truncate">
                        {statusLabel[r.status] || r.status}
                      </span>
                      <div className="flex-1 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full rounded-lg ${statusColor[r.status] || "bg-zinc-500"} transition-all duration-500`}
                          style={{ width: `${Math.max((r._count / maxStatus) * 100, 8)}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                          {r._count}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 w-24 text-right tabular-nums shrink-0">
                        {formatMoney(r._sum.valorLiberado)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Propostas por Tipo de Operação */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold mb-1">Por Tipo de Operação</h2>
            <p className="text-xs text-zinc-500 mb-6">Volume por modalidade</p>

            {propostasPorTipo.length === 0 ? (
              <p className="text-center text-zinc-400 py-12 text-sm">Nenhuma proposta ainda.</p>
            ) : (
              <div className="space-y-3">
                {propostasPorTipo
                  .sort((a, b) => b._count - a._count)
                  .map((r) => (
                    <div key={r.tipoOperacao} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 w-28 shrink-0 truncate">
                        {tipoLabel[r.tipoOperacao] || r.tipoOperacao}
                      </span>
                      <div className="flex-1 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full rounded-lg ${tipoColor[r.tipoOperacao] || "bg-zinc-500"} transition-all duration-500`}
                          style={{ width: `${Math.max((r._count / maxTipo) * 100, 8)}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                          {r._count}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 w-24 text-right tabular-nums shrink-0">
                        {formatMoney(r._sum.valorLiberado)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Bancos Ativos" value={kpis.totalBancos} icon={<Building2 className="h-5 w-5" />} />
          <StatCard label="Regras Ativas" value={kpis.totalRegras} icon={<BookOpen className="h-5 w-5" />} />
          <StatCard label="Propostas Pagas" value={pagos?._count || 0} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard label="Valor Pago" value={formatMoney(pagos?._sum.valorLiberado || 0)} icon={<DollarSign className="h-5 w-5" />} />
        </div>
      </div>
    </div>
  );
}

function KpiMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand/10 text-brand",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
      <div className="flex justify-center text-zinc-400 mb-2">{icon}</div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
