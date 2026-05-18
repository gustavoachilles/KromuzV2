"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Building2, CheckCircle2, BarChart3, Plus, FileText, Banknote, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MesData = { label: string; volume: number; comissao: number; parcela: number; count: number };
type BancoGrupo = { bancoNome: string | null; _count: number; _sum: { valorLiberado: number | null; valorComissao: number | null } };
type Totais = { volume: number; comissao: number; count: number };

type FaturaBanco = {
  id: string;
  codigoLote: string;
  bancoNome: string;
  status: string;
  dataEmissao: string | Date;
  dataPagamento: string | Date | null;
  valorTotal: number;
  _count: { propostas: number };
};

type PropostaPendente = {
  id: string;
  bancoNome: string | null;
  valorComissao: number | null;
};

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function fmtFull(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function DashFinanceiroClient({
  meses,
  porBanco,
  totais,
  faturasIniciais,
  pendentesIniciais
}: {
  meses: MesData[];
  porBanco: BancoGrupo[];
  totais: Totais;
  faturasIniciais?: FaturaBanco[];
  pendentesIniciais?: PropostaPendente[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"visao_geral" | "lotes">("visao_geral");
  const [isGerandoLote, setIsGerandoLote] = useState(false);
  const [faturas, setFaturas] = useState(faturasIniciais || []);

  const maxVolume = Math.max(...meses.map((m) => m.volume), 1);
  const maxBanco = Math.max(...porBanco.map((b) => b._sum.valorLiberado || 0), 1);
  const taxaComissao = totais.volume > 0 ? ((totais.comissao / totais.volume) * 100).toFixed(2) : "0.00";

  // Agrupar propostas pendentes por banco para o modal de geração
  const pendentesPorBanco = pendentesIniciais?.reduce((acc, p) => {
    const b = p.bancoNome || "Desconhecido";
    if (!acc[b]) acc[b] = { count: 0, valor: 0, ids: [] };
    acc[b].count++;
    acc[b].valor += (p.valorComissao || 0);
    acc[b].ids.push(p.id);
    return acc;
  }, {} as Record<string, { count: number; valor: number; ids: string[] }>) || {};

  async function handleGerarLote(banco: string, propostas: { ids: string[]; valor: number }) {
    if (!confirm(`Gerar lote de faturamento para o banco ${banco} no valor de ${fmtFull(propostas.valor)}?`)) return;
    
    setIsGerandoLote(true);
    try {
      const res = await fetch("/api/financeiro/faturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bancoNome: banco, propostaIds: propostas.ids })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Lote gerado com sucesso!");
      router.refresh();
      // Em um cenário real, também faríamos update local do state para não piscar a tela
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar lote");
    } finally {
      setIsGerandoLote(false);
    }
  }

  async function handleMarcarPago(faturaId: string) {
    if (!confirm("Marcar esta fatura como PAGA pelo banco?")) return;
    try {
      const res = await fetch(`/api/financeiro/faturas/${faturaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAGA" })
      });
      if (!res.ok) throw new Error();
      toast.success("Fatura atualizada para PAGA!");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao atualizar fatura");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Financeiro</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard Financeiro</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">Visão consolidada de receitas e comissões</p>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab("visao_geral")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "visao_geral" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setTab("lotes")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "lotes" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Controle de Lotes
            </button>
          </div>
        </header>

        {tab === "visao_geral" && (
          <>
            {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBox icon={<TrendingUp className="h-4 w-4" />} label="Volume Total Pago" value={fmtFull(totais.volume)} color="text-violet-600" />
          <KpiBox icon={<DollarSign className="h-4 w-4" />} label="Comissões Totais" value={fmtFull(totais.comissao)} color="text-emerald-600" />
          <KpiBox icon={<CheckCircle2 className="h-4 w-4" />} label="Propostas Pagas" value={String(totais.count)} color="text-indigo-600" />
          <KpiBox icon={<BarChart3 className="h-4 w-4" />} label="Taxa Média Comissão" value={`${taxaComissao}%`} color="text-amber-600" />
        </div>

        {/* Evolução Mensal */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-1">Evolução Mensal</h2>
          <p className="text-xs text-zinc-500 mb-6">Volume pago nos últimos 6 meses</p>
          <div className="flex items-end gap-3 h-48">
            {meses.map((m) => {
              const h = maxVolume > 0 ? Math.max((m.volume / maxVolume) * 100, 4) : 4;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500 tabular-nums">{fmt(m.volume)}</span>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all duration-700"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">{m.label}</span>
                  <span className="text-[9px] text-zinc-400">{m.count} prop</span>
                </div>
              );
            })}
          </div>
          {/* Comissão line */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-6 overflow-x-auto">
            {meses.map((m) => (
              <div key={m.label} className="text-center shrink-0">
                <p className="text-xs font-semibold text-emerald-600 tabular-nums">{fmt(m.comissao)}</p>
                <p className="text-[9px] text-zinc-400">comissão</p>
              </div>
            ))}
          </div>
        </div>

        {/* Por Banco */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-1">Volume por Banco</h2>
          <p className="text-xs text-zinc-500 mb-6">Top bancos por produção paga</p>
          {porBanco.length === 0 ? (
            <p className="text-center text-zinc-400 py-12 text-sm">Nenhuma proposta paga ainda.</p>
          ) : (
            <div className="space-y-3">
              {porBanco.map((b) => {
                const vol = b._sum.valorLiberado || 0;
                const com = b._sum.valorComissao || 0;
                return (
                  <div key={b.bancoNome || "N/A"} className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-32 shrink-0 truncate">{b.bancoNome || "N/A"}</span>
                    <div className="flex-1 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max((vol / maxBanco) * 100, 8)}%` }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{b._count}</span>
                    </div>
                    <div className="text-right shrink-0 w-28">
                      <p className="text-xs font-bold tabular-nums">{fmtFull(vol)}</p>
                      <p className="text-[10px] text-emerald-600 tabular-nums">+{fmtFull(com)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}

        {tab === "lotes" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lotes Gerados (Histórico) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Lotes Emitidos</h2>
                  <p className="text-sm text-zinc-500">Acompanhe as comissões a receber dos bancos</p>
                </div>
              </div>

              {faturas.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
                  <Banknote className="h-8 w-8 mx-auto text-zinc-300 mb-3" />
                  <p className="text-zinc-500 font-medium">Nenhum lote de comissão emitido.</p>
                  <p className="text-sm text-zinc-400 mt-1">Gere um lote selecionando o banco no painel ao lado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {faturas.map(f => (
                    <div key={f.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${f.status === 'PAGA' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                          {f.status === 'PAGA' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{f.codigoLote}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${f.status === 'PAGA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {f.status}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 mt-0.5">{f.bancoNome} • {f._count.propostas} propostas</p>
                          <p className="text-xs text-zinc-400 mt-1">Emitido em {new Date(f.dataEmissao).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1">
                        <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {fmtFull(f.valorTotal)}
                        </p>
                        {f.status === 'PENDENTE' && (
                          <button 
                            onClick={() => handleMarcarPago(f.id)}
                            className="text-xs text-violet-600 hover:text-violet-700 font-medium underline underline-offset-2"
                          >
                            Marcar Recebido
                          </button>
                        )}
                        {f.status === 'PAGA' && f.dataPagamento && (
                          <p className="text-xs text-zinc-500">Pago em {new Date(f.dataPagamento).toLocaleDateString("pt-BR")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gerar Novo Lote (Sidebar) */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-fit sticky top-6">
              <h3 className="font-bold mb-1">Comissões Pendentes</h3>
              <p className="text-xs text-zinc-500 mb-6">Propostas pagas que ainda não foram enviadas para faturamento do banco.</p>

              {Object.keys(pendentesPorBanco).length === 0 ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <p>Tudo faturado. Nenhuma pendência.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(pendentesPorBanco).map(([banco, dados]) => (
                    <div key={banco} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-violet-200 transition">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{banco}</p>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                          {dados.count} prop.
                        </span>
                      </div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4 tabular-nums">
                        {fmtFull(dados.valor)}
                      </p>
                      <button
                        onClick={() => handleGerarLote(banco, dados)}
                        disabled={isGerandoLote}
                        className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
                      >
                        <Plus className="h-4 w-4" /> Gerar Lote
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-xs text-zinc-500">{label}</span></div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
