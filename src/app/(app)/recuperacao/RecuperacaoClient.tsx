"use client";

import { useState } from "react";
import { CalendarClock, PhoneCall, AlertTriangle, Building, Search, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type LeadInativo = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  bancoPreferido: string | null;
  valorLiberado: number | null;
  margemLivre: number | null;
  vendedorNome: string | null;
  updatedAt: Date;
  status: string;
  score: number;
};

export function RecuperacaoClient({ leads }: { leads: LeadInativo[] }) {
  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("TODOS");

  const fmt = (v: number | null) => v ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00";

  // Bancos únicos para o filtro
  const bancosDisponiveis = Array.from(new Set(leads.map(l => l.bancoPreferido || "Sem Banco"))).sort();

  const filtrados = leads.filter(l => {
    const nomeOk = l.nome.toLowerCase().includes(busca.toLowerCase());
    const bancoOk = filtroBanco === "TODOS" || (l.bancoPreferido || "Sem Banco") === filtroBanco;
    return nomeOk && bancoOk;
  });

  const diasInativo = (data: Date) => {
    const diff = new Date().getTime() - new Date(data).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  const volumePerdido = filtrados.reduce((acc, l) => acc + (l.valorLiberado || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-500 mb-1">
              <CalendarClock className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Motor de Recuperação</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Data de Corte (Virada)</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
              Estes leads estão parados há mais de 10 dias. O benefício deles pode estar virando a folha na Data de Corte. Ligue agora e resgate as margens antes da concorrência.
            </p>
          </div>
          
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-right shrink-0">
             <p className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400">Volume Adormecido</p>
             <p className="text-2xl font-black text-rose-500 tabular-nums">{fmt(volumePerdido)}</p>
          </div>
        </header>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border shadow-sm">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
             <input 
               type="text" 
               placeholder="Buscar cliente..." 
               value={busca}
               onChange={(e) => setBusca(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
             />
           </div>
           
           <select 
             value={filtroBanco}
             onChange={(e) => setFiltroBanco(e.target.value)}
             className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none font-medium"
           >
             <option value="TODOS">Todos os Bancos ({leads.length})</option>
             {bancosDisponiveis.map(b => (
                <option key={b} value={b}>{b} ({leads.filter(l => (l.bancoPreferido || "Sem Banco") === b).length})</option>
             ))}
           </select>
        </div>

        {/* Tabela de Recuperação */}
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center">
                <AlertTriangle className="w-10 h-10 text-zinc-300 mb-3" />
                <h3 className="font-bold text-lg text-zinc-600">Nenhum lead adormecido encontrado.</h3>
                <p className="text-sm text-zinc-500">Sua equipe está trabalhando rápido e não há gargalos na data de corte.</p>
             </div>
          ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] uppercase font-bold tracking-wider text-zinc-500 border-b">
                         <th className="px-6 py-4">Cliente</th>
                         <th className="px-6 py-4 text-center">Inatividade</th>
                         <th className="px-6 py-4">Banco Preferido</th>
                         <th className="px-6 py-4 text-right">Volume Perdido</th>
                         <th className="px-6 py-4 text-center">Vendedor Resp.</th>
                         <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filtrados.map(lead => {
                         const inativo = diasInativo(lead.updatedAt);
                         const isCritico = inativo > 30;

                         return (
                            <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition">
                               <td className="px-6 py-4">
                                  <p className="font-bold text-sm truncate max-w-[200px]">{lead.nome}</p>
                                  <p className="text-[10px] text-zinc-500">{lead.cpf || "CPF Indisponível"}</p>
                               </td>
                               
                               <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                     isCritico ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                     <Clock className="w-3 h-3"/> {inativo} dias
                                  </span>
                               </td>

                               <td className="px-6 py-4">
                                  <span className="flex items-center gap-2 text-sm font-semibold">
                                     <Building className="w-4 h-4 text-zinc-400"/>
                                     {lead.bancoPreferido || "Não informado"}
                                  </span>
                               </td>

                               <td className="px-6 py-4 text-right">
                                  <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(lead.valorLiberado)}</p>
                                  {lead.margemLivre && lead.margemLivre > 0 && (
                                     <p className="text-[10px] text-zinc-500 mt-0.5">Margem: {fmt(lead.margemLivre)}</p>
                                  )}
                               </td>

                               <td className="px-6 py-4 text-center">
                                  <p className="text-xs font-semibold">{lead.vendedorNome || "Sem Dono"}</p>
                                  <p className="text-[10px] text-zinc-400">{lead.status}</p>
                               </td>

                               <td className="px-6 py-4 text-right space-x-2">
                                  {lead.telefone && (
                                     <a 
                                        href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}?text=Olá ${lead.nome}, estou vendo aqui no sistema que houve uma virada na folha do INSS. Podemos simular?`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                                        title="Chamar no WhatsApp"
                                     >
                                        <PhoneCall className="w-4 h-4" />
                                     </a>
                                  )}
                                  <Link href={`/leads?open=${lead.id}`} className="inline-flex items-center justify-center p-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition text-xs font-bold">
                                     Abrir Lead
                                  </Link>
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
