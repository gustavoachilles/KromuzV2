"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Search, User, Clock, Filter, Eye } from "lucide-react";

type Log = {
  id: string; usuarioEmail: string; usuarioNome?: string;
  acao: string; entidade: string; entidadeId?: string; entidadeNome?: string;
  detalhes?: any; ip?: string; createdAt: string;
};

function fmtDate(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

const ACOES: Record<string, { label: string; color: string; icon: string }> = {
  CRIAR: { label: "Criou", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", icon: "+" },
  EDITAR: { label: "Editou", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: "✏" },
  EXCLUIR: { label: "Excluiu", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300", icon: "🗑" },
  EXPORTAR: { label: "Exportou", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: "📤" },
  LOGIN: { label: "Login", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", icon: "🔑" },
  LOGOUT: { label: "Logout", color: "bg-zinc-100 text-zinc-600", icon: "🚪" },
};

const ENTIDADES = ["LANCAMENTO", "CARTEIRA", "DOCUMENTO", "CERTIFICACAO", "ATIVO", "BORDERO", "CATEGORIA", "CONTA_BANCARIA", "ORCAMENTO"];

export function AuditoriaClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroEntidade, setFiltroEntidade] = useState("");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroAcao) params.set("acao", filtroAcao);
    if (filtroEntidade) params.set("entidade", filtroEntidade);
    try { const r = await fetch(`/api/contabil/auditoria?${params}`); if (r.ok) setLogs(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchLogs(); }, [filtroAcao, filtroEntidade]);

  const filtered = logs.filter(l => {
    if (busca && !l.usuarioEmail.toLowerCase().includes(busca.toLowerCase()) &&
        !(l.entidadeNome || "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1"><Shield className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Compliance</span></div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Trilha de Auditoria</h1>
          <p className="text-zinc-500 text-sm mt-1">Registro imutável de todas as operações no módulo contábil. Apenas administradores.</p>
        </header>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar por e-mail ou registro..." value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none" />
          </div>
          <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none">
            <option value="">Todas as ações</option>
            {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroEntidade} onChange={e => setFiltroEntidade(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none">
            <option value="">Todos os módulos</option>
            {ENTIDADES.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: logs.length, color: "text-zinc-900 dark:text-white" },
            { label: "Criações", value: logs.filter(l => l.acao === "CRIAR").length, color: "text-emerald-600" },
            { label: "Edições", value: logs.filter(l => l.acao === "EDITAR").length, color: "text-blue-600" },
            { label: "Exclusões", value: logs.filter(l => l.acao === "EXCLUIR").length, color: "text-rose-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Shield className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhum registro de auditoria encontrado.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {filtered.map((l, i) => {
              const acao = ACOES[l.acao] || ACOES.EDITAR;
              return (
                <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                  className="px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer"
                  onClick={() => setExpandido(expandido === l.id ? null : l.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acao.color}`}>{acao.icon} {acao.label}</span>
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{l.entidade.replace("_", " ")}</span>
                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">{l.entidadeNome || l.entidadeId || "—"}</span>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
                      <User className="h-3 w-3" />
                      <span>{l.usuarioEmail.split("@")[0]}</span>
                      <Clock className="h-3 w-3 ml-1" />
                      <span>{fmtDate(l.createdAt)}</span>
                      {l.detalhes && <Eye className="h-3 w-3 ml-1 text-brand" />}
                    </div>
                  </div>
                  {expandido === l.id && l.detalhes && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <pre className="text-[11px] text-zinc-500 font-mono bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 overflow-x-auto max-h-40">
                        {JSON.stringify(l.detalhes, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
