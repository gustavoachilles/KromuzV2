"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Bot, Send, CheckCircle2, X, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function InboxDrawer({ isOpen, onClose, lead, sessao }: { isOpen: boolean, onClose: () => void, lead: any, sessao: any }) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [canalInfo, setCanalInfo] = useState<any>(null);
  const [novoTexto, setNovoTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let channel: any;

    async function loadHistory() {
      if (!isOpen || !lead) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/conversas/${lead.id}/mensagens`);
        const data = await res.json();
        
        if (data.mensagens) setMensagens(data.mensagens);
        if (data.conversaId) setConversaId(data.conversaId);
        if (data.canal) setCanalInfo(data.canal);

        // Configurar Supabase Realtime
        if (data.conversaId) {
          const supabase = createSupabaseBrowserClient();
          channel = supabase
            .channel(`mensagens_${data.conversaId}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'Mensagem', filter: `conversaId=eq.${data.conversaId}` },
              (payload) => {
                setMensagens(prev => {
                  // Evitar duplicidade se fomos nós que enviamos (optimistic update ou API return)
                  if (prev.find(m => m.id === payload.new.id)) return prev;
                  return [...prev, payload.new];
                });
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [isOpen, lead]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoTexto.trim() || !conversaId || enviando) return;

    const texto = novoTexto;
    setNovoTexto("");
    setEnviando(true);

    // Optimistic UI
    const fakeId = Date.now().toString();
    setMensagens(prev => [...prev, { id: fakeId, remetente: "VENDEDOR", conteudo: texto, createdAt: new Date() }]);

    try {
      const res = await fetch('/api/mensagens/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversaId, conteudo: texto })
      });
      const data = await res.json();
      
      // Atualiza o fakeId com o ID real
      if (data.success) {
        setMensagens(prev => prev.map(m => m.id === fakeId ? data.mensagem : m));
      }
    } catch (err) {
      console.error("Erro ao enviar:", err);
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[450px] bg-white dark:bg-zinc-950 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 border-l border-zinc-200 dark:border-zinc-800">
        
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold">
              {lead.nome.substring(0,2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{lead.nome}</h3>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                Via {canalInfo?.nomeCanal || 'WhatsApp'} <MessageSquare className="w-3 h-3 text-emerald-500" />
              </p>
            </div>
          </div>
          <button className="p-2 text-zinc-400 hover:text-zinc-600 transition" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {canalInfo?.botAtivo && (
          <div className="px-6 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50 flex justify-between items-center shrink-0">
            <span className="text-xs font-medium text-violet-700 dark:text-violet-400 flex items-center gap-1"><Bot className="w-3.5 h-3.5"/> IA Ativa conversando</span>
            <button className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assumir Atendimento
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#efeae2] dark:bg-zinc-950">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
          ) : mensagens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm text-zinc-500">Nenhuma mensagem encontrada.<br/>O cliente ainda não enviou mensagem.</p>
            </div>
          ) : (
            mensagens.map((msg: any) => {
              const isMine = msg.remetente === "VENDEDOR" || msg.remetente === "IA";
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${isMine ? 'bg-[#d9fdd3] dark:bg-violet-900 text-zinc-900 dark:text-zinc-100 rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none'}`}>
                    {msg.remetente === "IA" && <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1"><Bot className="w-3 h-3"/> Resposta por IA</div>}
                    <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                    <div className={`text-[10px] text-right mt-1 ${isMine ? 'text-emerald-700/60 dark:text-violet-300/60' : 'text-zinc-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 shrink-0">
          <input 
            type="text" 
            disabled={!conversaId}
            value={novoTexto}
            onChange={e => setNovoTexto(e.target.value)}
            placeholder={conversaId ? "Digite uma mensagem..." : "Aguardando cliente iniciar conversa..."} 
            className="flex-1 bg-white dark:bg-zinc-800 rounded-full px-5 py-3 text-sm focus:outline-none shadow-sm border border-transparent focus:border-violet-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!conversaId || !novoTexto.trim() || enviando}
            className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-400 text-white flex items-center justify-center shadow-sm transition shrink-0"
          >
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
          </button>
        </form>
      </div>
    </>
  );
}
