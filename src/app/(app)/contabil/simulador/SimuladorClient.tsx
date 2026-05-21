"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingDown, DollarSign, BadgePercent, ArrowRight, Scale } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

// Tabela Simples Nacional (Anexo III — Serviços)
const SIMPLES_FAIXAS = [
  { ate: 180000, aliquota: 6.0, deducao: 0 },
  { ate: 360000, aliquota: 11.2, deducao: 9360 },
  { ate: 720000, aliquota: 13.5, deducao: 17640 },
  { ate: 1800000, aliquota: 16.0, deducao: 35640 },
  { ate: 3600000, aliquota: 21.0, deducao: 125640 },
  { ate: 4800000, aliquota: 33.0, deducao: 648000 },
];

function calcSimples(receitaAnual: number) {
  const faixa = SIMPLES_FAIXAS.find(f => receitaAnual <= f.ate) || SIMPLES_FAIXAS[SIMPLES_FAIXAS.length - 1];
  const aliquotaEfetiva = receitaAnual > 0 ? ((receitaAnual * faixa.aliquota / 100) - faixa.deducao) / receitaAnual * 100 : 0;
  const impostoMensal = (receitaAnual * aliquotaEfetiva / 100) / 12;
  return { aliquotaNominal: faixa.aliquota, aliquotaEfetiva: Math.max(0, aliquotaEfetiva), impostoMensal: Math.max(0, impostoMensal), impostoAnual: Math.max(0, impostoMensal * 12) };
}

function calcLucroPresumido(receitaAnual: number) {
  const receitaMensal = receitaAnual / 12;
  const baseCalculo = receitaMensal * 0.32; // Presunção 32% para serviços
  const irpj = baseCalculo * 0.15;
  const csll = baseCalculo * 0.09;
  const pis = receitaMensal * 0.0065;
  const cofins = receitaMensal * 0.03;
  const iss = receitaMensal * 0.05; // 5% ISS máximo
  const totalMensal = irpj + csll + pis + cofins + iss;
  const aliquotaEfetiva = receitaMensal > 0 ? (totalMensal / receitaMensal) * 100 : 0;
  return { irpj, csll, pis, cofins, iss, totalMensal, impostoAnual: totalMensal * 12, aliquotaEfetiva };
}

function calcMEI() {
  return { totalMensal: 75.60, impostoAnual: 75.60 * 12, aliquotaEfetiva: 0, limiteAnual: 81000 };
}

