"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Camera, ThumbsUp, Bot, Send, Search, CheckCircle2, Clock, Loader2, Plus, Wand2, Phone } from "lucide-react";
import { toast } from "sonner";

export function InboxClient({ conversas: initConversas, sessao }: { conversas: any[], sessao: any }) {
  const [conversas, setConversas] = useState(initConversas);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [novoTexto, setNovoTexto] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"WHATSAPP" | "INTERNA">("WHATSAPP");
  const [agendadoPara, setAgendadoPara] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [melhorandoTexto, setMelhorandoTexto] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const getIcon = (tipo: string) => {
    switch (tipo?.toUpperCase()) {
      case "WHATSAPP": return <MessageSquare className="w-3.5 h-3.5" />;
      case "INSTAGRAM": return <Camera className="w-3.5 h-3.5" />;
      default: return <Phone className="w-3.5 h-3.5" />;
    }
  };

  const conversaAtiva = conversas.find(c => c.id === ativaId);

  async function handleMelhorarTexto() {
    if (!novoTexto.trim() || melhorandoTexto) return;
    setMelhorandoTexto(true);
    try {
      const res = await fetch("/api/ai/melhorar-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textoOriginal: novoTexto })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNovoTexto(data.textoMelhorado);
      toast.success("Texto melhorado com IA!");
    } catch (error) {
      toast.error("Falha ao melhorar texto. Verifique a API.");
    } finally {
      setMelhorandoTexto(false);
    }
  }

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversaAtiva?.mensagens?.length]);

  // Polling para novas mensagens (a cada 5 segundos)
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/inbox/sync');
        if (res.ok) {
          const data = await res.json();
          setConversas(data);
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleEnviar(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!ativaId || !novoTexto.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch("/api/mensagens/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          conversaId: ativaId, 
          conteudo: novoTexto,
          tipo: tipoMensagem,
          agendadoPara: agendadoPara || null
        })
      });

      if (!res.ok) throw new Error("Erro ao enviar");
      
      const { mensagem } = await res.json();
      
      // Atualiza UI localmente
      setConversas(prev => prev.map(c => {
        if (c.id === ativaId) {
          return {
            ...c,
            mensagens: [...c.mensagens, mensagem],
            ultimaMensagem: tipoMensagem === "INTERNA" ? `[NOTA] ${novoTexto}` : novoTexto,
            updatedAt: new Date().toISOString()
          }
        }
        return c;
      }));
      
      setNovoTexto("");
      setAgendadoPara("");
      if (tipoMensagem === "INTERNA") setTipoMensagem("WHATSAPP");
    } catch (err) {
      toast.error("Erro ao processar mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="h-screen py-4 pr-4">
      <div className="flex h-full bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Sidebar - Lista de Conversas */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">Inbox Omnichannel</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar nas conversas..." 
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversas.map(conv => (
            <button 
              key={conv.id}
              onClick={() => setAtivaId(conv.id)}
              className={`w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${ativaId === conv.id ? 'bg-brand/10 dark:bg-brand/20 border-l-4 border-l-brand' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate pr-2">{conv.clienteNome}</span>
                <span className="text-[10px] text-zinc-400 whitespace-nowrap">{new Date(conv.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex items-center gap-2">
                {getIcon(conv.canal.tipo)}
                <p className="text-xs text-zinc-500 truncate flex-1">{conv.ultimaMensagem || "Iniciar conversa..."}</p>
                {conv.status === "AGUARDANDO_IA" && <Bot className="w-3.5 h-3.5 text-brand shrink-0" />}
              </div>
            </button>
          ))}
          {conversas.length === 0 && (
            <div className="p-8 text-center text-zinc-400 text-sm">
              Nenhuma conversa ativa no momento.
            </div>
          )}
        </div>
      </div>

      {/* Janela Principal - Chat */}
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-zinc-950 relative">
        {conversaAtiva ? (
          <>
            <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-bold">
                  {conversaAtiva.clienteNome.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {conversaAtiva.clienteNome}
                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {conversaAtiva.clienteContato}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    Via {conversaAtiva.canal.nomeCanal}
                  </p>
                </div>
              </div>

              {conversaAtiva.status === "AGUARDANDO_IA" ? (
                <button className="bg-brand hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Assumir Atendimento
                </button>
              ) : (
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Finalizar Atendimento
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
              {conversaAtiva.mensagens.map((msg: any) => {
                const isMine = msg.remetente === "VENDEDOR" || msg.remetente === "IA" || msg.remetente === "SISTEMA";
                const isNote = msg.tipo === "INTERNA";
                
                return (
                   <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                      isNote 
                        ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 italic rounded-tr-none' 
                        : isMine 
                          ? 'bg-[#d9fdd3] dark:bg-violet-900 text-zinc-900 dark:text-zinc-100 rounded-tr-none' 
                          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none'
                    }`}>
                      {isNote && <div className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 opacity-60">📌 Nota Interna</div>}
                      {msg.remetente === "IA" && <div className="text-[10px] font-bold text-brand mb-1 flex items-center gap-1"><Bot className="w-3 h-3"/> Resposta por IA</div>}
                      
                      <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                      
                      <div className={`text-[10px] text-right mt-1 flex items-center justify-end gap-1 ${isMine ? 'text-emerald-700/60 dark:text-violet-300/60' : 'text-zinc-400'}`}>
                        {msg.agendadoPara && <Clock className="w-3 h-3" />}
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                )
              })}
              {conversaAtiva.mensagens.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg text-center">
                    As mensagens aparecerão aqui.
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800">
               <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                  <button 
                    type="button"
                    onClick={() => setTipoMensagem("WHATSAPP")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition ${tipoMensagem === "WHATSAPP" ? 'bg-white dark:bg-zinc-700 shadow-sm text-brand' : 'text-zinc-500'}`}
                  >
                    WhatsApp
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTipoMensagem("INTERNA")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition ${tipoMensagem === "INTERNA" ? 'bg-amber-400 text-amber-950 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Nota Interna
                  </button>
               </div>

               {tipoMensagem === "WHATSAPP" && (
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Agendar:</span>
                    <input 
                      type="datetime-local" 
                      value={agendadoPara}
                      onChange={e => setAgendadoPara(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-medium text-zinc-600 focus:ring-0 cursor-pointer"
                    />
                 </div>
               )}
            </div>

            <form 
              onSubmit={handleEnviar}
              className="p-4 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 z-10"
            >
              <input 
                type="text" 
                value={novoTexto}
                onChange={e => setNovoTexto(e.target.value)}
                placeholder={tipoMensagem === "INTERNA" ? "Escreva uma nota interna privada..." : "Digite uma mensagem..."}
                className={`flex-1 rounded-full px-5 py-3 text-sm focus:outline-none shadow-sm border border-transparent transition ${
                  tipoMensagem === "INTERNA" 
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 focus:border-amber-400' 
                    : 'bg-white dark:bg-zinc-800 focus:border-brand'
                }`}
              />
              
              {tipoMensagem === "WHATSAPP" && novoTexto.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleMelhorarTexto}
                  disabled={melhorandoTexto}
                  title="Melhorar texto com IA"
                  className="w-12 h-12 rounded-full bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-600 flex items-center justify-center shadow-sm transition shrink-0 disabled:opacity-50 border border-indigo-200 dark:border-indigo-800"
                >
                  {melhorandoTexto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                </button>
              )}

              <button 
                type="submit"
                disabled={enviando || !novoTexto.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition shrink-0 disabled:opacity-50 ${
                  tipoMensagem === "INTERNA" ? 'bg-amber-500 hover:bg-amber-600 text-amber-950' : 'bg-brand hover:opacity-90 text-white'
                }`}
              >
                {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : tipoMensagem === "INTERNA" ? <Plus className="w-5 h-5" /> : <Send className="w-5 h-5 ml-1" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h2 className="text-xl font-light text-zinc-500 dark:text-zinc-400">Kromuz Omnichannel Inbox</h2>
            <p className="text-sm mt-2 max-w-sm text-center">
              Selecione uma conversa na lateral para começar a enviar mensagens via WhatsApp, Facebook ou Instagram.
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
