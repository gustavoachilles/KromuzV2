"use client";

import { useState } from "react";
import { ArrowLeft, Rocket, Users, MessageSquareText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function NovaCampanhaClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [passo, setPasso] = useState(1);
  
  const [nome, setNome] = useState("");
  const [statusLead, setStatusLead] = useState("");
  const [origemLead, setOrigemLead] = useState("");
  
  const [mensagem, setMensagem] = useState("Olá {nome}, tudo bem? Temos uma novidade para você.");

  const avancar = () => {
    if (passo === 1) {
      if (!nome) return toast.error("Dê um nome para a campanha");
      setPasso(2);
    } else if (passo === 2) {
      if (!mensagem) return toast.error("A mensagem não pode ser vazia");
      dispararCampanha();
    }
  };

  const dispararCampanha = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          conteudoMensagem: mensagem,
          filtros: {
            status: statusLead || undefined,
            origem: origemLead || undefined,
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Campanha iniciada! Alvo: ${data.totalAlvo} leads.`);
        router.push(`/marketing/campanhas/${data.id}`);
      } else {
        toast.error(data.error || "Erro ao criar campanha");
      }
    } catch {
      toast.error("Erro na comunicação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Link href="/marketing/campanhas" className="inline-flex items-center gap-2 text-zinc-500 hover:text-brand font-bold text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Criar Nova Campanha</h1>
            <p className="text-sm text-zinc-500 mt-1">Siga os passos para filtrar seu público e disparar mensagens.</p>
          </div>
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${passo >= 1 ? "bg-brand" : "bg-zinc-200"}`}></div>
            <div className={`w-3 h-3 rounded-full ${passo >= 2 ? "bg-brand" : "bg-zinc-200"}`}></div>
          </div>
        </div>

        {passo === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-brand font-bold text-lg mb-4">
              <Users className="w-5 h-5" /> 1. Público Alvo
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 block mb-2 uppercase tracking-wider">Nome da Campanha (Interno)</label>
              <input 
                type="text" 
                value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Black Friday Aposentados" 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-brand/50 outline-none transition-all"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-2 uppercase tracking-wider">Filtrar por Status no Funil</label>
                <select 
                  value={statusLead} onChange={e => setStatusLead(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none"
                >
                  <option value="">Todos os status</option>
                  <option value="NOVO">Apenas Novos (Sem contato)</option>
                  <option value="EM_NEGOCIACAO">Em Negociação</option>
                  <option value="PERDIDO">Perdidos (Recuperação)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-2 uppercase tracking-wider">Filtrar por Origem</label>
                <select 
                  value={origemLead} onChange={e => setOrigemLead(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none"
                >
                  <option value="">Todas as origens</option>
                  <option value="WHATSAPP_BOT">Bot do WhatsApp</option>
                  <option value="FACEBOOK">Facebook Ads</option>
                  <option value="GOOGLE">Google Ads</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-600 dark:text-blue-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="text-sm">O sistema filtrará automaticamente <b>apenas Leads que possuam um telefone cadastrado válido</b>.</div>
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-brand font-bold text-lg mb-4">
              <MessageSquareText className="w-5 h-5" /> 2. Mensagem a Enviar
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Texto da Mensagem</label>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-mono">Use {'{nome}'} para o nome do lead</span>
              </div>
              <textarea 
                value={mensagem} onChange={e => setMensagem(e.target.value)}
                rows={6}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-brand/50 outline-none transition-all resize-none"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-600 dark:text-amber-500">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <b>Atenção com Banimentos:</b> O envio iniciará imediatamente após confirmar. O sistema enviará em lotes pingados para proteger seu número.
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
          {passo > 1 && (
            <button onClick={() => setPasso(passo - 1)} className="px-6 py-3 rounded-xl font-bold text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors">
              Voltar
            </button>
          )}
          <button 
            onClick={avancar} 
            disabled={loading}
            className="bg-brand text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20 disabled:opacity-50"
          >
            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : passo === 1 ? "Próximo Passo" : <><Rocket className="w-4 h-4" /> Confirmar e Iniciar Disparo</>}
          </button>
        </div>
      </div>
    </div>
  );
}
