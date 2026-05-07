"use client";

import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  User,
  Clock,
  Percent,
} from "lucide-react";

type Proposta = {
  id: string;
  clienteNome: string;
  tipoOperacao: string;
  status: string;
  bancoNome: string | null;
  vendedorNome: string | null;
  valorLiberado: number | null;
  valorComissao: number | null;
  pagaEm: string | Date | null;
  createdAt: string | Date;
};

type Tabela = {
  id: string;
  nome: string;
  comissaoFlatPct: number | null;
  comissaoRepassePct: number | null;
  banco: { nome: string };
};

type Totais = {
  count: number;
  valorLiberado: number;
  valorComissao: number;
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova", REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port", PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "RMC", CARTAO_BENEFICIO: "RCC",
};

function fmt(v: number | null) {
  if (!v) return "R$ 0,00";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function ComissoesClient({
  propostas,
  tabelas,
  totais,
}: {
  propostas: Proposta[];
  tabelas: Tabela[];
  totais: Totais;
}) {
  const taxaMedia = totais.valorLiberado > 0
    ? ((totais.valorComissao / totais.valorLiberado) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <DollarSign className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Comissões</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gestão de Comissões</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Controle de comissões sobre propostas pagas
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs text-zinc-500">Propostas Pagas</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totais.count}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-violet-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs text-zinc-500">Volume Liberado</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(totais.valorLiberado)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs text-zinc-500">Total Comissões</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmt(totais.valorComissao)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-xs text-zinc-500">Taxa Média</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{taxaMedia}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Propostas com comissão */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Propostas Comissionadas</h2>
              <p className="text-xs text-zinc-500">{propostas.length} propostas aprovadas/pagas</p>
            </div>

            {propostas.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-600">Nenhuma comissão</h3>
                <p className="text-sm text-zinc-400 mt-1">Propostas pagas aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {propostas.map((p) => (
                  <div key={p.id} className="px-6 py-3 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${p.status === "PAGA" ? "bg-violet-500" : "bg-emerald-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.clienteNome}</p>
                      <p className="text-[11px] text-zinc-500">
                        {tipoLabel[p.tipoOperacao] || p.tipoOperacao}
                        {p.bancoNome && ` · ${p.bancoNome}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{fmt(p.valorLiberado)}</p>
                      {p.valorComissao ? (
                        <p className="text-[11px] text-emerald-600 font-semibold tabular-nums">
                          +{fmt(p.valorComissao)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-400">sem comissão</p>
                      )}
                    </div>
                    {p.vendedorNome && (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 shrink-0">
                        <User className="h-3 w-3" />{p.vendedorNome}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(p.pagaEm || p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabelas de Comissão */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Tabelas de Comissão</h2>
              <p className="text-xs text-zinc-500">{tabelas.length} tabelas com comissão</p>
            </div>

            {tabelas.length === 0 ? (
              <div className="text-center py-16">
                <Percent className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-zinc-600">Nenhuma tabela com comissão</h3>
                <p className="text-xs text-zinc-400 mt-1">Configure em Produtos.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tabelas.map((t) => (
                  <div key={t.id} className="px-6 py-3">
                    <p className="text-sm font-medium truncate">{t.nome}</p>
                    <p className="text-[11px] text-zinc-500">{t.banco.nome}</p>
                    <div className="flex gap-4 mt-1">
                      {t.comissaoFlatPct != null && (
                        <span className="text-xs text-emerald-600 font-semibold">
                          Flat: {t.comissaoFlatPct}%
                        </span>
                      )}
                      {t.comissaoRepassePct != null && (
                        <span className="text-xs text-amber-600 font-semibold">
                          Repasse: {t.comissaoRepassePct}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
