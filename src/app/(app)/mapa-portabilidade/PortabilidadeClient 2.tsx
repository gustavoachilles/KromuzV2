"use client";

import { ArrowRightLeft, Building2, TrendingDown, FileText, Trophy, Zap, Info, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type Regra = {
  id: string;
  [key: string]: any;
};

type Tabela = {
  id: string;
  nome: string;
  prazo: number;
  taxaJurosMensal: number;
  coeficiente: number;
  comissaoFlatPct: number | null;
  banco: { nome: string };
  produto: { nomeProduto: string };
};

type PropostaGrupo = {
  bancoNome: string | null;
  status: string;
  _count: number;
  _sum: { valorLiberado: number | null };
};

export function PortabilidadeClient({
  regras,
  tabelas,
  propostas,
}: {
  regras: Regra[];
  tabelas: Tabela[];
  propostas: PropostaGrupo[];
}) {
  const [expandedBanco, setExpandedBanco] = useState<string | null>(null);

  // Agrupar tabelas por banco
  const bancoMap = new Map<string, Tabela[]>();
  tabelas.forEach((t) => {
    const list = bancoMap.get(t.banco.nome) || [];
    list.push(t);
    bancoMap.set(t.banco.nome, list);
  });

  const bancosOrdenados = Array.from(bancoMap.entries())
    .map(([banco, tabs]) => ({
      banco,
      menorTaxa: Math.min(...tabs.map((t) => t.taxaJurosMensal)),
      maiorPrazo: Math.max(...tabs.map((t) => t.prazo)),
      tabelas: tabs.sort((a, b) => a.prazo - b.prazo || a.taxaJurosMensal - b.taxaJurosMensal),
      propostas: propostas.filter((p) => p.bancoNome === banco),
      produtos: [...new Set(tabs.map(t => t.produto.nomeProduto))],
    }))
    .sort((a, b) => a.menorTaxa - b.menorTaxa);

  const totalRegras = regras.length;
  const menorTaxaGeral = tabelas.length > 0 ? Math.min(...tabelas.map((t) => t.taxaJurosMensal)) : 0;
  const totalPropostas = propostas.reduce((s, p) => s + p._count, 0);

  // Simulação de economia (cenário padrão)
  const taxaOrigem = 1.80;
  const dividaSimulada = 50000;
  const prazoSimulacao = 84;
  const parcelaOrigem = dividaSimulada * (taxaOrigem / 100) / (1 - Math.pow(1 + taxaOrigem / 100, -prazoSimulacao));
  const parcelaNova = dividaSimulada * (menorTaxaGeral / 100) / (1 - Math.pow(1 + menorTaxaGeral / 100, -prazoSimulacao));
  const economiaParcelaMensal = parcelaOrigem - parcelaNova;
  const economiaTotal = economiaParcelaMensal * prazoSimulacao;

  const toggleExpand = (banco: string) => {
    setExpandedBanco(expandedBanco === banco ? null : banco);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <ArrowRightLeft className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Portabilidade</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Mapa de Portabilidade</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Painel estratégico com todas as taxas e coeficientes por banco receptor. Use para comparar rapidamente qual banco oferece o melhor negócio para portar cada contrato.
          </p>
        </header>

        {/* Resumo Descritivo */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
              <p className="font-semibold text-sky-700 dark:text-sky-400">Como usar este mapa</p>
              <p>Este painel consolida <strong>{totalRegras} regras</strong> de portabilidade em <strong>{bancosOrdenados.length} bancos</strong>. Antes de ligar para o cliente, consulte aqui qual banco oferece a menor taxa e maior troco. Os bancos estão ordenados do <strong>mais competitivo</strong> (menor taxa) ao menos competitivo. Use o coeficiente para calcular: <em>Parcela ÷ Coeficiente = Valor Liberado</em>.</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <FileText className="h-5 w-5 text-sky-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{totalRegras}</p>
            <p className="text-xs text-zinc-500">Regras Ativas</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <Building2 className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{bancosOrdenados.length}</p>
            <p className="text-xs text-zinc-500">Bancos Receptores</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <TrendingDown className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums text-emerald-600">{menorTaxaGeral.toFixed(2)}%</p>
            <p className="text-xs text-zinc-500">Menor Taxa a.m.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <Zap className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{totalPropostas}</p>
            <p className="text-xs text-zinc-500">Propostas Geradas</p>
          </div>
        </div>

        {bancosOrdenados.length === 0 ? (
          <div className="text-center py-20">
            <ArrowRightLeft className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhuma regra de portabilidade</h3>
            <p className="text-sm text-zinc-400 mt-1">Configure regras com tipo PORTABILIDADE em Regras.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Radar de Economia */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/30 dark:to-zinc-900 p-6 sticky top-24">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 mb-4">
                  <TrendingDown className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Radar de Economia</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-sky-100 dark:border-sky-900/50 shadow-sm">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Cenário Simulado</p>
                    <p className="text-sm font-semibold">Dívida de R$ {dividaSimulada.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-zinc-400 italic">Taxa Origem: {taxaOrigem.toFixed(2)}% a.m.</p>
                    <p className="text-xs text-zinc-400 italic">Prazo: {prazoSimulacao}x</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold opacity-80">Melhor Taxa Hoje</p>
                    <p className="text-2xl font-black">{menorTaxaGeral.toFixed(2)}% a.m.</p>
                    <p className="text-[10px] mt-1 opacity-70">
                      {bancosOrdenados[0]?.banco}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Economia mensal: <span className="font-bold text-emerald-600">R$ {economiaParcelaMensal.toFixed(0)}/mês</span>
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      Economia total: <span className="font-bold text-emerald-600">R$ {economiaTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Legenda</p>
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <span>🏆 = Melhor taxa do mercado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span>Taxa competitiva (&lt; 1.70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sky-400"></div>
                    <span>Taxa padrão (1.70% - 1.85%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-400"></div>
                    <span>Taxa alta (&gt; 1.85%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bancos */}
            <div className="lg:col-span-3 space-y-4">
              {bancosOrdenados.map((b, index) => {
                const totalPortBanco = b.propostas.reduce((s, p) => s + p._count, 0);
                const volumePortBanco = b.propostas.reduce((s, p) => s + (p._sum.valorLiberado || 0), 0);
                const isMelhor = index === 0;
                const isExpanded = expandedBanco === b.banco || isMelhor;
                const taxaColor = b.menorTaxa <= menorTaxaGeral 
                  ? "text-amber-500" 
                  : b.menorTaxa < 1.70 
                    ? "text-emerald-600" 
                    : b.menorTaxa <= 1.85 
                      ? "text-sky-600" 
                      : "text-zinc-500";

                return (
                  <div 
                    key={b.banco} 
                    className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                      isMelhor 
                        ? "border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 shadow-lg shadow-amber-100/50 dark:shadow-amber-900/10 ring-1 ring-amber-200/50" 
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-sky-300 dark:hover:border-sky-700"
                    }`}
                  >
                    {/* Header do Banco */}
                    <button 
                      onClick={() => toggleExpand(b.banco)}
                      className="w-full px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-black ${
                          isMelhor 
                            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-400/30" 
                            : "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400"
                        }`}>
                          {isMelhor ? <Trophy className="h-5 w-5" /> : <span>{index + 1}º</span>}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm">{b.banco}</h3>
                            {isMelhor && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase">
                                Melhor Taxa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {b.tabelas.length} tabela{b.tabelas.length !== 1 ? "s" : ""} · 
                            {b.produtos.join(", ")} · 
                            Prazo máx: {b.maiorPrazo}x · 
                            Taxa: <span className={`font-semibold ${taxaColor}`}>{b.menorTaxa.toFixed(2)}%</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {totalPortBanco > 0 && (
                          <div className="text-right">
                            <p className="text-xs font-bold tabular-nums">{totalPortBanco} proposta{totalPortBanco !== 1 ? "s" : ""}</p>
                            <p className="text-[10px] text-emerald-600 tabular-nums">R$ {volumePortBanco.toLocaleString("pt-BR")}</p>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                      </div>
                    </button>

                    {/* Tabelas (expandível) */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/40">
                              <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Tabela</th>
                              <th className="text-center px-4 py-2.5 text-zinc-500 font-medium">Produto</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Prazo</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Taxa a.m.</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Coeficiente</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">Lib. p/ R$100</th>
                              <th className="text-right px-4 py-2.5 text-zinc-500 font-medium text-amber-600">Comissão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {b.tabelas.map((t) => {
                              const liberadoPor100 = 100 / t.coeficiente;
                              const isMenorTabela = t.taxaJurosMensal === b.menorTaxa;
                              return (
                                <tr 
                                  key={t.id} 
                                  className={`transition ${
                                    isMenorTabela 
                                      ? "bg-emerald-50/50 dark:bg-emerald-950/10" 
                                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                  }`}
                                >
                                  <td className="px-4 py-2.5 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      {isMenorTabela && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                                      {t.nome}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      t.produto.nomeProduto.includes("Refin") 
                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" 
                                        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                    }`}>
                                      {t.produto.nomeProduto.includes("Refin") ? "Port+Refin" : "Port"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{t.prazo}x</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums">
                                    <span className={`font-semibold ${taxaColor}`}>{t.taxaJurosMensal.toFixed(2)}%</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-zinc-500">{t.coeficiente.toFixed(6)}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-sky-600">
                                    R$ {liberadoPor100.toFixed(0)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-600">
                                    {t.comissaoFlatPct != null ? (
                                      <span>{t.comissaoFlatPct}%</span>
                                    ) : (
                                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
