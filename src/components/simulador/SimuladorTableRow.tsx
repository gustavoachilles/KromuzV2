"use client";

import { useState, useMemo, useEffect } from "react";
import { Oportunidade, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { RefreshCw, Sparkles, ArrowRight, X, AlertTriangle, CheckCircle } from "lucide-react";

interface SimuladorTableRowProps {
  contrato: ContratoAtivo;
  oportunidades: Oportunidade[];
  onOpenInsight?: (context: any) => void;
  clienteNome?: string;
}

export function SimuladorTableRow({ contrato, oportunidades, onOpenInsight, clienteNome }: SimuladorTableRowProps) {
  const [checked, setChecked] = useState(false);
  const [propostaGerada, setPropostaGerada] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Filtra oportunidades para este contrato
  const opsValidas = oportunidades.filter(op => op.contratoOriginalId === contrato.id);
  const modalidadesDisp = Array.from(new Set(opsValidas.map(op => op.tipo)));

  const [modalidade, setModalidade] = useState<string>(modalidadesDisp[0] || "");
  const [bancoId, setBancoId] = useState<string>("");
  const [prazo, setPrazo] = useState<number>(0);

  // Auto-selecionar a melhor opção
  useEffect(() => {
    if (opsValidas.length > 0 && checked) {
      const melhor = [...opsValidas].sort((a, b) => b.score - a.score || (b.trocoEstimado || 0) - (a.trocoEstimado || 0))[0];
      setModalidade(melhor.tipo);
      setBancoId(melhor.bancoId);
      setPrazo(melhor.prazo);
    }
  }, [opsValidas.length, checked]);

  const opsModalidade = opsValidas.filter(op => op.tipo === modalidade);
  
  // CORRIGIDO: Mostra TODOS os bancos com melhor troco estimado, ordenados do maior troco para o menor
  const bancosDisp = useMemo(() => {
    const mapa = new Map<string, { id: string; nome: string; melhorTroco: number; taxa: number }>();
    opsValidas.forEach(op => {
      const existing = mapa.get(op.bancoId);
      const troco = op.trocoEstimado || 0;
      if (!existing || troco > existing.melhorTroco) {
        mapa.set(op.bancoId, { id: op.bancoId, nome: op.bancoNome, melhorTroco: troco, taxa: op.taxaJuros });
      }
    });
    return Array.from(mapa.values()).sort((a, b) => b.melhorTroco - a.melhorTroco);
  }, [opsValidas]);

  useEffect(() => {
    if (opsModalidade.length > 0 && !opsModalidade.some(op => op.bancoId === bancoId) && checked) {
       const melhorDoTipo = [...opsModalidade].sort((a, b) => b.score - a.score || (b.trocoEstimado || 0) - (a.trocoEstimado || 0))[0];
       setBancoId(melhorDoTipo.bancoId);
       setPrazo(melhorDoTipo.prazo);
    }
  }, [modalidade, opsModalidade, bancoId, checked]);

  const opsBanco = opsModalidade.filter(op => op.bancoId === bancoId);

  const prazosDisp = useMemo(() => {
    return Array.from(new Set(opsBanco.map(op => op.prazo))).sort((a, b) => a - b);
  }, [opsBanco]);

  useEffect(() => {
    if (opsBanco.length > 0 && !opsBanco.some(op => op.prazo === prazo) && checked) {
      setPrazo(prazosDisp[0]);
    }
  }, [bancoId, opsBanco, prazo, prazosDisp, checked]);

  const simulacaoSelecionada = opsBanco.find(op => op.prazo === prazo) || opsBanco[0];

  const parseTipo = (t: string) => {
    if (t === "PORTABILIDADE") return "Portabilidade";
    if (t === "REFINANCIAMENTO") return "Refinanciamento";
    if (t === "PORTABILIDADE_REFIN") return "Refinanciamento Portabilidade";
    return t;
  };

  const [gerandoProposta, setGerandoProposta] = useState(false);

  async function handleGerarProposta() {
    if (!simulacaoSelecionada || propostaGerada) return;
    setGerandoProposta(true);
    try {
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: clienteNome || "Cliente do Simulador",
          clienteCpf: undefined,
          tipoOperacao: simulacaoSelecionada.tipo,
          bancoNome: simulacaoSelecionada.bancoNome,
          produtoNome: simulacaoSelecionada.produtoNome,
          valorParcela: simulacaoSelecionada.valorParcela,
          valorLiberado: simulacaoSelecionada.trocoEstimado || 0,
          prazo: simulacaoSelecionada.prazo,
          taxaJuros: simulacaoSelecionada.taxaJuros,
          especieBeneficio: contrato.especieOriginal ? Number(contrato.especieOriginal) : undefined,
          observacoes: `Gerado via Simulador HISCON. Contrato original: ${contrato.bancoNome}`
        })
      });

      if (!res.ok) throw new Error("Erro ao criar proposta");
      
      setPropostaGerada(true);
      setShowConfirmModal(false);
    } catch (err) {
      alert("Erro ao gerar proposta na esteira.");
    } finally {
      setGerandoProposta(false);
    }
  }

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${checked ? 'bg-slate-50' : ''}`}>
        <td className="p-3 text-center">
          {opsValidas.length > 0 && (
            <input 
              type="checkbox" 
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 rounded text-brand focus:ring-brand/50 border-slate-300"
            />
          )}
        </td>
        <td className="p-3 text-sm font-medium text-slate-800 uppercase max-w-[200px] truncate" title={contrato.bancoNome}>
          {contrato.bancoNome}
        </td>
        <td className="p-3 text-sm text-slate-600">
          {contrato.especieOriginal || "N/D"}
        </td>
        <td className="p-3 text-sm text-slate-600 text-center">
          {contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : "-"}
        </td>
        <td className="p-3 text-sm text-slate-600 text-center">
          {contrato.dataFim ? new Date(contrato.dataFim).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : "-"}
        </td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm font-medium text-brand text-center">
          {contrato.taxaJuros}%
        </td>
        <td className="p-3 text-sm font-bold text-amber-600 text-center">
          R$ {contrato.valorParcela.toFixed(2)}
        </td>
        <td className="p-3 text-sm text-slate-600 text-center">
          {contrato.parcelasPagas}/{contrato.prazoRestante + contrato.parcelasPagas} <span className="text-xs text-slate-400">({contrato.prazoRestante} Rest.)</span>
        </td>
        <td className="p-3 text-sm font-medium text-slate-800 text-center">
          {contrato.saldoDevedorEstimado.toFixed(2)}
        </td>
        <td className="p-3 text-center">
          <button 
            className="text-slate-400 hover:text-brand transition-colors"
            title="Recalcular saldo devedor"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {/* Linha de Simulação (Aparece se checado) */}
      {checked && opsValidas.length > 0 && (
        <tr className="bg-slate-50/80 border-b-2 border-brand/20">
          <td colSpan={12} className="p-4">
            <div className="flex flex-wrap items-end gap-4 justify-between">
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Operação</label>
                <select 
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {modalidadesDisp.map(m => (
                    <option key={m} value={m}>{parseTipo(m)}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Banco</label>
                <select 
                  value={bancoId}
                  onChange={(e) => setBancoId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {bancosDisp.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nome} — R$ {b.melhorTroco.toFixed(0)} ({b.taxa.toFixed(2)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tabela</label>
                <select 
                  value={prazo}
                  onChange={(e) => setPrazo(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {prazosDisp.map(p => (
                    <option key={p} value={p}>{p} Meses</option>
                  ))}
                </select>
              </div>

              {simulacaoSelecionada && (
                <>
                  <div className="w-[80px] text-center">
                    <label className="block text-xs font-semibold text-brand mb-1">Taxa</label>
                    <div className="text-sm font-bold text-slate-800">{simulacaoSelecionada.taxaJuros.toFixed(2)}%</div>
                  </div>

                  <div className="w-[120px] text-center">
                    <label className="block text-xs font-semibold text-brand mb-1">Novo Valor Parcela</label>
                    <div className="text-sm font-bold text-emerald-600">{simulacaoSelecionada.valorParcela.toFixed(2)}</div>
                  </div>

                  <div className="w-[140px] text-center">
                    <label className="block text-xs font-semibold text-brand mb-1">Valor Bruto Contrato</label>
                    <div className="text-sm font-bold text-slate-800">R$ {simulacaoSelecionada.valorLiberado.toFixed(2)}</div>
                  </div>

                  <div className="w-[140px] text-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900/30">
                    <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Valor Cliente</label>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      R$ {simulacaoSelecionada.trocoEstimado ? simulacaoSelecionada.trocoEstimado.toFixed(2) : "0.00"}
                    </div>
                  </div>

                  {/* Botão IA — com tooltip */}
                  <div className="relative group/tip">
                    <button
                      onClick={() => onOpenInsight?.({
                        bancoNome: simulacaoSelecionada.bancoNome,
                        produtoNome: simulacaoSelecionada.produtoNome,
                        clienteEspecie: contrato.especieOriginal || '---',
                        clienteIdade: 0,
                        valorParcela: simulacaoSelecionada.valorParcela,
                        prazo: simulacaoSelecionada.prazo
                      })}
                      className="p-3 bg-brand text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand/20 group/ai"
                    >
                      <Sparkles className="w-5 h-5 group-hover/ai:rotate-12 transition-transform" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                      Analisar regras com IA (BeviHelp)
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>

                  {/* Botão Proposta — com tooltip */}
                  <div className="relative group/tip2">
                    <button
                      disabled={gerandoProposta}
                      onClick={() => {
                        if (propostaGerada) {
                          alert("⚠️ Proposta já foi gerada para esta simulação. Verifique a esteira de propostas.");
                          return;
                        }
                        setShowConfirmModal(true);
                      }}
                      className={`p-3 rounded-xl transition-all shadow-lg group/sell ${
                        propostaGerada 
                          ? 'bg-slate-400 text-white cursor-not-allowed shadow-slate-400/20' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      {gerandoProposta ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : propostaGerada ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <ArrowRight className="w-5 h-5 group-hover/sell:translate-x-1 transition-transform" />
                      )}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tip2:opacity-100 transition-opacity pointer-events-none z-50">
                      {propostaGerada ? "Proposta já gerada ✓" : "Gerar proposta na esteira"}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </td>
        </tr>
      )}
      
      {checked && opsValidas.length === 0 && (
        <tr className="bg-slate-50 border-b border-slate-200">
          <td colSpan={12} className="p-4 text-center text-sm text-rose-500 font-medium">
            Nenhuma oportunidade disponível para este contrato.
          </td>
        </tr>
      )}

      {/* Modal de Confirmação de Proposta */}
      {showConfirmModal && simulacaoSelecionada && (
        <tr>
          <td colSpan={12}>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Confirmar Proposta</h3>
                  </div>
                  <button onClick={() => setShowConfirmModal(false)} className="text-white/80 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Deseja realmente gerar esta proposta na esteira? Confira os dados:
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cliente:</span>
                      <span className="font-semibold">{clienteNome || "Cliente do Simulador"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operação:</span>
                      <span className="font-semibold">{parseTipo(simulacaoSelecionada.tipo)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Banco Destino:</span>
                      <span className="font-semibold">{simulacaoSelecionada.bancoNome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Banco Origem:</span>
                      <span className="font-semibold">{contrato.bancoNome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prazo:</span>
                      <span className="font-semibold">{simulacaoSelecionada.prazo} meses</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taxa:</span>
                      <span className="font-semibold">{simulacaoSelecionada.taxaJuros.toFixed(2)}% a.m.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parcela:</span>
                      <span className="font-semibold">R$ {simulacaoSelecionada.valorParcela.toFixed(2)}</span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between text-base">
                      <span className="text-emerald-600 font-bold">Valor Cliente:</span>
                      <span className="font-black text-emerald-600">
                        R$ {(simulacaoSelecionada.trocoEstimado || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGerarProposta}
                    disabled={gerandoProposta}
                    className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
                  >
                    {gerandoProposta ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Confirmar Proposta</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
