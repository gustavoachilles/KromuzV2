"use client";

import React, { useEffect, useState } from "react";
import { Users, Settings2, TrendingUp, DollarSign, X, Plus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

type Faixa = { minVolume: number; percentual: number };

type Vendedor = {
  id: string;
  nome: string;
  email: string;
  perfilSlug: string;
  tipoRemuneracao: string;
  baseCalculoComissao: string;
  salarioFixo: number;
  percentualFixo: number | null;
  regrasFaixas: Faixa[] | null;
  performanceMes: {
    qtdPropostas: number;
    volumeProduzido: number;
    comissaoGeradaLoja: number;
    comissaoRepasse: number;
  };
};

export function VendedoresClient() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [vendEdit, setVendEdit] = useState<Vendedor | null>(null);

  // Form State
  const [tipoRemuneracao, setTipoRemuneracao] = useState("SEM_COMISSAO");
  const [baseCalculo, setBaseCalculo] = useState("VOLUME");
  const [salarioFixo, setSalarioFixo] = useState("");
  const [percentualFixo, setPercentualFixo] = useState("");
  const [faixas, setFaixas] = useState<Faixa[]>([]);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const res = await fetch("/api/vendedores");
      const data = await res.json();
      setVendedores(data);
    } catch (e) {
      toast.error("Erro ao carregar vendedores");
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (v: Vendedor) => {
    setVendEdit(v);
    setTipoRemuneracao(v.tipoRemuneracao || "SEM_COMISSAO");
    setBaseCalculo(v.baseCalculoComissao || "VOLUME");
    setSalarioFixo(v.salarioFixo ? v.salarioFixo.toString() : "");
    setPercentualFixo(v.percentualFixo ? v.percentualFixo.toString() : "");
    setFaixas(v.regrasFaixas || []);
    setModalOpen(true);
  };

  const addFaixa = () => setFaixas([...faixas, { minVolume: 0, percentual: 0 }]);
  
  const rmFaixa = (idx: number) => setFaixas(faixas.filter((_, i) => i !== idx));

  const salvarConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendEdit) return;
    setSalvando(true);

    try {
      await fetch(`/api/vendedores/${vendEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoRemuneracao,
          baseCalculoComissao: baseCalculo,
          salarioFixo: salarioFixo || null,
          percentualFixo: percentualFixo || null,
          regrasFaixas: tipoRemuneracao === "FAIXAS_META" ? faixas : null,
        }),
      });
      toast.success("Regras salvas com sucesso!");
      setModalOpen(false);
      fetchDados();
    } catch (e) {
      toast.error("Erro ao salvar regras");
    } finally {
      setSalvando(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="flex p-10 items-center justify-center"><Loader2 className="animate-spin text-violet-500 h-8 w-8" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <header>
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
          <Users className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest font-semibold">Equipe</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gestão de Vendedores</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Gerencie o formato de comissionamento e acompanhe a produção em tempo real no mês.
        </p>
      </header>

      {/* Grid de Vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendedores.map(v => (
          <div key={v.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{v.nome}</h3>
                <p className="text-xs text-zinc-500 truncate max-w-[180px]">{v.email}</p>
              </div>
              <button onClick={() => abrirModal(v)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition text-zinc-500">
                <Settings2 className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {/* Salário Base */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Salário Base</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {v.salarioFixo ? fmt(v.salarioFixo) : "Nenhum"}
                </span>
              </div>
              
              {/* Tipo Remuneração Badge */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Formato Meta</span>
                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-lg">
                  {v.tipoRemuneracao.replace("_", " ")}
                </span>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-2" />

              {/* Performance */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Performance no Mês</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase">Volume</span>
                    </div>
                    <p className="font-bold text-sm">{fmt(v.performanceMes.volumeProduzido)}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{v.performanceMes.qtdPropostas} propostas</p>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase">Comissão (Loja)</span>
                    </div>
                    <p className="font-bold text-sm text-emerald-600">{fmt(v.performanceMes.comissaoGeradaLoja)}</p>
                  </div>
                </div>
              </div>

              {/* Repasse Pagar */}
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Repasse a Pagar</span>
                <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                  {fmt(v.performanceMes.comissaoRepasse)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Configuração */}
      {modalOpen && vendEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <div>
                <h2 className="text-lg font-bold">Regras de Remuneração</h2>
                <p className="text-xs text-zinc-500">{vendEdit.nome}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={salvarConfigs} className="p-6 space-y-6">
              
              {/* Salário Fixo */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Salário Fixo Mensal (R$)</label>
                <input type="number" step="0.01" value={salarioFixo} onChange={e => setSalarioFixo(e.target.value)} placeholder="Ex: 1500.00"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
              </div>

              {/* Tipo de Comissionamento */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-sm font-semibold">Modelo de Comissionamento</label>
                <select value={tipoRemuneracao} onChange={e => setTipoRemuneracao(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all">
                  <option value="SEM_COMISSAO">Sem Comissão (Apenas Fixo)</option>
                  <option value="PERCENTUAL_FIXO">Percentual Único Fixo</option>
                  <option value="FAIXAS_META">Por Faixas de Metas (Degraus)</option>
                </select>
              </div>

              {/* Base de Cálculo */}
              {tipoRemuneracao !== "SEM_COMISSAO" && (
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <label className="text-sm font-semibold text-blue-900 dark:text-blue-300">Base de Cálculo do Percentual</label>
                  </div>
                  <select value={baseCalculo} onChange={e => setBaseCalculo(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="VOLUME">Volume Liberado da Operação (Ex: % sobre o Valor Vendido)</option>
                    <option value="LUCRO_LOJA">Comissão Flat da Loja (Ex: % sobre o Lucro da Corretora)</option>
                  </select>
                </div>
              )}

              {/* Configs Variáveis */}
              {tipoRemuneracao === "PERCENTUAL_FIXO" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Qual o Percentual? (%)</label>
                  <input type="number" step="0.01" value={percentualFixo} onChange={e => setPercentualFixo(e.target.value)} placeholder="Ex: 1.5"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                </div>
              )}

              {tipoRemuneracao === "FAIXAS_META" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Faixas de Atingimento</label>
                    <button type="button" onClick={addFaixa} className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Adicionar Faixa
                    </button>
                  </div>
                  
                  {faixas.length === 0 && <p className="text-xs text-zinc-500 italic">Nenhuma faixa cadastrada.</p>}
                  
                  <div className="space-y-3">
                    {faixas.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">A partir de (R$ Volume)</label>
                          <input type="number" value={f.minVolume} onChange={e => {
                            const newF = [...faixas]; newF[i].minVolume = Number(e.target.value); setFaixas(newF);
                          }} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Paga (%)</label>
                          <input type="number" step="0.01" value={f.percentual} onChange={e => {
                            const newF = [...faixas]; newF[i].percentual = Number(e.target.value); setFaixas(newF);
                          }} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900" />
                        </div>
                        <button type="button" onClick={() => rmFaixa(i)} className="pt-4 text-red-500 hover:text-red-600"><X className="h-4 w-4"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-700 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {salvando ? "Salvando..." : "Salvar Regras"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
