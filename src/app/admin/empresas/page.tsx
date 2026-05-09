import { prisma } from "@/lib/prisma";
import { Building2, Search, MoreVertical, ShieldAlert, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Empresas | Super Admin | Kromuz",
};

export default async function AdminEmpresasPage() {
  const empresas = await prisma.empresa.findMany({
    include: {
      planoSaaS: true,
      _count: {
        select: { usuarios: true, leads: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-violet-500" /> Gestão de Corretoras
          </h1>
          <p className="text-zinc-400 mt-1">Gerencie as assinaturas e bloqueios das {empresas.length} empresas cadastradas.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar corretora..." 
              className="bg-zinc-900 border border-zinc-800 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none w-64 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 font-medium">
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Plano</th>
              <th className="px-6 py-4">Usuários</th>
              <th className="px-6 py-4">Cadastro</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {empresas.map((emp) => (
              <tr key={emp.id} className="hover:bg-zinc-800/30 transition">
                <td className="px-6 py-4">
                  <div className="font-bold text-zinc-100">{emp.nomeEmpresa}</div>
                  <div className="text-xs text-zinc-500">{emp.cpfCnpj || "Sem CNPJ"}</div>
                </td>
                <td className="px-6 py-4">
                  {emp.statusAssinatura === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                    </span>
                  ) : emp.statusAssinatura === "OVERDUE" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="w-3.5 h-3.5" /> Inadimplente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                      <ShieldAlert className="w-3.5 h-3.5" /> Cancelada/Bloqueada
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-zinc-200 font-medium">{emp.planoSaaS?.nome || "Beta/Trial"}</div>
                  {emp.planoSaaS && <div className="text-xs text-zinc-500">R$ {emp.planoSaaS.precoMensal}/mês</div>}
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {emp._count.usuarios} cadastrados
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {emp.createdAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-zinc-500 hover:text-zinc-300 transition">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
