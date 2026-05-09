"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Download, ChevronLeft, ChevronRight, DollarSign, Wallet, Users, Info } from "lucide-react";

type Holerite = {
  vendedor: {
    email: string;
    nome: string | null;
    perfilSlug: string;
    tipoRemuneracao: string;
    percentualFixo: number | null;
    salarioFixo: number | null;
  };
  producao: {
    propostasCount: number;
    volumeTotal: number;
    comissaoCorretora: number;
  };
  holerite: {
    salarioFixo: number;
    comissaoVendedor: number;
    valorTotalReceber: number;
  };
};

const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function FechamentoClient({
  mes,
  ano,
  holerites,
  isAdmin
}: {
  mes: number;
  ano: number;
  holerites: Holerite[];
  isAdmin: boolean;
}) {
  const router = useRouter();

  const handleMesChange = (delta: number) => {
    let newMes = mes + delta;
    let newAno = ano;
    if (newMes > 12) { newMes = 1; newAno++; }
    else if (newMes < 1) { newMes = 12; newAno--; }
    router.push(`/comissoes/fechamento?mes=${newMes}&ano=${newAno}`);
  };

  const totalFolha = holerites.reduce((acc, h) => acc + h.holerite.valorTotalReceber, 0);
  const totalReceitaCorretora = holerites.reduce((acc, h) => acc + h.producao.comissaoCorretora, 0);
  const totalVolumeVendido = holerites.reduce((acc, h) => acc + h.producao.volumeTotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
              <Calculator className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Fechamento de Folha</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Comissões da Equipe</h1>
            <p className="text-zinc-500 mt-1">Holerites baseados nas Propostas Pagas e no Percentual de Comissão de cada corretor.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-sm">
            <button onClick={() => handleMesChange(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-600"><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-4 font-bold min-w-[120px] text-center">{meses[mes]} {ano}</span>
            <button onClick={() => handleMesChange(1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-600"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Resumo da Corretora */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
              <Wallet className="w-8 h-8 text-violet-200 mb-4" />
              <p className="text-sm font-semibold text-violet-200 uppercase tracking-wider mb-1">Receita da Corretora</p>
              <h3 className="text-3xl font-black">R$ {totalReceitaCorretora.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <DollarSign className="w-8 h-8 text-emerald-500 mb-4" />
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-1">Total a Pagar (Folha)</p>
              <h3 className="text-3xl font-black text-emerald-600">R$ {totalFolha.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <Users className="w-8 h-8 text-blue-500 mb-4" />
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-1">Volume Total Produzido</p>
              <h3 className="text-3xl font-black text-zinc-800 dark:text-zinc-100">R$ {totalVolumeVendido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
            </div>
          </div>
        )}

        {/* Tabela de Holerites */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400">Vendedor</th>
                <th className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400 text-right">Volume Liberado</th>
                <th className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400 text-right">Regra / Faixa</th>
                <th className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400 text-right">Salário Fixo</th>
                <th className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400 text-right">Comissão</th>
                <th className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100 text-right bg-emerald-50 dark:bg-emerald-900/10">A Receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {holerites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum vendedor encontrado ou sem produção no período.
                  </td>
                </tr>
              ) : holerites.map((h) => (
                <tr key={h.vendedor.email} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{h.vendedor.nome || h.vendedor.email}</div>
                    <div className="text-xs text-zinc-500">{h.producao.propostasCount} propostas pagas</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    R$ {h.producao.volumeTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {h.vendedor.tipoRemuneracao === "PERCENTUAL_FIXO" ? (
                      <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs font-bold">
                        {h.vendedor.percentualFixo}% FLAT
                      </span>
                    ) : h.vendedor.tipoRemuneracao === "SEM_COMISSAO" ? (
                      <span className="text-zinc-400 text-xs">Sem Comissão</span>
                    ) : (
                      <span className="text-xs">Meta / Faixas</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-600">
                    R$ {h.holerite.salarioFixo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-violet-600">
                    R$ {h.holerite.comissaoVendedor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10">
                    R$ {h.holerite.valorTotalReceber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span className="flex items-center gap-1"><Info className="w-4 h-4" /> Para alterar o percentual de cada vendedor, acesse Configurações {">"} Equipe.</span>
            <button className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 px-4 py-2 rounded-lg font-medium hover:bg-zinc-100 transition">
              <Download className="w-4 h-4" />
              Exportar Holerites
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
