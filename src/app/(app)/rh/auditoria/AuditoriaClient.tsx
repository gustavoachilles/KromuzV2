"use client";
import { useState, useMemo } from "react";
import { Shield, Search, UserCheck, Edit, Trash2, Clock, Palmtree, FileText, Download } from "lucide-react";
import { exportarCSV } from "@/lib/rh/exportacao";

type Log = { id: string; usuarioEmail: string; acao: string; entidade: string; entidadeId?: string | null; descricao: string; ipAddress?: string | null; createdAt: string; dadosAntes?: unknown; dadosDepois?: unknown };

const ACAO_ICONS: Record<string, React.ReactNode> = {
  CRIAR_FUNCIONARIO: <UserCheck className="h-3.5 w-3.5 text-emerald-500" />,
  EDITAR_FUNCIONARIO: <Edit className="h-3.5 w-3.5 text-blue-500" />,
  EXCLUIR_FUNCIONARIO: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  BATER_PONTO: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  AGENDAR_FERIAS: <Palmtree className="h-3.5 w-3.5 text-cyan-500" />,
};

const ACAO_COLORS: Record<string, string> = {
  CRIAR_FUNCIONARIO: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700",
  EDITAR_FUNCIONARIO: "bg-blue-50 dark:bg-blue-950/30 text-blue-700",
  EXCLUIR_FUNCIONARIO: "bg-red-50 dark:bg-red-950/30 text-red-700",
  BATER_PONTO: "bg-amber-50 dark:bg-amber-950/30 text-amber-700",
  AGENDAR_FERIAS: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700",
};

export function AuditoriaClient({ logs }: { logs: Log[] }) {
  const [filtro, setFiltro] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("TODAS");

  const acoes = useMemo(() => {
    const set = new Set(logs.map(l => l.acao));
    return ["TODAS", ...Array.from(set)];
  }, [logs]);

  const filtrados = useMemo(() => {
    return logs.filter(l => {
      if (filtroAcao !== "TODAS" && l.acao !== filtroAcao) return false;
      if (filtro) {
        const q = filtro.toLowerCase();
        return l.descricao.toLowerCase().includes(q) || l.usuarioEmail.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, filtro, filtroAcao]);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>🔍 AUDITORIA</p>
            <h1 className="text-3xl font-bold tracking-tight">Log de Auditoria RH</h1>
            <p className="text-sm text-zinc-500 mt-1">Registro de todas as alterações no módulo de RH & Compliance</p>
          </div>
          <button onClick={() => {
            const linhas: (string|number)[][] = [["Data", "Usuário", "Ação", "Descrição", "IP"]];
            filtrados.forEach(l => linhas.push([fmtDate(l.createdAt), l.usuarioEmail, l.acao, l.descricao, l.ipAddress || ""]));
            exportarCSV("auditoria_rh", linhas);
          }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input type="text" placeholder="Buscar por descrição ou email..." value={filtro} onChange={e => setFiltro(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {acoes.map(a => (
              <button key={a} onClick={() => setFiltroAcao(a)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${filtroAcao === a ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200"}`}>
                {a.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
              <p className="text-sm text-zinc-500">Nenhum registro de auditoria encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {filtrados.map(l => (
                <div key={l.id} className="flex items-start gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition">
                  <div className="mt-0.5 h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {ACAO_ICONS[l.acao] || <FileText className="h-3.5 w-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{l.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${ACAO_COLORS[l.acao] || "bg-zinc-100 text-zinc-500"}`}>{l.acao.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-zinc-400">{l.usuarioEmail}</span>
                      {l.ipAddress && <span className="text-[10px] text-zinc-300">IP: {l.ipAddress}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0 tabular-nums">{fmtDate(l.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-zinc-400 text-center">Exibindo {filtrados.length} de {logs.length} registros (últimos 200)</p>
      </div>
    </div>
  );
}
