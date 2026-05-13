"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Library, ShieldAlert, Sparkles, Command, Search, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { id: string; role: "user" | "assistant"; content: string };

export default function KnowledgeBasePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o **Kromuz Intelligence**. Minha base de dados está carregada com todos os manuais da BeviHelp. Como posso te ajudar com regras de crédito hoje?"
    }
  ]);
  const [myInput, setMyInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!myInput.trim() || isLoading) return;
    
    const currentInput = myInput;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: currentInput };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setMyInput("");
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/chat/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro na API: " + res.status);
      }
      
      const data = await res.json();
      const aiContent = data.text || "Não consegui gerar uma resposta.";
      const aiMsgId = "ai-" + Date.now();
      
      setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: aiContent }]);
    } catch (err: any) {
      alert("Erro de comunicação: " + err.message);
      setMyInput(currentInput);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500 rounded-xl blur-md opacity-20 animate-pulse" />
            <div className="relative p-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl border border-white/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Kromuz <span className="text-violet-400">Intelligence</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Base BeviHelp • 4.225 Manuais
            </p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth relative z-10"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div className={`shrink-0 p-2.5 rounded-xl border border-white/10 shadow-xl ${
                  message.role === "user" ? "bg-zinc-900 text-violet-400" : "bg-[#111113] text-emerald-400"
                }`}>
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className={`relative max-w-[85%] rounded-2xl px-5 py-3 border backdrop-blur-sm ${
                  message.role === "user"
                    ? "bg-violet-600/10 border-violet-500/20 text-white"
                    : "bg-white/[0.03] border-white/5 text-zinc-200"
                }`}>
                  <div 
                    className="prose prose-invert prose-sm max-w-none leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\n\n/g, '<div class="h-2"></div>')
                        .replace(/\n/g, '<br />')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                        .replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex items-center gap-3 text-zinc-500 text-xs ml-14">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Analisando regras...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area (Fixada no final do Flex) */}
      <div className="p-6 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent shrink-0 z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={onSubmit} className="relative group">
            <div className="absolute inset-0 bg-violet-600/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center bg-[#18181b] border border-white/10 rounded-2xl p-1.5 shadow-2xl focus-within:border-violet-500/50 transition-all">
              <input
                type="text"
                value={myInput}
                onChange={(e) => setMyInput(e.target.value)}
                placeholder="Perqunte qualquer regra de banco..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={isLoading || !myInput.trim()}
                className="bg-violet-600 text-white p-2.5 rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-all shadow-lg"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
          <p className="mt-3 text-[9px] text-center text-zinc-600 uppercase tracking-[0.3em] font-bold">
            Kromuz Intelligence v2 • RAG Engine Online
          </p>
        </div>
      </div>
    </div>
  );
}
