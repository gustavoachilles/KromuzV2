import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { CreditCard, CheckCircle2, AlertCircle, FileText, Download, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Assinatura | Kromuz",
};

export default async function AssinaturaPage() {
  const sessao = await getSessionEmpresa();

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    include: {
      planoSaaS: true,
      faturasSaaS: {
        orderBy: { vencimento: 'desc' },
        take: 12
      },
      _count: {
        select: { usuarios: true, leads: true }
      }
    }
  });

  if (!empresa) return null;

  const planoAtivo = empresa.planoSaaS || {
    nome: "Trial Beta",
    precoMensal: 0,
    limiteUsuarios: 99,
    limiteLeads: 9999
  };

  const isOverdue = empresa.statusAssinatura === "OVERDUE";
  const faturaAberta = empresa.faturasSaaS.find((f: { status: string; vencimento: Date; linkPagamento: string | null }) => f.status === "PENDING" || f.status === "OVERDUE");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand" /> Minha Assinatura
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie seu plano, faturas e limites de uso da plataforma.</p>
      </div>

      {isOverdue && faturaAberta && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-red-800 dark:text-red-400 font-bold text-lg">Assinatura Pendente</h3>
              <p className="text-red-600 dark:text-red-400/80 text-sm mt-1">
                Identificamos uma fatura em aberto vencida em {new Date(faturaAberta.vencimento).toLocaleDateString()}. Seu acesso poderá ser bloqueado em breve.
              </p>
            </div>
          </div>
          <a 
            href={faturaAberta.linkPagamento || "#"} 
            target="_blank" rel="noreferrer"
            className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-600/30 transition"
          >
            Pagar Agora
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Uso do Plano */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Uso do Sistema</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Usuários Ativos</span>
                  <span className="text-zinc-500">{empresa._count.usuarios} de {planoAtivo.limiteUsuarios}</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand rounded-full" 
                    style={{ width: `${Math.min(100, (empresa._count.usuarios / planoAtivo.limiteUsuarios) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Leads Armazenados</span>
                  <span className="text-zinc-500">{empresa._count.leads} de {planoAtivo.limiteLeads}</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand/50 rounded-full" 
                    style={{ width: `${Math.min(100, (empresa._count.leads / planoAtivo.limiteLeads) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Faturas */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Histórico de Pagamentos</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Vencimento</th>
                  <th className="px-6 py-3 font-medium">Valor</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {empresa.faturasSaaS.map((fatura: any) => (
                  <tr key={fatura.id}>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {new Date(fatura.vencimento).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)}
                    </td>
                    <td className="px-6 py-4">
                      {fatura.status === "PAID" && <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">PAGO</span>}
                      {fatura.status === "PENDING" && <span className="text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">AGUARDANDO</span>}
                      {fatura.status === "OVERDUE" && <span className="text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">VENCIDO</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {fatura.linkPagamento && fatura.status !== "PAID" && (
                        <a href={fatura.linkPagamento} target="_blank" rel="noreferrer" className="text-brand font-medium hover:underline text-xs">Pagar</a>
                      )}
                      {fatura.status === "PAID" && (
                        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" title="Baixar Recibo">
                          <Download className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {empresa.faturasSaaS.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      Nenhuma fatura gerada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plano Resumo */}
        <div className="bg-brand rounded-2xl p-6 text-white h-fit shadow-xl shadow-brand/20">
          <div className="flex items-center gap-2 text-white/80 mb-2 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Plano Atual
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-6">{planoAtivo.nome}</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <p className="text-white/80">Usuários inclusos</p>
                <p className="font-bold">{planoAtivo.limiteUsuarios}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <p className="text-white/80">Integração Asaas/Bancos</p>
                <p className="font-bold">Ilimitada</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm">Valor mensal</p>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planoAtivo.precoMensal)}
                </div>
              </div>
            </div>
            <button className="w-full bg-white text-brand hover:bg-zinc-100 px-4 py-3 rounded-xl font-bold transition shadow-sm">
              Fazer Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
