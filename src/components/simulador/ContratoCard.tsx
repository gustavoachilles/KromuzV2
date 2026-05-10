"use client";

import { useState, useMemo, useEffect } from "react";
import { Oportunidade, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { ArrowRightLeft, RefreshCw, Landmark, Calendar, Percent, TrendingDown } from "lucide-react";

interface ContratoCardProps {
  contrato: ContratoAtivo;
  oportunidades: Oportunidade[];
}

export function ContratoCard({ contrato, oportunidades }: ContratoCardProps) {
  // Filtra apenas as oportunidades atreladas a este contrato (Port e Refin)
  const opsValidas = oportunidades.filter(op => op.contratoOriginalId === contrato.id);

  // Tipos de Operação Disponíveis para este contrato
  const modalidadesDisp = Array.from(new Set(opsValidas.map(op => op.tipo)));

  // Estados dos Selects
  const [modalidade, setModalidade] = useState<string>(modalidadesDisp[0] || "");
  const [bancoId, setBancoId] = useState<string>("");
  const [prazo, setPrazo] = useState<number>(0);

  // Auto-selecionar a melhor opção ao montar
  useEffect(() => {
    if (opsValidas.length > 0) {
      // Ordena por score / troco
      const melhor = [...opsValidas].sort((a, b) => b.score - a.score || (b.trocoEstimado || 0) - (a.trocoEstimado || 0))[0];
      setModalidade(melhor.tipo);
      setBancoId(melhor.bancoId);
      setPrazo(melhor.prazo);
    }
  }, [opsValidas.length]);

  // Filtros em Cadeia
  const opsModalidade = opsValidas.filter(op => op.tipo === modalidade);
  
  const bancosDisp = useMemo(() => {
    const mapa = new Map<string, string>();
    opsModalidade.forEach(op => mapa.set(op.bancoId, op.bancoNome));
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [opsModalidade]);

  // Auto-selecionar o banco ao trocar de modalidade
  useEffect(() => {
    if (opsModalidade.length > 0 && !opsModalidade.some(op => op.bancoId === bancoId)) {
       const melhorDoTipo = [...opsModalidade].sort((a, b) => b.score - a.score || (b.trocoEstimado || 0) - (a.trocoEstimado || 0))[0];
       setBancoId(melhorDoTipo.bancoId);
       setPrazo(melhorDoTipo.prazo);
    }
  }, [modalidade, opsModalidade, bancoId]);

  const opsBanco = opsModalidade.filter(op => op.bancoId === bancoId);

  const prazosDisp = useMemo(() => {
    return Array.from(new Set(opsBanco.map(op => op.prazo))).sort((a, b) => b - a);
  }, [opsBanco]);

  // Auto-selecionar prazo ao trocar de banco
  useEffect(() => {
    if (opsBanco.length > 0 && !opsBanco.some(op => op.prazo === prazo)) {
      setPrazo(prazosDisp[0]);
    }
  }, [bancoId, opsBanco, prazo, prazosDisp]);

  const simulacaoSelecionada = opsBanco.find(op => op.prazo === prazo) || opsBanco[0];

  if (opsValidas.length === 0) {
    return null; // Não exibe o card se não houver oportunidades para esta dívida
  }

  const parseTipo = (t: string) => {
    if (t === "PORTABILIDADE") return "Portabilidade";
    if (t === "REFINANCIAMENTO") return "Refinanciamento";
    if (t === "PORTABILIDADE_REFIN") return "Port. + Refin";
    return t;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* Header do Card (Contrato Atual) */}
      <div className="bg-slate-50 border-b border-slate-200 p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <Landmark className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contrato Atual</p>
              <h3 className="text-xl font-bold text-slate-900">{contrato.bancoNome}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-500">Saldo Devedor</p>
            <p className="text-lg font-bold text-rose-600">R$ {contrato.saldoDevedorEstimado.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col items-center text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Parcela</p>
            <p className="text-sm font-bold text-slate-800">R$ {contrato.valorParcela.toFixed(2)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col items-center text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Taxa</p>
            <p className="text-sm font-bold text-slate-800">{contrato.taxaJuros}% a.m</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col items-center text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Restantes</p>
            <p className="text-sm font-bold text-slate-800">{contrato.prazoRestante}x</p>
          </div>
        </div>
      </div>

      {/* Área Interativa (Simulador) */}
      <div className="p-5 space-y-5">
        
        {/* Filtros em linha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Operação</label>
            <select 
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {modalidadesDisp.map(m => (
                <option key={m} value={m}>{parseTipo(m)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Destino</label>
            <select 
              value={bancoId}
              onChange={(e) => setBancoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={bancosDisp.length <= 1}
            >
              {bancosDisp.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Tabela / Prazo</label>
            <select 
              value={prazo}
              onChange={(e) => setPrazo(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={prazosDisp.length <= 1}
            >
              {prazosDisp.map(p => (
                <option key={p} value={p}>{p}x Meses</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultado Simulado */}
        {simulacaoSelecionada && (
          <div className={`p-5 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-6 ${simulacaoSelecionada.score >= 90 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                {simulacaoSelecionada.score >= 90 && (
                  <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Melhor Oferta</span>
                )}
                <h4 className="font-bold text-slate-800">{simulacaoSelecionada.bancoNome}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {simulacaoSelecionada.mensagens.map((msg, i) => (
                  <span key={i} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                    {msg.includes("Taxa") ? <Percent className="w-3 h-3 text-emerald-500"/> : <TrendingDown className="w-3 h-3 text-indigo-500" />}
                    {msg}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center md:text-right w-full md:w-auto">
              {simulacaoSelecionada.trocoEstimado !== undefined && simulacaoSelecionada.trocoEstimado > 0 ? (
                <>
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Troco Liberado</p>
                  <p className="text-3xl font-black text-indigo-700">R$ {simulacaoSelecionada.trocoEstimado.toFixed(2)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">Redução de Parcela</p>
                  <p className="text-3xl font-black text-emerald-600">
                    R$ {(simulacaoSelecionada.reducaoParcela ?? 0).toFixed(2)}
                  </p>
                </>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
