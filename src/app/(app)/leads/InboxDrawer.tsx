"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Instagram, Facebook, Bot, Send, CheckCircle2, X } from "lucide-react";

export function InboxDrawer({ isOpen, onClose, lead, sessao }: { isOpen: boolean, onClose: () => void, lead: any, sessao: any }) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && lead) {
      // Simulate fetching messages for this lead
      setLoading(true);
      setTimeout(() => {
        setMensagens([
          { id: 1, remetente: "IA", conteudo: `Olá ${lead.nome.split(' ')[0]}! Sou a assistente virtual. Como posso ajudar com seu consignado?`, createdAt: new Date(Date.now() - 3600000) },
          { id: 2, remetente: "LEAD", conteudo: "Gostaria de saber minha margem.", createdAt: new Date(Date.now() - 3500000) }
        ]);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[450px] bg-white dark:bg-zinc-950 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 border-l border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold">
              {lead.nome.substring(0,2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {lead.nome}
              </h3>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                Via WhatsApp <MessageSquare className="w-3 h-3 text-emerald-500" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-zinc-600 transition" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Assumir) */}
        <div className="px-6 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50 flex justify-between items-center">
          <span className="text-xs font-medium text-violet-700 dark:text-violet-400 flex items-center gap-1"><Bot className="w-3.5 h-3.5"/> IA Ativa</span>
          <button className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assumir Atendimento
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#efeae2] dark:bg-zinc-950">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-xs font-medium text-zinc-500 animate-pulse">Carregando conversa...</span>
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
        </div>

        {/* Input */}
        <div className="p-4 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 z-10 shrink-0">
          <input 
            type="text" 
            placeholder="Digite uma mensagem..." 
            className="flex-1 bg-white dark:bg-zinc-800 rounded-full px-5 py-3 text-sm focus:outline-none shadow-sm border border-transparent focus:border-violet-500"
          />
          <button className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-sm transition shrink-0">
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </>
  );
}
