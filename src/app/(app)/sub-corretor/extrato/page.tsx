import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ExtratoSubCorretorPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao.email) redirect("/login");

  // Busca propostas onde o vendedor é o usuário logado
  const propostas = await prisma.proposta.findMany({
    where: { 
      empresaId: sessao.empresaId,
      vendedorEmail: sessao.email
    },
    orderBy: { createdAt: "desc" }
  });

  // Cálculo de comissões baseadas no split master
  const perfil = await prisma.usuarioPerfil.findFirst({
    where: { empresaId: sessao.empresaId, email: sessao.email }
  });

  const totalVolume = propostas.reduce((acc, p) => acc + (p.valorLiberado || 0), 0);
  const totalComissao = propostas.filter(p => p.status === "PAGA").reduce((acc, p) => acc + (p.valorComissao || 0), 0);
  
  const split = perfil?.percentualSplitMaster || 100;
  const minhaParte = (totalComissao * split) / 100;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Meu Extrato de Comissões</h1>
        <p className="text-zinc-500 text-sm">Acompanhe suas propostas e repasses da {sessao.nomeEmpresa}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border rounded-xl shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase">Volume Total</p>
          <p className="text-2xl font-black">R$ {totalVolume.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white border rounded-xl shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase">Comissão Gerada</p>
          <p className="text-2xl font-black text-emerald-600">R$ {totalComissao.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-violet-600 text-white border rounded-xl shadow-sm">
          <p className="text-xs font-bold text-violet-200 uppercase">Meu Repasse ({split}%)</p>
          <p className="text-2xl font-black">R$ {minhaParte.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Sua Parte</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {propostas.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-medium">{p.clienteNome}</td>
                <td className="px-6 py-4">
                   <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold uppercase">{p.status}</span>
                </td>
                <td className="px-6 py-4">R$ {p.valorLiberado?.toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-emerald-600">
                  R$ {((p.valorComissao || 0) * split / 100).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
