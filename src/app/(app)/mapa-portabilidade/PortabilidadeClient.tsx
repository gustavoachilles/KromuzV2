"use client";

import { ArrowRightLeft, Building2, Percent, DollarSign, FileText, TrendingDown } from "lucide-react";

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
      tabelas: tabs.sort((a, b) => a.taxaJurosMensal - b.taxaJurosMensal),
      propostas: propostas.filter((p) => p.bancoNome === banco),
    }))
    .sort((a, b) => a.menorTaxa - b.menorTaxa);

  const totalRegras = regras.length;
  const totalTabelas = tabelas.length;
  const menorTaxaGeral = tabelas.length > 0 ? Math.min(...tabelas.map((t) => t.taxaJurosMensal)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <ArrowRightLeft className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Portabilidade</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Mapa de Portabilidade</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Taxas e oportunidades por banco receptor
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <FileText className="h-5 w-5 text-sky-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{totalRegras}</p>
            <p className="text-xs text-zinc-500">Regras de Port.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <Building2 className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{bancosOrdenados.length}</p>
            <p className="text-xs text-zinc-500">Bancos Receptores</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <TrendingDown className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{menorTaxaGeral.toFixed(2)}%</p>
            <p className="text-xs text-zinc-500">Menor Taxa a.m.</p>
          </div>
        </div>

        {/* Mapa por banco */}
        {bancosOrdenados.length === 0 ? (
          <div className="text-center py-20">
            <ArrowRightLeft className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhuma regra de portabilidade</h3>
            <p className="text-sm text-zinc-400 mt-1">Configure regras com tipo PORTABILIDADE em Regras.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bancosOrdenados.map((b) => {
              const totalPortBanco = b.propostas.reduce((s, p) => s + p._count, 0);
              const volumePortBanco = b.propostas.reduce((s, p) => s + (p._sum.valorLiberado || 0), 0);

              return (
                <div key={b.banco} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{b.banco}</h3>
                        <p className="text-[11px] text-zinc-500">
                          {b.tabelas.length} tabela{b.tabelas.length !== 1 ? "s" : ""} · Menor taxa: <span className="font-semibold text-emerald-600">{b.menorTaxa.toFixed(2)}%</span> a.m.
                        </p>
                      </div>
                    </div>
                    {totalPortBanco > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-bold tabular-nums">{totalPortBanco} proposta{totalPortBanco !== 1 ? "s" : ""}</p>
                        <p className="text-[10px] text-emerald-600 tabular-nums">R$ {volumePortBanco.toLocaleString("pt-BR")}</p>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/40">
                          <th className="text-left px-4 py-2 text-zinc-500 font-medium">Tabela</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Prazo</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Taxa a.m.</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Coeficiente</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Comissão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {b.tabelas.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                            <td className="px-4 py-2.5 font-medium">{t.nome}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{t.prazo}x</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              <span className="text-emerald-600 font-semibold">{t.taxaJurosMensal.toFixed(2)}%</span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{t.coeficiente.toFixed(6)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {t.comissaoFlatPct != null ? (
                                <span className="text-amber-600">{t.comissaoFlatPct}%</span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
