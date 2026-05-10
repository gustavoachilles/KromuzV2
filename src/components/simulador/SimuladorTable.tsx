"use client";

import { ContratoAtivo, Oportunidade } from "@/lib/motor-regras/simulador";
import { SimuladorTableRow } from "./SimuladorTableRow";

interface SimuladorTableProps {
  contratos: ContratoAtivo[];
  oportunidades: Oportunidade[];
}

export function SimuladorTable({ contratos, oportunidades }: SimuladorTableProps) {
  if (contratos.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <p className="text-slate-500 italic">Nenhum contrato ativo encontrado no benefício.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 rounded-t-xl">
        <h3 className="text-white font-bold text-sm">PORTABILIDADE E REFINANCIAMENTO</h3>
      </div>
      
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase w-[40px] text-center">Sel.</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Banco</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Contrato</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Averbação</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Início Desc.</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Final Desc.</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Valor Contrato</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Taxa</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Valor Parcela</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Pagas / Total</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Quitação</th>
            <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center"></th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((contrato) => (
            <SimuladorTableRow 
              key={contrato.id} 
              contrato={contrato} 
              oportunidades={oportunidades} 
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