export function SimuladorClient() {
  const [receitaMensal, setReceitaMensal] = useState("");
  const [despesasMensais, setDespesasMensais] = useState("");
  const [folhaMensal, setFolhaMensal] = useState("");

  const receita = parseFloat(receitaMensal) || 0;
  const despesas = parseFloat(despesasMensais) || 0;
  const folha = parseFloat(folhaMensal) || 0;
  const receitaAnual = receita * 12;

  const simples = useMemo(() => calcSimples(receitaAnual), [receitaAnual]);
  const presumido = useMemo(() => calcLucroPresumido(receitaAnual), [receitaAnual]);
  const mei = calcMEI();

  const lucroSimples = receita - despesas - folha - simples.impostoMensal;
  const lucroPresumido = receita - despesas - folha - presumido.totalMensal;
  const lucroMEI = Math.min(receita, mei.limiteAnual / 12) - despesas - folha - mei.totalMensal;

  const melhorOpcao = receitaAnual <= mei.limiteAnual ? "MEI" :
    simples.impostoMensal <= presumido.totalMensal ? "Simples Nacional" : "Lucro Presumido";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1"><Scale className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Fiscal</span></div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Simulador Tributário</h1>
          <p className="text-zinc-500 text-sm mt-1">Compare regimes tributários em tempo real. MEI vs Simples Nacional vs Lucro Presumido.</p>
        </header>

        {/* Inputs */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Dados da Empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Receita Mensal (R$)</label>
              <input type="number" step="100" placeholder="50.000" value={receitaMensal} onChange={e => setReceitaMensal(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none text-lg font-bold" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Despesas Fixas Mensais (R$)</label>
              <input type="number" step="100" placeholder="15.000" value={despesasMensais} onChange={e => setDespesasMensais(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Folha de Pagamento (R$)</label>
              <input type="number" step="100" placeholder="8.000" value={folhaMensal} onChange={e => setFolhaMensal(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
            </div>
          </div>
          {receita > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-brand" />
              <span className="text-sm text-zinc-500">Receita anual estimada: <strong className="text-zinc-900 dark:text-white">{fmt(receitaAnual)}</strong></span>
            </div>
          )}
        </div>

        {/* Comparativo */}
        {receita > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* MEI */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-sm ${melhorOpcao === "MEI" ? "border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800" : "border-zinc-200 dark:border-zinc-800"} ${receitaAnual > mei.limiteAnual ? "opacity-50" : ""}`}>
              {melhorOpcao === "MEI" && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-3 inline-block">⭐ MAIS ECONÔMICO</span>}
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">MEI</h3>
              <p className="text-xs text-zinc-400 mb-4">Microempreendedor Individual</p>
              {receitaAnual > mei.limiteAnual ? (
                <p className="text-xs text-rose-500 font-bold">❌ Ultrapassa o limite de {fmt(mei.limiteAnual)}/ano</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-xs text-zinc-400">DAS Fixo</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(mei.totalMensal)}/mês</span></div>
                  <div className="flex justify-between"><span className="text-xs text-zinc-400">Imposto Anual</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(mei.impostoAnual)}</span></div>
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Lucro Líquido</span>
                    <span className={`font-bold ${lucroMEI >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(lucroMEI)}/mês</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Simples Nacional */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-sm ${melhorOpcao === "Simples Nacional" ? "border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800" : "border-zinc-200 dark:border-zinc-800"}`}>
              {melhorOpcao === "Simples Nacional" && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-3 inline-block">⭐ MAIS ECONÔMICO</span>}
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Simples Nacional</h3>
              <p className="text-xs text-zinc-400 mb-4">Anexo III (Serviços)</p>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-zinc-400">Alíquota Nominal</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{simples.aliquotaNominal}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">Alíquota Efetiva</span><span className="font-bold text-brand">{simples.aliquotaEfetiva.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">DAS Mensal</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(simples.impostoMensal)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">Imposto Anual</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(simples.impostoAnual)}</span></div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                  <span className="text-xs font-semibold text-zinc-500">Lucro Líquido</span>
                  <span className={`font-bold ${lucroSimples >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(lucroSimples)}/mês</span>
                </div>
              </div>
            </motion.div>

            {/* Lucro Presumido */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className={`bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-sm ${melhorOpcao === "Lucro Presumido" ? "border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800" : "border-zinc-200 dark:border-zinc-800"}`}>
              {melhorOpcao === "Lucro Presumido" && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-3 inline-block">⭐ MAIS ECONÔMICO</span>}
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Lucro Presumido</h3>
              <p className="text-xs text-zinc-400 mb-4">Presunção 32% (Serviços)</p>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-zinc-400">IRPJ</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(presumido.irpj)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">CSLL</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(presumido.csll)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">PIS/COFINS</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(presumido.pis + presumido.cofins)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">ISS</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(presumido.iss)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">Alíquota Efetiva</span><span className="font-bold text-brand">{presumido.aliquotaEfetiva.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-400">Total Mensal</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(presumido.totalMensal)}</span></div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                  <span className="text-xs font-semibold text-zinc-500">Lucro Líquido</span>
                  <span className={`font-bold ${lucroPresumido >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(lucroPresumido)}/mês</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Economia */}
        {receita > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-emerald-500/10 to-brand/10 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Análise Automática</h3>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Para uma receita de <strong>{fmt(receitaAnual)}/ano</strong>, o regime <strong>{melhorOpcao}</strong> é o mais vantajoso.
              {melhorOpcao === "Simples Nacional" && ` Economia de ${fmt((presumido.totalMensal - simples.impostoMensal) * 12)}/ano vs Lucro Presumido.`}
              {melhorOpcao === "Lucro Presumido" && ` Economia de ${fmt((simples.impostoMensal - presumido.totalMensal) * 12)}/ano vs Simples Nacional.`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
