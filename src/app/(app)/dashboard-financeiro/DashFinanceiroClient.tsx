"use client";

import { DollarSign, TrendingUp, Building2, CheckCircle2, BarChart3 } from "lucide-react";

type MesData = { label: string; volume: number; comissao: number; parcela: number; count: number };
type BancoGrupo = { bancoNome: string | null; _count: number; _sum: { valorLiberado: number | null; valorComissao: number | null } };
type Totais = { volume: number; comissao: number; count: number };

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function fmtFull(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function DashFinanceiroClient({ meses, porBanco, totais }: { meses: MesData[]; porBanco: BancoGrupo[]; totais: Totais }) {
  const maxVolume = Math.max(...meses.map((m) => m.volume), 1);
  const maxBanco = Math.max(...porBanco.map((b) => b._sum.valorLiberado || 0), 1);
  const taxaComissao = totais.volume > 0 ? ((totais.comissao / totais.volume) * 100).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <DollarSign className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Financeiro</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Visão consolidada de receitas e comissões</p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBox icon={<TrendingUp className="h-4 w-4" />} label="Volume Total Pago" value={fmtFull(totais.volume)} color="text-violet-600" />
          <KpiBox icon={<DollarSign className="h-4 w-4" />} label="Comissões Totais" value={fmtFull(totais.comissao)} color="text-emerald-600" />
          <KpiBox icon={<CheckCircle2 className="h-4 w-4" />} label="Propostas Pagas" value={String(totais.count)} color="text-indigo-600" />
          <KpiBox icon={<BarChart3 className="h-4 w-4" />} label="Taxa Média Comissão" value={`${taxaComissao}%`} color="text-amber-600" />
        </div>

        {/* Evolução Mensal */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-1">Evolução Mensal</h2>
          <p className="text-xs text-zinc-500 mb-6">Volume pago nos últimos 6 meses</p>
          <div className="flex items-end gap-3 h-48">
            {meses.map((m) => {
              const h = maxVolume > 0 ? Math.max((m.volume / maxVolume) * 100, 4) : 4;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500 tabular-nums">{fmt(m.volume)}</span>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all duration-700"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">{m.label}</span>
                  <span className="text-[9px] text-zinc-400">{m.count} prop</span>
                </div>
              );
            })}
          </div>
          {/* Comissão line */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-6 overflow-x-auto">
            {meses.map((m) => (
              <div key={m.label} className="text-center shrink-0">
                <p className="text-xs font-semibold text-emerald-600 tabular-nums">{fmt(m.comissao)}</p>
                <p className="text-[9px] text-zinc-400">comissão</p>
              </div>
            ))}
          </div>
        </div>

        {/* Por Banco */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-1">Volume por Banco</h2>
          <p className="text-xs text-zinc-500 mb-6">Top bancos por produção paga</p>
          {porBanco.length === 0 ? (
            <p className="text-center text-zinc-400 py-12 text-sm">Nenhuma proposta paga ainda.</p>
          ) : (
            <div className="space-y-3">
              {porBanco.map((b) => {
                const vol = b._sum.valorLiberado || 0;
                const com = b._sum.valorComissao || 0;
                return (
                  <div key={b.bancoNome || "N/A"} className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-32 shrink-0 truncate">{b.bancoNome || "N/A"}</span>
                    <div className="flex-1 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max((vol / maxBanco) * 100, 8)}%` }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{b._count}</span>
                    </div>
                    <div className="text-right shrink-0 w-28">
                      <p className="text-xs font-bold tabular-nums">{fmtFull(vol)}</p>
                      <p className="text-[10px] text-emerald-600 tabular-nums">+{fmtFull(com)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-xs text-zinc-500">{label}</span></div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
