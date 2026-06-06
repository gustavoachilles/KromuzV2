import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { getPlano, PLANOS, type PlanoSlug } from "@/lib/planos";
import { CreditCard, CheckCircle2, AlertCircle, FileText, Download, Users, Zap, Star, Crown, ArrowUp, Database, HardDrive, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Assinatura | Kromuz",
};

const PLANOS_UPGRADE = [
  { slug: "start" as PlanoSlug, preco: 69.90, icon: Zap },
  { slug: "pro" as PlanoSlug, preco: 149.90, icon: Star },
  { slug: "black" as PlanoSlug, preco: 349.90, icon: Crown },
];

export default async function AssinaturaPage() {
  const sessao = await getSessionEmpresa();

  const empresa = await prisma.empresa.findUnique({
    where: { id: sessao.empresaId },
    include: {
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

  const planoSlug = empresa.planoSlug || "beta";
  const planoInfo = getPlano(planoSlug);
  
  const isOverdue = empresa.statusAssinatura === "OVERDUE";
  const faturaAberta = empresa.faturasSaaS.find((f: { status: string; vencimento: Date; linkPagamento: string | null }) => f.status === "PENDING" || f.status === "OVERDUE");

  // Calcular percentuais de uso
  const usuariosUsados = empresa._count.usuarios;
  const leadsUsados = empresa._count.leads;
  const limiteUsuarios = planoInfo.limiteUsuarios === Infinity ? 999 : planoInfo.limiteUsuarios;
  const limiteLeads = planoInfo.limiteLeads === Infinity ? 999999 : planoInfo.limiteLeads;
  const pctUsuarios = Math.min(100, (usuariosUsados / limiteUsuarios) * 100);
  const pctLeads = Math.min(100, (leadsUsados / limiteLeads) * 100);

  // Identificar planos superiores para upgrade
  const ordemPlanos: PlanoSlug[] = ["start", "pro", "black"];
  const idxAtual = ordemPlanos.indexOf(planoSlug as PlanoSlug);
  const planosSuperiores = PLANOS_UPGRADE.filter((_, i) => i > idxAtual);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand" /> Minha Assinatura
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie seu plano, limites e faturas.</p>
      </div>

      {isOverdue && faturaAberta && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-red-800 dark:text-red-400 font-bold text-lg">Assinatura Pendente</h3>
              <p className="text-red-600 dark:text-red-400/80 text-sm mt-1">
                Fatura vencida em {new Date(faturaAberta.vencimento).toLocaleDateString()}. Seu acesso poderá ser bloqueado.
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
          
          {/* Card do Plano Atual */}
          <div 
            className="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${planoInfo.cor}dd, ${planoInfo.cor}88)` }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 -mr-12 -mt-12" 
              style={{ background: `radial-gradient(circle, white, transparent)` }} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm font-medium">Plano Atual</p>
                  <h2 className="text-3xl font-black tracking-tight">{planoInfo.nome}</h2>
                </div>
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20"
                >
                  {planoSlug === "start" ? <Zap className="w-7 h-7" /> 
                   : planoSlug === "pro" ? <Star className="w-7 h-7" /> 
                   : planoSlug === "black" ? <Crown className="w-7 h-7" />
                   : <Zap className="w-7 h-7" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <Users className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{planoInfo.limiteUsuarios === Infinity ? "∞" : planoInfo.limiteUsuarios}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Usuários</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <Database className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{planoInfo.limiteLeads === Infinity ? "∞" : planoInfo.limiteLeads.toLocaleString()}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Leads</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <HardDrive className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{planoInfo.limiteLeads === Infinity ? "100 GB" : planoSlug === "pro" ? "20 GB" : "5 GB"}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Storage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Uso do Sistema */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Consumo Atual</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Usuários Ativos</span>
                  <span className="text-zinc-500">
                    {usuariosUsados} de {planoInfo.limiteUsuarios === Infinity ? "∞" : limiteUsuarios}
                  </span>
                </div>
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${planoInfo.limiteUsuarios === Infinity ? 5 : pctUsuarios}%`,
                      backgroundColor: pctUsuarios > 80 ? "#ef4444" : planoInfo.cor 
                    }}
                  />
                </div>
                {pctUsuarios > 80 && planoInfo.limiteUsuarios !== Infinity && (
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Próximo do limite — considere fazer upgrade
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Leads na Base</span>
                  <span className="text-zinc-500">
                    {leadsUsados.toLocaleString()} de {planoInfo.limiteLeads === Infinity ? "∞" : limiteLeads.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${planoInfo.limiteLeads === Infinity ? 2 : pctLeads}%`,
                      backgroundColor: pctLeads > 80 ? "#ef4444" : `${planoInfo.cor}88`
                    }}
                  />
                </div>
                {pctLeads > 80 && planoInfo.limiteLeads !== Infinity && (
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Próximo do limite — considere fazer upgrade
                  </p>
                )}
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
                  <th className="px-6 py-3 font-medium text-right">Ação</th>
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

        {/* Coluna Direita — Upgrade */}
        <div className="space-y-4">
          {planosSuperiores.length > 0 ? (
            <>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold px-1">Fazer Upgrade</p>
              {planosSuperiores.map((p) => {
                const info = getPlano(p.slug);
                const Icon = p.icon;
                return (
                  <div 
                    key={p.slug}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-violet-500/30 transition group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${info.cor}15`, border: `1px solid ${info.cor}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: info.cor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{info.nome}</h3>
                        <p className="text-xs text-zinc-500">
                          {info.limiteUsuarios === Infinity ? "∞" : info.limiteUsuarios} usuários · {info.limiteLeads === Infinity ? "∞" : info.limiteLeads.toLocaleString()} leads
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">
                          R$ {p.preco.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-zinc-500">/mês</span>
                      </div>
                      <button 
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition"
                        style={{ backgroundColor: `${info.cor}15`, color: info.cor }}
                      >
                        <ArrowUp className="w-3 h-3" /> Upgrade
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div 
              className="rounded-2xl p-6 text-center"
              style={{ background: `linear-gradient(135deg, ${planoInfo.cor}15, ${planoInfo.cor}05)`, border: `1px solid ${planoInfo.cor}20` }}
            >
              <Crown className="w-8 h-8 mx-auto mb-3" style={{ color: planoInfo.cor }} />
              <h3 className="font-bold text-zinc-900 dark:text-white">Plano Máximo</h3>
              <p className="text-xs text-zinc-500 mt-1">Você está no plano mais completo do Kromuz!</p>
            </div>
          )}

          {/* Módulos do plano */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">Módulos Inclusos</p>
            <div className="space-y-2">
              {planoInfo.modulosPermitidos.map((mod) => (
                <div key={mod} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: planoInfo.cor }} />
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize">{mod === "*" ? "Todos os módulos" : mod.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
