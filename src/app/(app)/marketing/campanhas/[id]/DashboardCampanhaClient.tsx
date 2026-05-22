"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Pause, Play, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DashboardCampanhaClient({ id }: { id: string }) {
  const router = useRouter();
  const [campanha, setCampanha] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampanha = async () => {
    try {
      const res = await fetch(`/api/marketing/campanhas/${id}`);
      if (res.ok) setCampanha(await res.json());
      else {
        toast.error("Campanha não encontrada");
        router.push("/marketing/campanhas");
      }
    } catch {
      toast.error("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampanha();
    const interval = setInterval(fetchCampanha, 5000); // Polling 5s para tempo real
    return () => clearInterval(interval);
  }, [id]);

  const alterarStatus = async (novoStatus: string) => {
    try {
      await fetch(`/api/marketing/campanhas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
      });
      fetchCampanha();
      toast.success(novoStatus === "PAUSADA" ? "Campanha Pausada" : "Campanha Retomada");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const excluir = async () => {
    if (!confirm("Excluir esta campanha? (Isso não apaga as mensagens já enviadas)")) return;
    try {
      await fetch(`/api/marketing/campanhas/${id}`, { method: "DELETE" });
      toast.success("Excluída");
      router.push("/marketing/campanhas");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;
  if (!campanha) return null;

  const st = campanha.estatisticas;
  const isRodando = campanha.status === "RODANDO";
  const isConcluida = campanha.status === "CONCLUIDA";

  return (
    <div className="max-w-6xl mx-auto p-8">
      <Link href="/marketing/campanhas" className="inline-flex items-center gap-2 text-zinc-500 hover:text-brand font-bold text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">{campanha.nome}</h1>
          <div className="flex gap-4 text-sm text-zinc-500">
            <span>Criada em: {new Date(campanha.createdAt).toLocaleString("pt-BR")}</span>
            <span className="flex items-center gap-1 font-bold">
              Status: 
              <span className={
                campanha.status === "RODANDO" ? "text-amber-500" :
                campanha.status === "CONCLUIDA" ? "text-emerald-500" :
                "text-zinc-500"
              }>{campanha.status}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {!isConcluida && (
            <button 
              onClick={() => alterarStatus(isRodando ? "PAUSADA" : "RODANDO")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                isRodando 
                  ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" 
                  : "bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/20"
              }`}
            >
              {isRodando ? <><Pause className="w-4 h-4 fill-current" /> Pausar Envio</> : <><Play className="w-4 h-4 fill-current" /> Retomar Envio</>}
            </button>
          )}
          <button onClick={excluir} className="px-3 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
          <div className="text-zinc-500 font-bold text-xs uppercase mb-2 tracking-wider">Total Alvo</div>
          <div className="text-4xl font-black text-zinc-900 dark:text-white">{st.total}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
          <div className="text-emerald-500 font-bold text-xs uppercase mb-2 tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Enviados</div>
          <div className="text-4xl font-black text-emerald-500">{st.enviados}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
          <div className="text-amber-500 font-bold text-xs uppercase mb-2 tracking-wider flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Fila / Pendentes</div>
          <div className="text-4xl font-black text-amber-500">{st.pendentes}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center">
          <div className="text-red-500 font-bold text-xs uppercase mb-2 tracking-wider flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Falhas / Sem Whats</div>
          <div className="text-4xl font-black text-red-500">{st.falhas}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm mb-8">
        <div className="flex justify-between text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-2">
          <span>Progresso da Campanha</span>
          <span>{st.progresso}%</span>
        </div>
        <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand transition-all duration-1000 ease-out" style={{ width: `${st.progresso}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Mensagem</h3>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap relative shadow-sm">
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
              {campanha.conteudoMensagem}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-white">Relatório de Envios (Últimos Atualizados)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-xs text-zinc-500 uppercase font-bold border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Lead</th>
                    <th className="px-6 py-4">Telefone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {campanha.leads.slice(0, 50).map((l: any) => (
                    <tr key={l.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{l.lead.nome}</td>
                      <td className="px-6 py-4 text-zinc-500">{l.lead.telefone}</td>
                      <td className="px-6 py-4">
                        {l.statusEnvio === "PENDENTE" && <span className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-lg text-[10px] font-bold">Fila</span>}
                        {l.statusEnvio === "ENVIADO" && <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Enviado</span>}
                        {l.statusEnvio === "FALHOU" && <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit" title={l.erroLog}><AlertCircle className="w-3 h-3" /> Erro</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-400 text-xs">
                        {new Date(l.updatedAt).toLocaleTimeString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {campanha.leads.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
