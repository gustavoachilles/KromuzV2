"use client";

import { Megaphone, TrendingUp, TrendingDown, Target, Users, DollarSign, Activity } from "lucide-react";

type CampanhaMetrics = {
  id: string;
  nome: string;
  origem: string;
  custoTotal: number;
  dataInicio: Date;
  ativo: boolean;
  metricas: {
    totalLeads: number;
    clientesConvertidos: number;
    comissaoGerada: number;
    volumeGerado: number;
    cac: number;
    cpl: number;
    roi: number;
  }
};

export function MarketingClient({ campanhas }: { campanhas: CampanhaMetrics[] }) {
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const totalInvestido = campanhas.reduce((acc, c) => acc + c.custoTotal, 0);
  const totalComissao = campanhas.reduce((acc, c) => acc + c.metricas.comissaoGerada, 0);
  const roiGlobal = totalInvestido > 0 ? ((totalComissao - totalInvestido) / totalInvestido) * 100 : 0;
  const leadsGlobal = campanhas.reduce((acc, c) => acc + c.metricas.totalLeads, 0);
  const cplGlobal = leadsGlobal > 0 ? totalInvestido / leadsGlobal : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Megaphone className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Tráfego e Growth</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Marketing ROI</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Monitore o custo de aquisição e descubra quais campanhas trazem lucro real.
            </p>
          </div>
        </header>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBox 
             icon={<DollarSign className="w-4 h-4"/>} 
             label="Total Investido" 
             value={fmt(totalInvestido)} 
             color="text-rose-600" 
          />
          <KpiBox 
             icon={<TrendingUp className="w-4 h-4"/>} 
             label="Retorno em Comissões" 
             value={fmt(totalComissao)} 
             color="text-emerald-600" 
          />
          <KpiBox 
             icon={<Activity className="w-4 h-4"/>} 
             label="ROI Global" 
             value={`${roiGlobal.toFixed(1)}%`} 
             color={roiGlobal >= 0 ? "text-emerald-500" : "text-rose-500"} 
          />
          <KpiBox 
             icon={<Target className="w-4 h-4"/>} 
             label="Custo Médio por Lead (CPL)" 
             value={fmt(cplGlobal)} 
             color="text-brand" 
          />
        </div>

        {/* Campanhas Table */}
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm overflow-hidden">
           <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-lg font-bold">Desempenho de Campanhas</h2>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b">
                       <th className="px-6 py-4">Campanha</th>
                       <th className="px-6 py-4 text-right">Investimento</th>
                       <th className="px-6 py-4 text-center">Leads (CPL)</th>
                       <th className="px-6 py-4 text-center">Conversões (CAC)</th>
                       <th className="px-6 py-4 text-right">Comissão Gerada</th>
                       <th className="px-6 py-4 text-right">ROI</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {campanhas.length === 0 ? (
                       <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 text-sm">
                             Nenhuma campanha de marketing registrada.
                          </td>
                       </tr>
                    ) : (
                       campanhas.map(c => (
                          <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${c.ativo ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                   <p className="font-bold text-sm">{c.nome}</p>
                                </div>
                                <p className="text-[10px] text-zinc-500 ml-4 uppercase">{c.origem}</p>
                             </td>
                             <td className="px-6 py-4 text-right font-medium text-rose-600 tabular-nums">
                                {fmt(c.custoTotal)}
                             </td>
                             <td className="px-6 py-4 text-center">
                                <p className="text-sm font-bold">{c.metricas.totalLeads}</p>
                                <p className="text-[10px] text-zinc-400">CPL: {fmt(c.metricas.cpl)}</p>
                             </td>
                             <td className="px-6 py-4 text-center">
                                <p className="text-sm font-bold text-brand">{c.metricas.clientesConvertidos}</p>
                                <p className="text-[10px] text-zinc-400">CAC: {fmt(c.metricas.cac)}</p>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <p className="text-sm font-bold text-emerald-600">{fmt(c.metricas.comissaoGerada)}</p>
                                <p className="text-[10px] text-zinc-500">Vol: {fmt(c.metricas.volumeGerado)}</p>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums ${c.metricas.roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                   {c.metricas.roi >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                   {c.metricas.roi.toFixed(1)}%
                                </span>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}

function KpiBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">{label}</span></div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
