"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Search, BarChart3, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CampanhaEstatistica = {
  id: string;
  nome: string;
  status: string;
  dataAgendamento: string;
  createdAt: string;
  totalLeads: number;
  enviados: number;
  falhas: number;
  progresso: number;
};

export function CampanhasClient() {
  const [campanhas, setCampanhas] = useState<CampanhaEstatistica[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCampanhas = async () => {
    try {
      const res = await fetch("/api/marketing/campanhas");
      if (res.ok) setCampanhas(await res.json());
    } catch {
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampanhas();
    const interval = setInterval(fetchCampanhas, 10000); // Polling 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RODANDO": return <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-[10px] font-bold">RODANDO</span>;
      case "PAUSADA": return <span className="bg-zinc-500/10 text-zinc-500 px-2 py-1 rounded-lg text-[10px] font-bold">PAUSADA</span>;
      case "CONCLUIDA": return <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[10px] font-bold">CONCLUÍDA</span>;
      default: return <span className="bg-zinc-100 text-zinc-500 px-2 py-1 rounded-lg text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand" />
            Campanhas de Disparo (Broadcast)
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Dispare mensagens em massa com segurança e cadência automática.</p>
        </div>
        <Link href="/marketing/campanhas/nova" className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20">
          <Plus className="w-4 h-4" /> Criar Campanha
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>
      ) : campanhas.length === 0 ? (
        <div className="text-center bg-white dark:bg-zinc-900 rounded-3xl p-16 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="bg-brand/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand">
            <Megaphone className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Nenhuma campanha criada</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">Envie promoções, lembretes e mensagens ativas em massa sem risco de bloqueio.</p>
          <Link href="/marketing/campanhas/nova" className="bg-brand text-white px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-brand/90 transition-colors">
            <Plus className="w-5 h-5" /> Iniciar Primeira Campanha
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campanhas.map(camp => (
            <Link key={camp.id} href={`/marketing/campanhas/${camp.id}`} className="block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-brand/50 transition-colors group">
              <div className="flex items-center justify-between">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-brand transition-colors">{camp.nome}</h3>
                    {getStatusBadge(camp.status)}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-zinc-500">
                    <span>Criada em {new Date(camp.createdAt).toLocaleDateString("pt-BR")}</span>
                    <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> {camp.totalLeads} destinatários alvo</span>
                  </div>
                </div>

                <div className="w-64">
                  <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    <span>Progresso</span>
                    <span>{camp.progresso}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all duration-500" style={{ width: `${camp.progresso}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                    <span className="text-emerald-500">{camp.enviados} enviados</span>
                    {camp.falhas > 0 && <span className="text-red-500">{camp.falhas} falhas</span>}
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
