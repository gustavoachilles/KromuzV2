"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, MessageSquare, Clock, Users, CheckCircle2, Bot, TrendingUp } from "lucide-react";
import { SkeletonPage } from "@/components/ui/Skeleton";

type DashData = {
  total: number; abertas: number; fechadas: number; aguardando: number;
  conversasHoje: number; tempoMedioResposta: number; taxaResolucao: number;
  conversasPorCanal: { canal: string; tipo: string; total: number }[];
  conversasPorAtendente: { nome: string; email: string; total: number }[];
};

function fmtTempo(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

export function DashboardAtendimentoClient() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inbox/dashboard").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonPage />;
  if (!data) return <div className="p-12 text-center text-zinc-400">Erro ao carregar</div>;

  const kpis = [
    { label: "Conversas Hoje", value: data.conversasHoje, icon: MessageSquare, color: "text-brand" },
    { label: "Abertas", value: data.abertas, icon: MessageSquare, color: "text-emerald-600" },
    { label: "Aguardando Bot", value: data.aguardando, icon: Bot, color: "text-amber-600" },
    { label: "Tempo Médio", value: fmtTempo(data.tempoMedioResposta), icon: Clock, color: "text-blue-600" },
    { label: "Taxa Resolução", value: `${data.taxaResolucao}%`, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Total Geral", value: data.total, icon: TrendingUp, color: "text-zinc-600" },
  ];

  const maxCanal = Math.max(...data.conversasPorCanal.map(c => c.total), 1);
  const maxAtend = Math.max(...data.conversasPorAtendente.map(a => a.total), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1"><BarChart3 className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Atendimento</span></div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard de Atendimento</h1>
          <p className="text-zinc-500 text-sm mt-1">Métricas de performance do inbox omnichannel.</p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <k.icon className={`h-5 w-5 ${k.color} mb-2`} />
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">{k.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Canal */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Conversas por Canal</h3>
            <div className="space-y-3">
              {data.conversasPorCanal.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 w-28 truncate font-semibold">{c.canal}</span>
                  <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(c.total / maxCanal) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="h-full bg-brand rounded-full flex items-center justify-end pr-2">
                      <span className="text-[10px] font-bold text-white">{c.total}</span>
                    </motion.div>
                  </div>
                </div>
              ))}
              {data.conversasPorCanal.length === 0 && <p className="text-sm text-zinc-400">Sem dados</p>}
            </div>
          </div>

          {/* Por Atendente */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-brand" /> Ranking Atendentes</h3>
            <div className="space-y-3">
              {data.conversasPorAtendente.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-6">{i + 1}º</span>
                  <div className="w-7 h-7 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand text-[10px] font-bold shrink-0">
                    {a.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{a.nome}</p>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(a.total / maxAtend) * 100}%` }} transition={{ delay: i * 0.1 }}
                        className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-500">{a.total}</span>
                </div>
              ))}
              {data.conversasPorAtendente.length === 0 && <p className="text-sm text-zinc-400">Sem dados</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
