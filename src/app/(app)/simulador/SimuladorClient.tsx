"use client";

import { useState } from "react";
import { UploadHiscon } from "@/components/simulador/UploadHiscon";
import { Oportunidade, ClienteSimulacao, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { Calculator, FileText, RefreshCw, Wallet, CreditCard, ArrowRightLeft, UserCircle2, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

interface SimulacaoResult {
  cliente: ClienteSimulacao;
  contratos: ContratoAtivo[];
  oportunidades: Oportunidade[];
}

export function SimuladorClient({ empresaId, convenios }: { empresaId: string, convenios?: { id: string, nome: string }[] }) {
  const [tab, setTab] = useState<"hiscon" | "manual">("hiscon");
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);

  // Estados da Calculadora Manual
  const [formManual, setFormManual] = useState({
    convenioId: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    idade: "",
    margem: ""
  });
  const [isCalculando, setIsCalculando] = useState(false);

  async function handleSimularManual(e: React.FormEvent) {
    e.preventDefault();
    if (!formManual.convenioId || !formManual.margem) {
      toast.error("Preencha o convênio e a margem disponível");
      return;
    }

    setIsCalculando(true);
    try {
      const res = await fetch("/api/simulador/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convenioId: formManual.convenioId,
          tipoOperacao: formManual.tipoOperacao,
          idade: formManual.idade ? Number(formManual.idade) : undefined,
          margem: Number(formManual.margem.replace(',', '.'))
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      toast.error(err.message || "Erro na simulação");
    } finally {
      setIsCalculando(false);
    }
  }
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);

  if (!resultado) {
    return (
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit mx-8 mt-8">
          <button
            onClick={() => setTab("hiscon")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
              tab === "hiscon" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <FileText className="w-4 h-4" /> Análise HISCON (PDF)
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
              tab === "manual" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Calculator className="w-4 h-4" /> Calculadora Manual
          </button>
        </div>

        {tab === "hiscon" && (
          <div className="p-8">
            <UploadHiscon 
              empresaId={empresaId} 
              onProcessamentoCompleto={(data) => setResultado(data)} 
            />
          </div>
        )}

        {tab === "manual" && (
          <div className="p-8 max-w-3xl">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-violet-500" />
                Calculadora Rápida
              </h2>
              
              <form onSubmit={handleSimularManual} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Convênio *</label>
                    <select 
                      value={formManual.convenioId}
                      onChange={e => setFormManual({...formManual, convenioId: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Selecione...</option>
                      {convenios?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Operação</label>
                    <select 
                      value={formManual.tipoOperacao}
                      onChange={e => setFormManual({...formManual, tipoOperacao: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="EMPRESTIMO_CONSIGNADO">Margem Nova / Empréstimo</option>
                      <option value="REFINANCIAMENTO">Refinanciamento</option>
                      <option value="CARTAO_CONSIGNADO">Cartão Consignado (RMC)</option>
                      <option value="CARTAO_BENEFICIO">Cartão Benefício (RCC)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Idade Cliente (Opcional)</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 65"
                      value={formManual.idade}
                      onChange={e => setFormManual({...formManual, idade: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Margem Disponível (R$) *</label>
                    <input 
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={formManual.margem}
                      onChange={e => setFormManual({...formManual, margem: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-violet-500 font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isCalculando}
                  className="w-full bg-violet-600 text-white font-medium py-3 rounded-lg hover:bg-violet-700 transition flex justify-center items-center gap-2"
                >
                  {isCalculando ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Procurar Oportunidades
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { cliente, oportunidades, contratos } = resultado;

  const novoEmprestimo = oportunidades.filter(o => o.tipo === "EMPRESTIMO_CONSIGNADO");
  const portabilidades = oportunidades.filter(o => o.tipo === "PORTABILIDADE");

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Botão de Voltar */}
      <button 
        onClick={() => setResultado(null)}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Simular outro extrato
      </button>

      {/* Resumo do Cliente */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <UserCircle2 className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{cliente.nome || "Resumo do Cliente"}</h2>
            <p className="text-slate-300 text-sm">Dados extraídos com precisão via IA</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Benefício</p>
            <p className="text-xl font-semibold">{cliente.numeroBeneficio || "---"}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Espécie</p>
            <p className="text-xl font-semibold">
              {cliente.especie} - {cliente.especieNome || "Pensão"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Margem Livre</p>
            <p className="text-xl font-semibold text-emerald-400">
              R$ {cliente.margemLivre.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Dívidas Ativas</p>
            <p className="text-xl font-semibold">{contratos.length} contratos</p>
          </div>
        </div>
      </div>

      {/* Stack de Oportunidades (Vertical) */}
      <div className="space-y-8">
        
        {/* Coluna: Margem Livre */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">Margem Livre (Novo)</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {novoEmprestimo.length}
            </span>
          </div>

          {novoEmprestimo.length === 0 ? (
            <p className="text-slate-500 text-sm italic p-4 bg-slate-50 rounded-xl border border-dashed">
              Nenhuma oportunidade encontrada ou margem insuficiente.
            </p>
          ) : (
            <div className="space-y-3">
              {novoEmprestimo.map((op, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{op.bancoNome}</h4>
                      <p className="text-xs text-slate-500">{op.produtoNome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-medium uppercase">Valor Liberado</p>
                      <p className="text-lg font-black text-emerald-600">R$ {op.valorLiberado.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-600">
                      <strong>{op.prazo}x</strong> de R$ {op.valorParcela.toFixed(2)}
                    </span>
                    <span className="text-slate-500 font-medium">{op.taxaJuros}% a.m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna: Portabilidade */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-800">Portabilidade (Troco)</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {portabilidades.length}
            </span>
          </div>

          {portabilidades.length === 0 ? (
            <p className="text-slate-500 text-sm italic p-4 bg-slate-50 rounded-xl border border-dashed">
              Nenhum contrato ativo qualificado para portabilidade.
            </p>
          ) : (
            <div className="space-y-3">
              {portabilidades.map((op, idx) => {
                const original = contratos.find(c => c.id === op.contratoOriginalId);
                return (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900">Levar para o {op.bancoNome}</h4>
                        <p className="text-xs text-slate-500">Tirando do {original?.bancoNome || "banco original"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-medium uppercase">Troco Estimado</p>
                        <p className="text-lg font-black text-indigo-600">R$ {op.trocoEstimado?.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="bg-rose-50 p-2 rounded-lg text-rose-700">
                        <p className="font-semibold mb-1">Atual ({original?.bancoNome})</p>
                        <p>Taxa: {original?.taxaJuros}%</p>
                        <p>Parcela: R$ {original?.valorParcela.toFixed(2)}</p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-lg text-indigo-700">
                        <p className="font-semibold mb-1">Nova Oferta</p>
                        <p>Taxa: {op.taxaJuros}%</p>
                        <p>Prazo: {op.prazo}x</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
