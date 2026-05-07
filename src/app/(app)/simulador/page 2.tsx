import { Suspense } from "react";
import { SimuladorClient } from "./SimuladorClient";

export const metadata = {
  title: "Simulador de Crédito | Kromuz",
  description: "Análise de extrato do INSS e simulação de oportunidades.",
};

// Aqui em produção você pegaria o ID da empresa do usuário logado via Supabase Auth
// Para o momento, vamos hardcodar um ID fixo ou pegar do cookie para testes.
const EMPRESA_ID_TESTE = "1e8b2a3d-4c5f-6g7h-8i9j-0k1l2m3n4o5p"; 

export default function SimuladorPage() {
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
          {/* Aqui chamamos um Client Component para lidar com o estado do upload e resultados */}
          <SimuladorClient empresaId={EMPRESA_ID_TESTE} />
        </Suspense>
      </div>
    </div>
  );
}
