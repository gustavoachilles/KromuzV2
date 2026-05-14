"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Building2, CheckCircle2, BarChart3, Plus, FileText, Banknote, Clock, AlertCircle, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MesData = { label: string; volume: number; comissao: number; parcela: number; count: number };
type BancoGrupo = { bancoNome: string | null; _count: number; _sum: { valorLiberado: number | null; valorComissao: number | null } };
type VendedorGrupo = { vendedorEmail: string | null; vendedorNome: string | null; _count: number; _sum: { valorLiberado: number | null; valorComissao: number | null } };
type Totais = { volume: number; comissao: number; count: number };

type FaturaBanco = {
  id: string;
  codigoLote: string;
  bancoNome: string;
  status: string;
  dataEmissao: string | Date;
  dataPagamento: string | Date | null;
  valorTotal: number;
  _count: { propostas: number };
};

type PropostaPendente = {
  id: string;
  bancoNome: string | null;
  valorComissao: number | null;
};

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function fmtFull(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function DashFinanceiroClient({
  meses,
  porBanco,
  porVendedor = [],
  usuarios = [],
  totais,
  faturasIniciais,
  pendentesIniciais
}: {
  meses: MesData[];
  porBanco: BancoGrupo[];
  porVendedor?: VendedorGrupo[];
  usuarios?: any[];
  totais: Totais;
  faturasIniciais?: FaturaBanco[];
  pendentesIniciais?: PropostaPendente[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"visao_geral" | "vendedores" | "rede" | "lotes">("visao_geral");
  const [isGerandoLote, setIsGerandoLote] = useState(false);
  const [faturas, setFaturas] = useState(faturasIniciais || []);

  const maxVolume = Math.max(...meses.map((m) => m.volume), 1);
  const maxBanco = Math.max(...porBanco.map((b) => b._sum.valorLiberado || 0), 1);
  const maxVendedor = Math.max(...porVendedor.map((v) => v._sum.valorLiberado || 0), 1);
  const taxaComissao = totais.volume > 0 ? ((totais.comissao / totais.volume) * 100).toFixed(2) : "0.00";

  // Agrupar propostas pendentes por banco
  const pendentesPorBanco = pendentesIniciais?.reduce((acc, p) => {
    const b = p.bancoNome || "Desconhecido";
    if (!acc[b]) acc[b] = { count: 0, valor: 0, ids: [] };
    acc[b].count++;
    acc[b].valor += (p.valorComissao || 0);
    acc[b].ids.push(p.id);
    return acc;
  }, {} as Record<string, { count: number; valor: number; ids: string[] }>) || {};

  // Calcular Hierarquia Master/Sub
  const masterData: Record<string, { nome: string; volumeMaster: number; comissaoMaster: number; subs: any[]; splitRecebido: number }> = {};
  
  if (usuarios) {
    usuarios.filter(u => !u.masterId).forEach(master => {
      masterData[master.id] = {
        nome: master.nome || master.email,
        volumeMaster: 0,
        comissaoMaster: 0,
        subs: [],
        splitRecebido: 0
      };
      
      const vData = porVendedor.find(v => v.vendedorEmail === master.email);
      if (vData) {
        masterData[master.id].volumeMaster = vData._sum.valorLiberado || 0;
        masterData[master.id].comissaoMaster = vData._sum.valorComissao || 0;
      }
    });

    usuarios.filter(u => u.masterId).forEach(sub => {
      if (!masterData[sub.masterId]) return;
      const vData = porVendedor.find(v => v.vendedorEmail === sub.email);
      const volumeSub = vData?._sum?.valorLiberado || 0;
      const comissaoSub = vData?._sum?.valorComissao || 0;
      const splitPct = sub.percentualSplitMaster || 0;
      const repasseParaMaster = (comissaoSub * splitPct) / 100;
      const subFicaCom = comissaoSub - repasseParaMaster;

      masterData[sub.masterId].subs.push({
        nome: sub.nome || sub.email,
        volume: volumeSub,
        comissaoTotal: comissaoSub,
        splitPct,
        repasseParaMaster,
        subFicaCom
      });

      masterData[sub.masterId].splitRecebido += repasseParaMaster;
    });
  }

  async function handleGerarLote(banco: string, propostas: { ids: string[]; valor: number }) {
    if (!confirm(`Gerar lote de faturamento para o banco ${banco} no valor de ${fmtFull(propostas.valor)}?`)) return;
    setIsGerandoLote(true);
    try {
      const res = await fetch("/api/financeiro/faturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bancoNome: banco, propostaIds: propostas.ids })
      });
      if (!res.ok) throw new Error();
      toast.success("Lote gerado com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao gerar lote");
    } finally {
      setIsGerandoLote(false);
    }
  }

  async function handleMarcarPago(faturaId: string) {
    if (!confirm("Marcar esta fatura como PAGA pelo banco?")) return;
    try {
      const res = await fetch(`/api/financeiro/faturas/${faturaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAGA" })
      });
      if (!res.ok) throw new Error();
      toast.success("Fatura atualizada para PAGA!");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao atualizar fatura");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Financeiro</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gestão Financeira</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">Visão consolidada de receitas e comissões</p>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab("visao_geral")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "visao_geral" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setTab("vendedores")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "vendedores" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Comissões
            </button>
            <button
              onClick={() => setTab("rede")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "rede" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Rede de Parceiros
            </button>
            <button
              onClick={() => setTab("lotes")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                tab === "lotes" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Lotes
            </button>
          </div>
        </header>

        {tab === "visao_geral" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiBox icon={<TrendingUp className="h-4 w-4" />} label="Volume Total Pago" value={fmtFull(totais.volume)} color="text-brand" />
              <KpiBox icon={<DollarSign className="h-4 w-4" />} label="Comissões Totais" value={fmtFull(totais.comissao)} color="text-emerald-600" />
              <KpiBox icon={<CheckCircle2 className="h-4 w-4" />} label="Propostas Pagas" value={String(totais.count)} color="text-brand" />
              <KpiBox icon={<BarChart3 className="h-4 w-4" />} label="Margem Média" value={`${taxaComissao}%`} color="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                  <h2 className="text-lg font-semibold mb-1">Evolução Mensal</h2>
                  <p className="text-xs text-zinc-500 mb-6">Volume pago nos últimos 6 meses</p>
                  <div className="flex items-end gap-3 h-48">
                    {meses.map((m) => {
                      const h = maxVolume > 0 ? Math.max((m.volume / maxVolume) * 100, 4) : 4;
                      return (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative" style={{ height: "100%" }}>
                            <div className="absolute bottom-0 w-full bg-brand rounded-t-lg transition-all duration-700" style={{ height: `${h}%` }} />
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
               </div>

               <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                  <h2 className="text-lg font-semibold mb-1">Top Bancos</h2>
                  <p className="text-xs text-zinc-500 mb-6">Produção por banco receptor</p>
                  <div className="space-y-4">
                    {porBanco.slice(0, 5).map((b) => (
                      <div key={b.bancoNome} className="flex items-center gap-3">
                         <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${( (b._sum.valorLiberado || 0) / maxBanco ) * 100}%` }} />
                         </div>
                         <div className="text-right w-32">
                            <p className="text-xs font-bold truncate">{b.bancoNome}</p>
                            <p className="text-[10px] text-zinc-500">{fmtFull(b._sum.valorLiberado || 0)}</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {tab === "vendedores" && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
               <h2 className="text-lg font-bold flex items-center gap-2">
                 <Users className="w-5 h-5 text-brand" />
                 Repasse de Comissões por Vendedor
               </h2>
               <p className="text-sm text-zinc-500">Cálculo baseado em propostas com status PAGA.</p>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                        <th className="px-6 py-3">Vendedor</th>
                        <th className="px-6 py-3 text-right">Qtd</th>
                        <th className="px-6 py-3 text-right">Volume Produzido</th>
                        <th className="px-6 py-3 text-right">Comissão Total</th>
                        <th className="px-6 py-3 text-right text-brand">Previsão Repasse (20%)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                     {porVendedor.map((v) => {
                        const totalCom = v._sum.valorComissao || 0;
                        const repasse = totalCom * 0.20; // Exemplo de 20% de repasse
                        return (
                           <tr key={v.vendedorEmail} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                              <td className="px-6 py-4">
                                 <div className="text-sm font-bold">{v.vendedorNome || "N/A"}</div>
                                 <div className="text-[10px] text-zinc-500">{v.vendedorEmail}</div>
                              </td>
                              <td className="px-6 py-4 text-right tabular-nums text-sm">{v._count}</td>
                              <td className="px-6 py-4 text-right tabular-nums text-sm font-medium">{fmtFull(v._sum.valorLiberado || 0)}</td>
                              <td className="px-6 py-4 text-right tabular-nums text-sm text-emerald-600">{fmtFull(totalCom)}</td>
                              <td className="px-6 py-4 text-right tabular-nums text-sm font-black text-brand bg-brand/10">
                                 {fmtFull(repasse)}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {tab === "rede" && (
          <div className="space-y-6">
            <div className="p-6 bg-brand/5 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 rounded-2xl flex items-start gap-4">
               <Building2 className="w-6 h-6 text-brand shrink-0 mt-0.5" />
               <div>
                  <h2 className="text-lg font-bold text-brand">Master / Sub-Corretores (Split)</h2>
                  <p className="text-sm text-brand/80 mt-1">
                     Acompanhe a produção da sua rede de parceiros. O sistema deduz a porcentagem da comissão do Sub e atribui automaticamente ao lucro do Master.
                  </p>
               </div>
            </div>

            {Object.values(masterData).map(m => (
               <div key={m.nome} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center">
                     <div>
                        <h3 className="font-black text-lg flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-400"/> {m.nome} (Master)</h3>
                        <p className="text-xs text-zinc-500">Produção Própria: {fmtFull(m.volumeMaster)} | Comissões Diretas: {fmtFull(m.comissaoMaster)}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Lucro da Rede (Split)</p>
                        <p className="text-2xl font-black text-emerald-500 tabular-nums">+{fmtFull(m.splitRecebido)}</p>
                     </div>
                  </div>
                  {m.subs.length > 0 ? (
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                              <th className="px-6 py-3">Sub-Corretor</th>
                              <th className="px-6 py-3 text-right">Volume</th>
                              <th className="px-6 py-3 text-right">Comissão Gerada</th>
                              <th className="px-6 py-3 text-right">Taxa Split</th>
                              <th className="px-6 py-3 text-right text-emerald-600">Sua Parte (Master)</th>
                              <th className="px-6 py-3 text-right text-brand">Líquido do Sub</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                           {m.subs.map(sub => (
                              <tr key={sub.nome} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                                 <td className="px-6 py-3 text-sm font-semibold">{sub.nome}</td>
                                 <td className="px-6 py-3 text-sm text-right tabular-nums">{fmtFull(sub.volume)}</td>
                                 <td className="px-6 py-3 text-sm text-right tabular-nums">{fmtFull(sub.comissaoTotal)}</td>
                                 <td className="px-6 py-3 text-xs font-bold text-right text-orange-500">{sub.splitPct}%</td>
                                 <td className="px-6 py-3 text-sm text-right tabular-nums font-bold text-emerald-600 bg-emerald-50/30">+{fmtFull(sub.repasseParaMaster)}</td>
                                 <td className="px-6 py-3 text-sm text-right tabular-nums font-bold text-brand">{fmtFull(sub.subFicaCom)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  ) : (
                     <div className="p-6 text-center text-zinc-500 text-sm">Este usuário não possui sub-corretores vinculados.</div>
                  )}
               </div>
            ))}
          </div>
        )}

        {tab === "lotes" && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                 <h2 className="text-xl font-bold">Lotes de Comissões</h2>
                 {faturas.map(f => (
                    <div key={f.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${f.status === 'PAGA' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                             <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">{f.codigoLote} • {f.bancoNome}</p>
                             <p className="text-[10px] text-zinc-500">{new Date(f.dataEmissao).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{fmtFull(f.valorTotal)}</p>
                          <span className={`text-[10px] font-bold ${f.status === 'PAGA' ? 'text-emerald-500' : 'text-amber-500'}`}>{f.status}</span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-fit">
                 <h3 className="font-bold mb-4">Gerar Novo Lote</h3>
                 {Object.entries(pendentesPorBanco).map(([banco, dados]) => (
                    <div key={banco} className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                       <p className="text-xs font-bold">{banco}</p>
                       <p className="text-lg font-black text-emerald-600">{fmtFull(dados.valor)}</p>
                       <button onClick={() => handleGerarLote(banco, dados)} className="w-full mt-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2 rounded-lg text-xs font-bold">
                          Faturar {dados.count} propostas
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">{label}</span></div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
