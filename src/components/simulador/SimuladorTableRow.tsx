"use client";

import { useState, useMemo, useEffect } from "react";
import { Oportunidade, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { RefreshCw, Sparkles, ArrowRight } from "lucide-react";

interface SimuladorTableRowProps {
  contrato: ContratoAtivo;
  oportunidades: Oportunidade[];
  onOpenInsight?: (context: any) => void;
}

export function SimuladorTableRow({ contrato, oportunidades, onOpenInsight }: SimuladorTableRowProps) {
  const [checked, setChecked] = useState(false);
  
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
  
  const bancosDisp = useMemo(() => {
    const mapa = new Map<string, string>();
    opsModalidade.forEach(op => mapa.set(op.bancoId, op.bancoNome));
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [opsModalidade]);

  useEffect(() => {
    if (opsModalidade.length > 0 && !opsModalidade.some(op => op.bancoId === bancoId) && checked) {
       const melhorDoTipo = [...opsModalidade].sort((a, b) => b.score - a.score || (b.trocoEstimado || 0) - (a.trocoEstimado || 0))[0];
       setBancoId(melhorDoTipo.bancoId);
       setPrazo(melhorDoTipo.prazo);
    }
  }, [modalidade, opsModalidade, bancoId, checked]);

  const opsBanco = opsModalidade.filter(op => op.bancoId === bancoId);

  const prazosDisp = useMemo(() => {
    return Array.from(new Set(opsBanco.map(op => op.prazo))).sort((a, b) => b - a);
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
    if (!simulacaoSelecionada) return;
    setGerandoProposta(true);
    try {
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: "Cliente do Simulador", // Poderia vir de um campo de nome no topo
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
      
      const data = await res.json();
      alert(`✅ Proposta gerada com sucesso para o banco ${data.bancoNome}!`);
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
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
          )}
        </td>
        <td className="p-3 text-sm font-medium text-slate-800 uppercase max-w-[200px] truncate" title={contrato.bancoNome}>
          {contrato.bancoNome}
        </td>
        <td className="p-3 text-sm text-slate-600">
          N/D
        </td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm text-slate-600 text-center">-</td>
        <td className="p-3 text-sm font-medium text-indigo-600 text-center">
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
          <button className="text-slate-400 hover:text-indigo-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {/* Linha de Simulação (Aparece se checado) */}
      {checked && opsValidas.length > 0 && (
        <tr className="bg-slate-50/80 border-b-2 border-indigo-100">
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
                  disabled={bancosDisp.length <= 1}
                >
                  {bancosDisp.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
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
                    <label className="block text-xs font-semibold text-fuchsia-600 mb-1">Taxa</label>
                    <div className="text-sm font-bold text-slate-800">{simulacaoSelecionada.taxaJuros.toFixed(2)}%</div>
                  </div>

                  <div className="w-[120px] text-center">
                    <label className="block text-xs font-semibold text-indigo-600 mb-1">Novo Valor Parcela</label>
                    <div className="text-sm font-bold text-emerald-600">{simulacaoSelecionada.valorParcela.toFixed(2)}</div>
                  </div>

                  <div className="w-[140px] text-center">
                    <label className="block text-xs font-semibold text-fuchsia-600 mb-1">Valor Bruto Contrato</label>
                    <div className="text-sm font-bold text-slate-800">R$ {simulacaoSelecionada.valorLiberado.toFixed(2)}</div>
                  </div>

                  <div className="w-[140px] text-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900/30">
                    <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Valor Cliente</label>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      R$ {simulacaoSelecionada.trocoEstimado ? simulacaoSelecionada.trocoEstimado.toFixed(2) : "0.00"}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenInsight?.({
                      bancoNome: simulacaoSelecionada.bancoNome,
                      produtoNome: simulacaoSelecionada.produtoNome,
                      clienteEspecie: contrato.especieOriginal || '---',
                      clienteIdade: 0, // Idade não está disponível no contrato, mas está no simulador pai
                      valorParcela: simulacaoSelecionada.valorParcela,
                      prazo: simulacaoSelecionada.prazo
                    })}
                    className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20 group/ai"
                    title="Analisar com IA"
                  >
                    <Sparkles className="w-5 h-5 group-hover/ai:rotate-12 transition-transform" />
                  </button>

                  <button
                    disabled={gerandoProposta}
                    onClick={handleGerarProposta}
                    className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 group/sell"
                    title="Gerar Proposta na Esteira"
                  >
                    {gerandoProposta ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 group-hover/sell:translate-x-1 transition-transform" />
                    )}
                  </button>
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
    </>
  );
}
