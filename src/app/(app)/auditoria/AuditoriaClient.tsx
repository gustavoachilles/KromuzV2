"use client";

import { useState } from "react";
import {
  ScrollText,
  Filter,
  User,
  Clock,
  PenLine,
  Plus,
  Trash2,
  Link2,
  Upload,
  Eye,
} from "lucide-react";

type LogEntry = {
  id: string;
  usuarioEmail: string;
  usuarioNome: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  entidadeNome: string | null;
  detalhes: any;
  ip: string | null;
  createdAt: string | Date;
};

const acaoConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  criou: { icon: <Plus className="h-3.5 w-3.5" />, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40", label: "Criou" },
  editou: { icon: <PenLine className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", label: "Editou" },
  deletou: { icon: <Trash2 className="h-3.5 w-3.5" />, color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40", label: "Deletou" },
  importou: { icon: <Upload className="h-3.5 w-3.5" />, color: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40", label: "Importou" },
  vinculou: { icon: <Link2 className="h-3.5 w-3.5" />, color: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40", label: "Vinculou" },
  desvinculou: { icon: <Link2 className="h-3.5 w-3.5" />, color: "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800", label: "Desvinculou" },
  visualizou: { icon: <Eye className="h-3.5 w-3.5" />, color: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/40", label: "Visualizou" },
};

const entidadeLabel: Record<string, string> = {
  regra: "Regra",
  banco: "Banco",
  produto: "Produto",
  convenio: "Convênio",
  tabela: "Tabela",
  empresa: "Empresa",
  usuario: "Usuário",
  importacao: "Importação",
};

export function AuditoriaClient({ logs: logsIniciais }: { logs: LogEntry[] }) {
  const [logs] = useState(logsIniciais);
  const [filtroEntidade, setFiltroEntidade] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = logs.filter((l) => {
    if (filtroEntidade && l.entidade !== filtroEntidade) return false;
    if (filtroAcao && l.acao !== filtroAcao) return false;
    return true;
  });

  const entidadesPresentes = [...new Set(logs.map((l) => l.entidade))];
  const acoesPresentes = [...new Set(logs.map((l) => l.acao))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <ScrollText className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Auditoria</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Log de Auditoria</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {logs.length} registro{logs.length !== 1 ? "s" : ""} · {filtrados.length} exibido{filtrados.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Filter className="h-4 w-4" />
            Filtrar:
          </div>
          <select
            value={filtroEntidade}
            onChange={(e) => setFiltroEntidade(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">Todas as entidades</option>
            {entidadesPresentes.map((e) => (
              <option key={e} value={e}>{entidadeLabel[e] || e}</option>
            ))}
          </select>
          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">Todas as ações</option>
            {acoesPresentes.map((a) => (
              <option key={a} value={a}>{acaoConfig[a]?.label || a}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <ScrollText className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum registro de auditoria</h3>
            <p className="text-sm text-zinc-400 mt-1">Ações realizadas na plataforma aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((log) => {
              const cfg = acaoConfig[log.acao] || acaoConfig.editou;
              const aberto = expandido === log.id;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
                    onClick={() => setExpandido(aberto ? null : log.id)}
                  >
                    {/* Ação badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    {/* Descrição */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {entidadeLabel[log.entidade] || log.entidade}
                        </span>
                        {log.entidadeNome && (
                          <span className="text-zinc-500"> · {log.entidadeNome}</span>
                        )}
                      </p>
                    </div>

                    {/* Usuário */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{log.usuarioNome || log.usuarioEmail}</span>
                    </div>

                    {/* Data */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 tabular-nums shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {aberto && log.detalhes && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 bg-zinc-50/50 dark:bg-zinc-800/20">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">
                        Detalhes da alteração
                      </h4>
                      <div className="space-y-1.5 text-xs font-mono">
                        {Object.entries(log.detalhes).map(([campo, val]: [string, any]) => (
                          <div key={campo} className="flex items-start gap-2">
                            <span className="text-zinc-500 shrink-0 w-36 truncate">{campo}:</span>
                            {val && typeof val === "object" && "de" in val ? (
                              <span>
                                <span className="text-red-500 line-through">{String(val.de ?? "—")}</span>
                                {" → "}
                                <span className="text-emerald-600 font-medium">{String(val.para ?? "—")}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-300">{JSON.stringify(val)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {log.ip && (
                        <p className="text-[10px] text-zinc-400 mt-3">IP: {log.ip}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
