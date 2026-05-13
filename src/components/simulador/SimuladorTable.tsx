"use client";

import { ContratoAtivo, Oportunidade } from "@/lib/motor-regras/simulador";
import { SimuladorTableRow } from "./SimuladorTableRow";

interface SimuladorTableProps {
  contratos: ContratoAtivo[];
  oportunidades: Oportunidade[];
  onOpenInsight?: (context: any) => void;
}

export function SimuladorTable({ contratos, oportunidades, onOpenInsight }: SimuladorTableProps) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center w-[50px]">Alt.</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Banco Original</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Espécie</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Início</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Fim</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Averbado</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Digitado</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Taxa</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Parcela</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Prazo (Pg/Rest)</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">S.D. Estimado</th>
            <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Opções</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {contratos.map((contrato) => (
            <SimuladorTableRow 
              key={contrato.id} 
              contrato={contrato} 
              oportunidades={oportunidades} 
              onOpenInsight={onOpenInsight}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
