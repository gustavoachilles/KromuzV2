"use client";

import React, { useState } from "react";
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  PlusCircle, 
  Edit, 
  Trash2, 
  ArrowRightLeft,
  FileDown
} from "lucide-react";

export function AuditoriaClient({ logs: initLogs }: { logs: any[] }) {
  const [logs, setLogs] = useState(initLogs);
  const [busca, setBusca] = useState("");

  const getIcon = (acao: string) => {
    const a = acao.toLowerCase();
    if (a.includes("criou") || a.includes("adicionou")) return <PlusCircle className="w-4 h-4 text-emerald-500" />;
    if (a.includes("editou") || a.includes("alterou")) return <Edit className="w-4 h-4 text-amber-500" />;
    if (a.includes("deletou") || a.includes("removeu")) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (a.includes("vinculou") || a.includes("transferiu")) return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    if (a.includes("importou")) return <FileDown className="w-4 h-4 text-violet-500" />;
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  const filteredLogs = logs.filter(log => 
    log.usuarioEmail.toLowerCase().includes(busca.toLowerCase()) ||
    log.acao.toLowerCase().includes(busca.toLowerCase()) ||
    log.entidade.toLowerCase().includes(busca.toLowerCase()) ||
    (log.entidadeNome && log.entidadeNome.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-600" />
            Logs de Auditoria
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Rastreabilidade total das ações realizadas por todos os usuários.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Filtrar por usuário, ação ou entidade..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 transition">
              <Calendar className="w-3.5 h-3.5" /> Últimos 30 dias
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 transition">
              <Filter className="w-3.5 h-3.5" /> Mais Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-6 py-3">Data/Hora</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Ação</th>
                <th className="px-6 py-3">Entidade</th>
                <th className="px-6 py-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                        {log.usuarioNome?.substring(0,2).toUpperCase() || log.usuarioEmail.substring(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{log.usuarioNome || "Sistema"}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{log.usuarioEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {getIcon(log.acao)}
                      {log.acao}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {log.entidade}
                    </div>
                    <div className="text-[10px] text-zinc-500 italic">
                      {log.entidadeNome || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {log.ip || "0.0.0.0"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    Nenhum registro encontrado para esta busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
