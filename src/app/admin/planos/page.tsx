import { prisma } from "@/lib/prisma";
import { CreditCard, Plus, Check } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Planos SaaS | Super Admin | Kromuz",
};

export default async function AdminPlanosPage() {
  const planos = await prisma.planoSaaS.findMany({
    orderBy: { precoMensal: 'asc' },
    include: {
      _count: {
        select: { empresas: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-violet-500" /> Planos SaaS
          </h1>
          <p className="text-zinc-400 mt-1">Configure os planos e limites oferecidos aos lojistas.</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-violet-500/20">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div key={plano.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-2">{plano.nome}</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-3xl font-black text-violet-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plano.precoMensal)}
              </span>
              <span className="text-zinc-500 mb-1">/mês</span>
            </div>

            <div className="space-y-3 flex-1 mb-6">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500" /> Até {plano.limiteUsuarios} usuários
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500" /> Até {plano.limiteLeads} leads/mês
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500" /> Disparos Inclusos: {plano.limiteDisparos}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500" /> Integração Bancária
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 text-sm text-zinc-500 flex justify-between items-center">
              <span>{plano._count.empresas} empresas ativas</span>
              <button className="text-violet-400 font-medium hover:text-violet-300 transition">Editar</button>
            </div>
          </div>
        ))}
        {planos.length === 0 && (
          <div className="col-span-3 text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
            Nenhum plano cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
