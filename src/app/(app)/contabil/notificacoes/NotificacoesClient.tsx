"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, AlertCircle, Info, Shield, Clock, FileText, Award, DollarSign, RefreshCcw } from "lucide-react";

type Notificacao = {
  tipo: "CRITICA" | "ALERTA" | "INFO";
  modulo: string;
  titulo: string;
  descricao: string;
  vencimento?: string;
  diasRestantes?: number;
};

type Data = {
  total: number; criticas: number; alertas: number; info: number;
  notificacoes: Notificacao[];
};

const MODULO_ICON: Record<string, any> = {
  DOCUMENTO: FileText, CERTIFICACAO: Award, LANCAMENTO: DollarSign, CARTEIRA: DollarSign,
};

const TIPO_STYLE: Record<string, { bg: string; border: string; icon: any; dot: string }> = {
  CRITICA: { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", icon: AlertCircle, dot: "bg-rose-500" },
  ALERTA: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: AlertTriangle, dot: "bg-amber-500" },
  INFO: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", icon: Info, dot: "bg-blue-500" },
};

export function NotificacoesClient() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try { const r = await fetch("/api/contabil/notificacoes"); if (r.ok) setData(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const notifs = data?.notificacoes.filter(n => !filtro || n.tipo === filtro) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><Bell className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Central de Alertas</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Notificações</h1>
            <p className="text-zinc-500 text-sm mt-1">Vencimentos, contas pendentes, certificações e alertas do sistema.</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </header>

        {/* KPIs */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: data.total, color: "text-zinc-900 dark:text-white", filter: "" },
              { label: "Críticas", value: data.criticas, color: "text-rose-600", filter: "CRITICA" },
              { label: "Alertas", value: data.alertas, color: "text-amber-600", filter: "ALERTA" },
              { label: "Informativas", value: data.info, color: "text-blue-600", filter: "INFO" },
            ].map((s, i) => (
              <button key={i} onClick={() => setFiltro(filtro === s.filter ? "" : s.filter)}
                className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 text-center transition-all ${filtro === s.filter ? "border-brand ring-2 ring-brand/20" : "border-zinc-200 dark:border-zinc-800"}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-zinc-400">{s.label}</p>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Shield className="w-12 h-12 text-emerald-400 mb-4" />
            <p className="text-zinc-700 dark:text-zinc-300 font-bold">Tudo em dia! 🎉</p>
            <p className="text-xs text-zinc-400 mt-1">Nenhuma notificação pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map((n, i) => {
              const style = TIPO_STYLE[n.tipo];
              const ModuloIcon = MODULO_ICON[n.modulo] || FileText;
              const TipoIcon = style.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`${style.bg} border ${style.border} rounded-2xl p-4 flex items-start gap-4`}>
                  <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                    <TipoIcon className={`h-5 w-5 ${n.tipo === "CRITICA" ? "text-rose-600" : n.tipo === "ALERTA" ? "text-amber-600" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${style.dot} ${n.tipo === "CRITICA" ? "animate-pulse" : ""}`} />
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{n.titulo}</h3>
                      <span className="text-[10px] font-bold bg-white/60 dark:bg-black/20 text-zinc-500 px-1.5 py-0.5 rounded">{n.modulo}</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{n.descricao}</p>
                    {n.vencimento && (
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>Vencimento: {new Date(n.vencimento).toLocaleDateString("pt-BR")}</span>
                        {n.diasRestantes !== undefined && (
                          <span className={`ml-2 font-bold ${n.diasRestantes < 0 ? "text-rose-600" : n.diasRestantes <= 15 ? "text-amber-600" : "text-blue-600"}`}>
                            {n.diasRestantes < 0 ? `${Math.abs(n.diasRestantes)}d atrasado` : `${n.diasRestantes}d restante(s)`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
