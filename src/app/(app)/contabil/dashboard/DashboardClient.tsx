"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Building2, Users, AlertCircle, ChevronLeft, ChevronRight, PieChart } from "lucide-react";
import { SkeletonPage } from "@/components/ui/Skeleton";

type MesData = { mes: number; label: string; receitas: number; despesas: number; impostos: number; resultado: number };
type Despesa = { nome: string; cor: string | null; valor: number };
type Fluxo = { mes: string; acumulado: number };
type Resumo = {
  totalReceitas: number; totalDespesas: number; totalImpostos: number; resultadoAno: number;
  totalPendente: number; totalVencido: number;
  comissoesTotal: number; comissoesCount: number; patrimonioTotal: number;
};
type DashData = { ano: number; meses: MesData[]; topDespesas: Despesa[]; fluxoCaixa: Fluxo[]; resumo: Resumo };

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }); }

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />;
}

export function DashboardClient() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());

  const fetchData = async () => {
    setLoading(true);
    try { const r = await fetch(`/api/contabil/dashboard?ano=${ano}`); if (r.ok) setData(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, [ano]);

  if (loading) return <SkeletonPage />;
  if (!data) return null;

  const { resumo, meses, topDespesas, fluxoCaixa } = data;
  const maxMes = Math.max(...meses.map(m => Math.max(m.receitas, m.despesas)));
  const maxDesp = topDespesas.length > 0 ? topDespesas[0].valor : 1;
  const fluxoMin = Math.min(...fluxoCaixa.map(f => f.acumulado));
  const fluxoMax = Math.max(...fluxoCaixa.map(f => f.acumulado));
  const fluxoRange = fluxoMax - fluxoMin || 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><BarChart3 className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Business Intelligence</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard Financeiro</h1>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2">
            <button onClick={() => setAno(a => a - 1)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 w-12 text-center">{ano}</span>
            <button onClick={() => setAno(a => a + 1)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Receitas", value: fmt(resumo.totalReceitas), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Despesas", value: fmt(resumo.totalDespesas), icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
            { label: "Resultado", value: fmt(resumo.resultadoAno), icon: DollarSign, color: resumo.resultadoAno >= 0 ? "text-emerald-600" : "text-rose-600", bg: resumo.resultadoAno >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20" },
            { label: "Patrimônio", value: fmt(resumo.patrimonioTotal), icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Comissões", value: fmt(resumo.comissoesTotal), icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-zinc-400 font-medium">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Alertas */}
        {(resumo.totalVencido > 0 || resumo.totalPendente > 0) && (
          <div className="flex gap-3 flex-wrap">
            {resumo.totalVencido > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">{fmt(resumo.totalVencido)} em contas vencidas</span>
              </div>
            )}
            {resumo.totalPendente > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{fmt(resumo.totalPendente)} em contas pendentes</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico Receitas vs Despesas */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Receitas vs Despesas</h2>
            <div className="space-y-2">
              {meses.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 w-8 shrink-0 text-right">{m.label}</span>
                  <div className="flex-1 flex gap-1 h-5">
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <Bar value={m.receitas} max={maxMes} color="bg-emerald-500" />
                    </div>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <Bar value={m.despesas} max={maxMes} color="bg-rose-400" />
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold w-16 text-right ${m.resultado >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {m.resultado >= 0 ? "+" : ""}{fmt(m.resultado)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Receitas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400" /> Despesas</span>
            </div>
          </div>

          {/* Top Despesas */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4"><PieChart className="h-4 w-4 text-zinc-400" /><h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Top Categorias de Despesa</h2></div>
            <div className="space-y-3">
              {topDespesas.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{d.nome}</span>
                    <span className="text-zinc-500 font-bold">{fmt(d.valor)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <Bar value={d.valor} max={maxDesp} color={d.cor ? `bg-[${d.cor}]` : "bg-brand"} />
                  </div>
                </div>
              ))}
              {topDespesas.length === 0 && <p className="text-xs text-zinc-400 text-center py-8">Sem despesas no período</p>}
            </div>
          </div>
        </div>

        {/* Fluxo de Caixa Acumulado */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Fluxo de Caixa Acumulado</h2>
          <div className="flex items-end gap-1 h-40">
            {fluxoCaixa.map((f, i) => {
              const pct = ((f.acumulado - fluxoMin) / fluxoRange) * 100;
              const isNeg = f.acumulado < 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[9px] font-bold ${isNeg ? "text-rose-600" : "text-emerald-600"}`}>{fmt(f.acumulado)}</span>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(4, pct)}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                      className={`w-full rounded-t-lg ${isNeg ? "bg-rose-400/80" : "bg-gradient-to-t from-brand to-emerald-400"}`} />
                  </div>
                  <span className="text-[10px] text-zinc-400">{f.mes}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
