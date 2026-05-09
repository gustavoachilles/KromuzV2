import { Suspense } from "react";
import { SimuladorClient } from "./SimuladorClient";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Simulador de Crédito | Kromuz",
  description: "Análise de extrato do INSS e simulação de oportunidades.",
};

export default async function SimuladorPage() {
  const sessao = await getSessionEmpresa();

  const convenios = await prisma.convenio.findMany({
    where: { empresaId: sessao.empresaId, ativo: true },
    select: { id: true, nome: true }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Simulador de Oportunidades
          </h1>
          <p className="text-slate-500 mt-1">
            Análise automática de HISCON e Calculadora Manual de margem
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-slate-200">
        <Suspense fallback={<div className="p-8 text-center">Carregando interface...</div>}>
          <SimuladorClient empresaId={sessao.empresaId} convenios={convenios} />
        </Suspense>
      </div>
    </div>
  );
}
