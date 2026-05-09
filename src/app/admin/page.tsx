import { prisma } from "@/lib/prisma";
import { TrendingUp, Users, AlertCircle, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin | Kromuz",
};

export default async function AdminDashboardPage() {
  const [empresasAtivas, faturasVencidas, faturasPagas] = await Promise.all([
    prisma.empresa.count({ where: { statusAssinatura: "ACTIVE" } }),
    prisma.faturaSaaS.findMany({ 
      where: { status: "OVERDUE" },
      include: { empresa: true }
    }),
    prisma.faturaSaaS.aggregate({
      where: { 
        status: "PAID",
        vencimento: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } // Este mês
      },
      _sum: { valor: true }
    })
  ]);

  const mrrMensal = faturasPagas._sum.valor || 0;
  const inadimplenciaTotal = faturasVencidas.reduce((acc, f) => acc + f.valor, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Executivo</h1>
        <p className="text-zinc-400 mt-1">Visão geral do faturamento e saúde dos Corbans SaaS.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">MRR (Mês Atual)</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrMensal)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Users className="w-5 h-5 text-violet-500" />
            <span className="text-sm font-medium">Corbans Ativos</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {empresasAtivas}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">Inadimplência</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inadimplenciaTotal)}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {faturasVencidas.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" /> Faturas Vencidas ({faturasVencidas.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-red-500/20 text-red-400/70 text-xs uppercase">
                  <th className="pb-3 font-medium">Empresa</th>
                  <th className="pb-3 font-medium">Vencimento</th>
                  <th className="pb-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/10">
                {faturasVencidas.map(fatura => (
                  <tr key={fatura.id}>
                    <td className="py-3 text-zinc-200">{fatura.empresa.nomeEmpresa}</td>
                    <td className="py-3 text-zinc-400">{new Date(fatura.vencimento).toLocaleDateString()}</td>
                    <td className="py-3 font-bold text-red-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
