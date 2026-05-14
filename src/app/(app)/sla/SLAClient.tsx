"use client";

import { Timer, Zap, AlertTriangle, MessageCircleOff, Users } from "lucide-react";

type SLARanking = {
  vendedorNome: string;
  vendedorEmail: string;
  totalConversas: number;
  taxaResposta: number;
  tmrMinutos: number;
  vacuos: number;
};

export function SLAClient({ ranking }: { ranking: SLARanking[] }) {
  const getSLAStatus = (tmr: number, vacuos: number) => {
    if (vacuos > 5) return { label: "Crítico (Muitos Vácuos)", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-900" };
    if (tmr <= 5) return { label: "Excelente (< 5 min)", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-900" };
    if (tmr <= 15) return { label: "Bom (5 a 15 min)", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900" };
    return { label: "Lento (> 15 min)", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-900" };
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header */}
        <header className="flex items-center gap-4">
          <div className="p-4 bg-brand/10 dark:bg-brand/20 rounded-2xl text-brand">
             <Timer className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">SLA de Atendimento</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl font-medium">
              Monitoramento do Tempo Médio de Resposta (TMR) no WhatsApp. Quem responde mais rápido, fecha mais.
            </p>
          </div>
        </header>

        {/* Tabela SLA */}
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm overflow-hidden">
          {ranking.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center">
                <Users className="w-10 h-10 text-zinc-300 mb-3" />
                <h3 className="font-bold text-lg text-zinc-600">Nenhum dado de SLA disponível.</h3>
                <p className="text-sm text-zinc-500">Ainda não há conversas registradas nos últimos 30 dias para sua equipe.</p>
             </div>
          ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] uppercase font-bold tracking-wider text-zinc-500 border-b">
                         <th className="px-6 py-4">Ranking</th>
                         <th className="px-6 py-4">Vendedor</th>
                         <th className="px-6 py-4 text-center">Status SLA</th>
                         <th className="px-6 py-4 text-right">TMR (Tempo Médio)</th>
                         <th className="px-6 py-4 text-right">Taxa Resposta</th>
                         <th className="px-6 py-4 text-right text-rose-500">Leads no Vácuo</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {ranking.map((s, index) => {
                         const status = getSLAStatus(s.tmrMinutos, s.vacuos);

                         return (
                            <tr key={s.vendedorEmail} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition">
                               <td className="px-6 py-4 w-16 text-center">
                                  <span className={`font-black text-xl ${index === 0 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}`}>
                                     #{index + 1}
                                  </span>
                               </td>
                               <td className="px-6 py-4">
                                  <p className="font-bold text-sm">{s.vendedorNome}</p>
                                  <p className="text-[10px] text-zinc-500">{s.totalConversas} conversas no total</p>
                               </td>
                               
                               <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.color} ${status.border}`}>
                                     {status.color.includes('emerald') ? <Zap className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5" />}
                                     {status.label}
                                  </span>
                               </td>

                               <td className="px-6 py-4 text-right">
                                  <p className="text-lg font-black tabular-nums">
                                     {s.tmrMinutos} <span className="text-xs font-semibold text-zinc-400">min</span>
                                  </p>
                               </td>

                               <td className="px-6 py-4 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                     <p className="text-sm font-bold">{s.taxaResposta}%</p>
                                     <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand" style={{ width: `${s.taxaResposta}%` }} />
                                     </div>
                                  </div>
                               </td>

                               <td className="px-6 py-4 text-right">
                                  <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${s.vacuos > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                                     {s.vacuos} <MessageCircleOff className="w-4 h-4" />
                                  </span>
                               </td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
