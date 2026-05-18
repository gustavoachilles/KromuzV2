"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  Brain,
  ChevronRight,
} from "lucide-react";

type Importacao = {
  id: string;
  nomeArquivo: string;
  bancoHint: string | null;
  status: string;
  progresso: number;
  etapa: string | null;
  erro: string | null;
  modeloIa: string | null;
  resultado: any;
  createdAt: string | Date;
  concluidoEm: string | Date | null;
  _count: { regrasGeradas: number };
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  concluido: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    label: "Concluído",
  },
  erro: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
    label: "Erro",
  },
  processando: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
    label: "Processando",
  },
  pendente: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800",
    label: "Pendente",
  },
};

export function RoteirosClient({
  importacoes,
  totalRegras,
  empresaId,
}: {
  importacoes: Importacao[];
  totalRegras: number;
  empresaId: string;
}) {
  const router = useRouter();

  function formatDate(dateStr: string | Date) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <FileText className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              Roteiros Operacionais
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Roteiros Operacionais
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Histórico de PDFs processados pela IA e regras extraídas
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{importacoes.length}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">PDFs Importados</p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalRegras}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Regras Ativas</p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {importacoes.filter((i) => i.status === "concluido").length}
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Extrações OK</p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/20 p-4 text-sm text-violet-700 dark:text-violet-300 flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Para importar novos roteiros, acesse o{" "}
            <button
              onClick={() => router.push("/motor-regras")}
              className="font-semibold underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-100 transition"
            >
              Motor de Regras
            </button>{" "}
            e faça upload dos PDFs. As regras serão extraídas automaticamente e aparecerão aqui.
          </p>
        </div>

        {/* Tabela */}
        {importacoes.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum roteiro importado</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Importe PDFs no Motor de Regras para começar.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Arquivo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Regras
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Modelo IA
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Data
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {importacoes.map((imp) => {
                  const cfg = statusConfig[imp.status] || statusConfig.pendente;
                  const bancoNome =
                    imp.resultado?.banco_nome_ia || imp.bancoHint || "—";
                  return (
                    <tr
                      key={imp.id}
                      className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition cursor-pointer"
                      onClick={() => router.push(`/regras?importacao=${imp.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                              {imp.nomeArquivo}
                            </p>
                            <p className="text-xs text-zinc-500">{bancoNome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums font-bold">
                        {imp._count.regrasGeradas}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {imp.modeloIa || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                        {formatDate(imp.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-zinc-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
