"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertCircle, Download, Users, Zap, Star, Crown,
  ArrowUp, ArrowDown, Database, HardDrive, Loader2, X,
} from "lucide-react";

type PlanoInfo = {
  nome: string;
  badge: string;
  cor: string;
  limiteUsuarios: number; // -1 = infinity
  limiteLeads: number;    // -1 = infinity
  modulosPermitidos: string[];
};

type Fatura = {
  id: string;
  valor: number;
  status: string;
  vencimento: string;
  linkPagamento: string | null;
};

type PlanoSlugType = "start" | "pro" | "black" | "beta";

const PLANOS_UPGRADE = [
  { slug: "start" as PlanoSlugType, nome: "Kromuz Start", preco: 69.90, usuarios: "5", leads: "1.000", icon: Zap, cor: "#22c55e" },
  { slug: "pro" as PlanoSlugType, nome: "Kromuz Pro", preco: 149.90, usuarios: "10", leads: "10.000", icon: Star, cor: "#3b82f6" },
  { slug: "black" as PlanoSlugType, nome: "Kromuz Black", preco: 349.90, usuarios: "∞", leads: "∞", icon: Crown, cor: "#a855f7" },
];

export function AssinaturaClient({
  planoSlug,
  planoInfo,
  usuariosUsados,
  leadsUsados,
  statusAssinatura,
  faturas,
}: {
  planoSlug: string;
  planoInfo: PlanoInfo;
  usuariosUsados: number;
  leadsUsados: number;
  statusAssinatura: string;
  faturas: Fatura[];
}) {
  const router = useRouter();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const isInfinity = (v: number) => v === -1;
  const limiteUsuarios = isInfinity(planoInfo.limiteUsuarios) ? 999 : planoInfo.limiteUsuarios;
  const limiteLeads = isInfinity(planoInfo.limiteLeads) ? 999999 : planoInfo.limiteLeads;
  const pctUsuarios = Math.min(100, (usuariosUsados / limiteUsuarios) * 100);
  const pctLeads = Math.min(100, (leadsUsados / limiteLeads) * 100);

  const ordemPlanos: PlanoSlugType[] = ["start", "pro", "black"];
  const idxAtual = ordemPlanos.indexOf(planoSlug as PlanoSlugType);
  const planosSuperiores = PLANOS_UPGRADE.filter((_, i) => i > idxAtual);
  const planosInferiores = PLANOS_UPGRADE.filter((_, i) => i < idxAtual && idxAtual !== -1);

  const isOverdue = statusAssinatura === "OVERDUE";
  const faturaAberta = faturas.find(f => f.status === "PENDING" || f.status === "OVERDUE");

  async function handleUpgrade(slug: string) {
    setUpgradeLoading(slug);
    setUpgradeError(null);
    setUpgradeSuccess(null);
    setShowConfirm(null);

    try {
      const res = await fetch("/api/assinatura/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planoDesejado: slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setUpgradeError(data.error || "Erro ao fazer upgrade");
        return;
      }

      setUpgradeSuccess(data.message || `Alteração realizada! 🎉`);
      
      // Se tiver link de pagamento do Asaas, abrir
      if (data.paymentLink) {
        window.open(data.paymentLink, "_blank");
      }

      // Recarregar página após 2s
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      setUpgradeError("Erro de conexão. Tente novamente.");
    } finally {
      setUpgradeLoading(null);
    }
  }

  return (
    <>
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

      {/* Mensagens de sucesso/erro */}
      {upgradeSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-800 dark:text-emerald-300 font-medium">{upgradeSuccess}</p>
        </div>
      )}
      {upgradeError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-800 dark:text-red-300 font-medium">{upgradeError}</p>
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
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20">
                  {planoSlug === "start" ? <Zap className="w-7 h-7" /> 
                   : planoSlug === "pro" ? <Star className="w-7 h-7" /> 
                   : planoSlug === "black" ? <Crown className="w-7 h-7" />
                   : <Zap className="w-7 h-7" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <Users className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{isInfinity(planoInfo.limiteUsuarios) ? "∞" : planoInfo.limiteUsuarios}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Usuários</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <Database className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{isInfinity(planoInfo.limiteLeads) ? "∞" : planoInfo.limiteLeads.toLocaleString()}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Leads</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                  <HardDrive className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-lg font-bold">{isInfinity(planoInfo.limiteLeads) ? "100 GB" : planoSlug === "pro" ? "20 GB" : "5 GB"}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Storage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Consumo Atual */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Consumo Atual</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Usuários Ativos</span>
                  <span className="text-zinc-500">
                    {usuariosUsados} de {isInfinity(planoInfo.limiteUsuarios) ? "∞" : limiteUsuarios}
                  </span>
                </div>
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${isInfinity(planoInfo.limiteUsuarios) ? 5 : pctUsuarios}%`,
                      backgroundColor: pctUsuarios > 80 ? "#ef4444" : planoInfo.cor 
                    }}
                  />
                </div>
                {pctUsuarios > 80 && !isInfinity(planoInfo.limiteUsuarios) && (
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Próximo do limite — considere fazer upgrade
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Leads na Base</span>
                  <span className="text-zinc-500">
                    {leadsUsados.toLocaleString()} de {isInfinity(planoInfo.limiteLeads) ? "∞" : limiteLeads.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${isInfinity(planoInfo.limiteLeads) ? 2 : pctLeads}%`,
                      backgroundColor: pctLeads > 80 ? "#ef4444" : `${planoInfo.cor}88`
                    }}
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
                  <th className="px-6 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {faturas.map((fatura) => (
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
                {faturas.length === 0 && (
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
                const Icon = p.icon;
                const isLoading = upgradeLoading === p.slug;
                return (
                  <div 
                    key={p.slug}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-violet-500/30 transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${p.cor}15`, border: `1px solid ${p.cor}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: p.cor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{p.nome}</h3>
                        <p className="text-xs text-zinc-500">
                          {p.usuarios} usuários · {p.leads} leads
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

                      {showConfirm === p.slug ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpgrade(p.slug)}
                            disabled={isLoading}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Confirmar
                          </button>
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="flex items-center text-xs px-2 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowConfirm(p.slug)}
                          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition hover:opacity-80"
                          style={{ backgroundColor: `${p.cor}15`, color: p.cor }}
                        >
                          <ArrowUp className="w-3 h-3" /> Upgrade
                        </button>
                      )}
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

          {/* Downgrade */}
          {planosInferiores.length > 0 && (
            <>
              <div className="mx-3 my-2 h-px bg-zinc-200 dark:bg-zinc-800" />
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold px-1">Reduzir Plano</p>
              {planosInferiores.map((p) => {
                const Icon = p.icon;
                const isLoading = upgradeLoading === p.slug;
                return (
                  <div 
                    key={p.slug}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 opacity-70 hover:opacity-100 transition"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${p.cor}10`, border: `1px solid ${p.cor}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: p.cor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">{p.nome}</h3>
                        <p className="text-[10px] text-zinc-400">{p.usuarios} usuários · {p.leads} leads</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
                          R$ {p.preco.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-zinc-400">/mês</span>
                      </div>
                      {showConfirm === p.slug ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpgrade(p.slug)}
                            disabled={isLoading}
                            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Confirmar
                          </button>
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="flex items-center text-[10px] px-1.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirm(p.slug)}
                          className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                        >
                          <ArrowDown className="w-3 h-3" /> Downgrade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
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
    </>
  );
}
