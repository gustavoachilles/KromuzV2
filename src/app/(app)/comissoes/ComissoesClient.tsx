"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, CheckCircle2, User, Clock, Percent,
  Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
  Building2, Calculator, FileText, Filter, Download,
} from "lucide-react";

type Proposta = {
  id: string;
  clienteNome: string;
  tipoOperacao: string | null;
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
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port",
  PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "RMC",
  CARTAO_BENEFICIO: "RCC",
};

const tipoColor: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  REFINANCIAMENTO: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  PORTABILIDADE: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PORTABILIDADE_REFIN: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  CARTAO_CONSIGNADO: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  CARTAO_BENEFICIO: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
};

function fmt(v: number | null) {
  if (!v) return "R$ 0,00";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}

type SortKey = "cliente" | "tipo" | "banco" | "vendedor" | "valor" | "comissao" | "data";
type SortDir = "asc" | "desc";

export function ComissoesClient({
  propostas,
  tabelas,
  totais,
}: {
  propostas: Proposta[];
  tabelas: Tabela[];
  totais: Totais;
}) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showTabelas, setShowTabelas] = useState(false);

  const taxaMedia = totais.valorLiberado > 0
    ? ((totais.valorComissao / totais.valorLiberado) * 100).toFixed(2)
    : "0.00";

  // Unique vendedores
  const vendedores = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach(p => { if (p.vendedorNome) set.add(p.vendedorNome); });
    return Array.from(set).sort();
  }, [propostas]);

  // Unique tipos
  const tipos = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach(p => { if (p.tipoOperacao) set.add(p.tipoOperacao); });
    return Array.from(set).sort();
  }, [propostas]);

  // Filter & sort
  const filtrados = useMemo(() => {
    let list = [...propostas];

    // search
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(p =>
        p.clienteNome.toLowerCase().includes(q) ||
        (p.bancoNome?.toLowerCase() || "").includes(q) ||
        (p.vendedorNome?.toLowerCase() || "").includes(q)
      );
    }

    // tipo filter
    if (tipoFiltro !== "todos") {
      list = list.filter(p => p.tipoOperacao === tipoFiltro);
    }

    // vendedor filter
    if (vendedorFiltro !== "todos") {
      list = list.filter(p => p.vendedorNome === vendedorFiltro);
    }

    // sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "cliente": cmp = a.clienteNome.localeCompare(b.clienteNome); break;
        case "tipo": cmp = (a.tipoOperacao || "").localeCompare(b.tipoOperacao || ""); break;
        case "banco": cmp = (a.bancoNome || "").localeCompare(b.bancoNome || ""); break;
        case "vendedor": cmp = (a.vendedorNome || "").localeCompare(b.vendedorNome || ""); break;
        case "valor": cmp = (a.valorLiberado || 0) - (b.valorLiberado || 0); break;
        case "comissao": cmp = (a.valorComissao || 0) - (b.valorComissao || 0); break;
        case "data": cmp = new Date(a.pagaEm || a.createdAt).getTime() - new Date(b.pagaEm || b.createdAt).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [propostas, busca, tipoFiltro, vendedorFiltro, sortKey, sortDir]);

  // Filtered totals
  const filteredTotal = useMemo(() => {
    const vl = filtrados.reduce((acc, p) => acc + (p.valorLiberado || 0), 0);
    const vc = filtrados.reduce((acc, p) => acc + (p.valorComissao || 0), 0);
    return { count: filtrados.length, valorLiberado: vl, valorComissao: vc };
  }, [filtrados]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-brand" />
      : <ArrowDown className="h-3 w-3 text-brand" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Comissões</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gestão de Comissões</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Controle de comissões sobre propostas pagas
            </p>
          </div>
          <Link
            href="/comissoes/fechamento"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold shadow-lg shadow-brand/25 hover:opacity-90 transition"
          >
            <Calculator className="h-4 w-4" />
            Fechamento de Folha
          </Link>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-800 transition">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Propostas Pagas</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{totais.count}</p>
          </div>

          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-hidden group hover:border-blue-200 dark:hover:border-blue-800 transition">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Volume Liberado</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{fmtCompact(totais.valorLiberado)}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">{fmt(totais.valorLiberado)}</p>
          </div>

          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-hidden group hover:border-brand/30 transition">
            <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-brand" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Total Comissões</span>
            </div>
            <p className="text-3xl font-black tabular-nums text-brand">{fmtCompact(totais.valorComissao)}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">{fmt(totais.valorComissao)}</p>
          </div>

          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-hidden group hover:border-amber-200 dark:hover:border-amber-800 transition">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Taxa Média</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{taxaMedia}%</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente, banco ou vendedor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={tipoFiltro}
                onChange={e => setTipoFiltro(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/50 transition cursor-pointer"
              >
                <option value="todos">Todos os tipos</option>
                {tipos.map(t => (
                  <option key={t} value={t}>{tipoLabel[t] || t}</option>
                ))}
              </select>
            </div>

            <select
              value={vendedorFiltro}
              onChange={e => setVendedorFiltro(e.target.value)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/50 transition cursor-pointer"
            >
              <option value="todos">Todos vendedores</option>
              {vendedores.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {(busca || tipoFiltro !== "todos" || vendedorFiltro !== "todos") && (
              <button
                onClick={() => { setBusca(""); setTipoFiltro("todos"); setVendedorFiltro("todos"); }}
                className="text-xs text-brand hover:underline transition"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="text-xs text-zinc-400 tabular-nums md:ml-auto">
            {filtrados.length} de {propostas.length} propostas
            {filteredTotal.valorComissao > 0 && (
              <span className="ml-2 text-brand font-semibold">
                · {fmt(filteredTotal.valorComissao)} em comissões
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_0.8fr] gap-2 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
            {[
              { key: "cliente" as SortKey, label: "Cliente" },
              { key: "tipo" as SortKey, label: "Operação" },
              { key: "banco" as SortKey, label: "Banco" },
              { key: "vendedor" as SortKey, label: "Vendedor" },
              { key: "valor" as SortKey, label: "Valor Liberado" },
              { key: "comissao" as SortKey, label: "Comissão" },
              { key: "data" as SortKey, label: "Data" },
            ].map(col => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                  col.key === "valor" || col.key === "comissao" || col.key === "data" ? "justify-end" : ""
                } ${sortKey === col.key ? "text-brand" : "text-zinc-400 hover:text-zinc-600"}`}
              >
                {col.label}
                <SortIcon col={col.key} />
              </button>
            ))}
          </div>

          {/* Rows */}
          {filtrados.length === 0 ? (
            <div className="text-center py-20">
              <DollarSign className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400">Nenhuma comissão encontrada</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {busca || tipoFiltro !== "todos" || vendedorFiltro !== "todos"
                  ? "Tente alterar os filtros."
                  : "Propostas pagas aparecerão aqui."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtrados.map((p) => {
                const tipoLbl = p.tipoOperacao ? (tipoLabel[p.tipoOperacao] || p.tipoOperacao) : null;
                const tipoClr = p.tipoOperacao ? (tipoColor[p.tipoOperacao] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400") : "";
                const comPct = p.valorLiberado && p.valorComissao ? ((p.valorComissao / p.valorLiberado) * 100).toFixed(1) : null;

                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_0.8fr] gap-2 md:gap-2 items-center px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group"
                  >
                    {/* Cliente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 shrink-0 uppercase">
                        {p.clienteNome.substring(0, 2)}
                      </div>
                      <span className="text-sm font-medium truncate">{p.clienteNome}</span>
                    </div>

                    {/* Tipo */}
                    <div>
                      {tipoLbl ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${tipoClr}`}>
                          {tipoLbl}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </div>

                    {/* Banco */}
                    <div className="min-w-0">
                      {p.bancoNome ? (
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-zinc-400 shrink-0" />
                          {p.bancoNome}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </div>

                    {/* Vendedor */}
                    <div className="min-w-0">
                      {p.vendedorNome ? (
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                          <User className="h-3 w-3 text-zinc-400 shrink-0" />
                          {p.vendedorNome}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </div>

                    {/* Valor Liberado */}
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums">{fmt(p.valorLiberado)}</span>
                    </div>

                    {/* Comissão */}
                    <div className="text-right">
                      {p.valorComissao ? (
                        <div>
                          <span className="text-sm font-bold tabular-nums text-brand">{fmt(p.valorComissao)}</span>
                          {comPct && (
                            <span className="block text-[10px] text-zinc-400 tabular-nums">{comPct}%</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </div>

                    {/* Data */}
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-400 tabular-nums flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {new Date(p.pagaEm || p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {filtrados.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_0.8fr] gap-2 items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Total ({filtrados.length} propostas)
              </span>
              <span />
              <span />
              <span />
              <span className="text-sm font-bold tabular-nums text-right">
                {fmt(filteredTotal.valorLiberado)}
              </span>
              <span className="text-sm font-black tabular-nums text-right text-brand">
                {fmt(filteredTotal.valorComissao)}
              </span>
              <span />
            </div>
          )}
        </div>

        {/* Tabelas de Comissão */}
        {tabelas.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
              onClick={() => setShowTabelas(prev => !prev)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold">Tabelas de Comissão</h2>
                  <p className="text-[11px] text-zinc-400">{tabelas.length} tabelas com percentual de comissão configurado</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${showTabelas ? "" : "-rotate-90"}`} />
            </button>

            {showTabelas && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                {tabelas.map((t) => (
                  <div key={t.id} className="px-6 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.nome}</p>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {t.banco.nome}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {t.comissaoFlatPct != null && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{t.comissaoFlatPct}%</span>
                          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider">Flat</span>
                        </div>
                      )}
                      {t.comissaoRepassePct != null && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{t.comissaoRepassePct}%</span>
                          <span className="block text-[10px] text-zinc-400 uppercase tracking-wider">Repasse</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
