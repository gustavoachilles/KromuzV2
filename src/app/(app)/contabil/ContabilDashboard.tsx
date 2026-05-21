"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, AlertTriangle, PieChart,
  ChevronLeft, ChevronRight, Wallet, ArrowUpRight, ArrowDownRight,
  BadgePercent, Calculator, BarChart3, Shield, Clock
} from "lucide-react";

type DREData = {
  periodo: { mes: number; ano: number };
  resumo: {
    receitaComissoes: number;
    receitaOutras: number;
    receitaTotal: number;
    totalDespesas: number;
    totalImpostos: number;
    lucroLiquido: number;
    margemLucro: number;
    volumeLiberado: number;
    qtdPropostasPagas: number;
  };
  despesasPorCategoria: { nome: string; grupo: string | null; cor: string | null; total: number }[];
  vencidos: { quantidade: number; valorTotal: number };
  budgetStatus: {
    categoriaId: string;
    categoriaNome: string;
    limite: number;
    gasto: number;
    percentual: number;
    alertaPercentual: number;
    estourado: boolean;
    emAlerta: boolean;
    travaBloqueio: boolean;
  }[];
  lancamentos: any[];
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContabilDashboard() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [data, setData] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDRE = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contabil/dre?mes=${mes}&ano=${ano}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { fetchDRE(); }, [fetchDRE]);

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  };

  const r = data?.resumo;
  const maxDespesa = data?.despesasPorCategoria?.[0]?.total || 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Calculator className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Módulo Contábil & Fiscal</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              DRE — Demonstrativo de Resultados
            </h1>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 shadow-sm">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <ChevronLeft className="h-5 w-5 text-zinc-500" />
            </button>
            <span className="font-bold text-zinc-900 dark:text-white min-w-[160px] text-center">
              {MESES[mes - 1]} {ano}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <ChevronRight className="h-5 w-5 text-zinc-500" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : r ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mes}-${ano}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Cards KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard
                  label="Receita Total"
                  value={fmt(r.receitaTotal)}
                  sub={`${r.qtdPropostasPagas} propostas pagas`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="emerald"
                />
                <KPICard
                  label="Despesas"
                  value={fmt(r.totalDespesas)}
                  sub={`${data?.despesasPorCategoria?.length || 0} categorias`}
                  icon={<TrendingDown className="h-5 w-5" />}
                  color="rose"
                />
                <KPICard
                  label="Impostos"
                  value={fmt(r.totalImpostos)}
                  sub="Tributos do período"
                  icon={<Receipt className="h-5 w-5" />}
                  color="amber"
                />
                <KPICard
                  label="Lucro Líquido"
                  value={fmt(r.lucroLiquido)}
                  sub={`Margem: ${r.margemLucro}%`}
                  icon={<Wallet className="h-5 w-5" />}
                  color={r.lucroLiquido >= 0 ? "emerald" : "rose"}
                  highlight
                />
              </div>

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Composição da Receita */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Composição da Receita
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Comissões (Esteira)</span>
                      <span className="font-bold text-emerald-600">{fmt(r.receitaComissoes)}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${r.receitaTotal > 0 ? (r.receitaComissoes / r.receitaTotal) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Outras Receitas</span>
                      <span className="font-bold text-emerald-600">{fmt(r.receitaOutras)}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-300 rounded-full transition-all duration-700"
                        style={{ width: `${r.receitaTotal > 0 ? (r.receitaOutras / r.receitaTotal) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Volume Liberado</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{fmt(r.volumeLiberado)}</span>
                    </div>
                  </div>
                </div>

                {/* Despesas por Categoria */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-rose-500" /> Despesas por Categoria
                  </h3>
                  {data?.despesasPorCategoria && data.despesasPorCategoria.length > 0 ? (
                    <div className="space-y-3">
                      {data.despesasPorCategoria.map((cat, i) => (
                        <motion.div
                          key={cat.nome}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.cor || `hsl(${i * 40}, 60%, 50%)` }}
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400 flex-1 truncate">{cat.nome}</span>
                          <div className="w-40 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.cor || `hsl(${i * 40}, 60%, 50%)` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(cat.total / maxDespesa) * 100}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                            />
                          </div>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white min-w-[100px] text-right">
                            {fmt(cat.total)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma despesa lançada neste período.</p>
                  )}
                </div>
              </div>

              {/* Alertas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contas Vencidas */}
                {data?.vencidos && data.vencidos.quantidade > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-rose-800 dark:text-rose-300">Contas Vencidas</h4>
                        <p className="text-sm text-rose-600 dark:text-rose-400">
                          {data.vencidos.quantidade} conta(s) pendente(s) — Total: {fmt(data.vencidos.valorTotal)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Budget Alerts */}
                {data?.budgetStatus && data.budgetStatus.filter(b => b.emAlerta).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-amber-600" />
                      </div>
                      <h4 className="font-bold text-amber-800 dark:text-amber-300">Budget Control</h4>
                    </div>
                    <div className="space-y-3">
                      {data.budgetStatus.filter(b => b.emAlerta).map(b => (
                        <div key={b.categoriaId} className="flex items-center justify-between">
                          <span className="text-sm text-amber-700 dark:text-amber-400">{b.categoriaNome}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.estourado ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                              {b.percentual.toFixed(0)}%
                            </span>
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              {fmt(b.gasto)} / {fmt(b.limite)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Últimos Lançamentos */}
              {data?.lancamentos && data.lancamentos.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-brand" /> Lançamentos do Período
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800">
                          <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Descrição</th>
                          <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Categoria</th>
                          <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Vencimento</th>
                          <th className="text-right py-3 px-2 text-zinc-400 font-semibold">Valor</th>
                          <th className="text-center py-3 px-2 text-zinc-400 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lancamentos.slice(0, 20).map((l: any) => (
                          <tr key={l.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 px-2 font-medium text-zinc-900 dark:text-white">{l.descricao}</td>
                            <td className="py-3 px-2 text-zinc-500">{l.categoria?.nome}</td>
                            <td className="py-3 px-2 text-zinc-500">
                              {new Date(l.dataVencimento).toLocaleDateString("pt-BR")}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold ${l.tipo === "RECEITA" ? "text-emerald-600" : "text-rose-600"}`}>
                              {l.tipo === "RECEITA" ? "+" : "-"} {fmt(l.valor)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                l.status === "PAGO" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                l.status === "VENCIDO" ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" :
                                l.status === "CANCELADO" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" :
                                "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              }`}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!data?.lancamentos || data.lancamentos.length === 0) && r.receitaTotal === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5">
                    <PieChart className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <h2 className="text-lg font-light text-zinc-500 dark:text-zinc-400">Nenhum lançamento neste período</h2>
                  <p className="text-sm mt-2 max-w-sm text-center">
                    Acesse "Contas a Pagar/Receber" no menu lateral para registrar seus primeiros lançamentos financeiros.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}

function KPICard({
  label, value, sub, icon, color, highlight
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  color: "emerald" | "rose" | "amber" | "brand"; highlight?: boolean;
}) {
  const colors = {
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-800",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800",
    brand: "from-brand/10 to-brand/5 border-brand/30",
  };
  const iconColors = {
    emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50",
    rose: "text-rose-600 bg-rose-100 dark:bg-rose-900/50",
    amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/50",
    brand: "text-brand bg-brand/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colors[color]} rounded-3xl border p-5 shadow-sm ${highlight ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 ring-brand/30' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{value}</div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{sub}</p>
    </motion.div>
  );
}
