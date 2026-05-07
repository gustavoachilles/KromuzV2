import { Suspense } from "react";
import { SimuladorClient } from "./SimuladorClient";
import { getSessionEmpresa } from "@/lib/session";

export const metadata = {
  title: "Simulador de Crédito | Kromuz",
  description: "Análise de extrato do INSS e simulação de oportunidades.",
};

export default async function SimuladorPage() {
  const sessao = await getSessionEmpresa();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Simulador de Oportunidades — Online
          </h1>
          <p className="text-slate-500 mt-1">
            Faça o upload do Extrato de Empréstimos (HISCON) para análise instantânea
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-slate-200">
        <Suspense fallback={<div className="p-8 text-center">Carregando interface...</div>}>
          <SimuladorClient empresaId={sessao.empresaId} />
        </Suspense>
      </div>
    </div>
  );
}
