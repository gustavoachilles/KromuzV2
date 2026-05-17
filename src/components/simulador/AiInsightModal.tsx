"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Bot, ShieldCheck, Info, RefreshCw } from "lucide-react";

interface AiInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    bancoNome: string;
    produtoNome: string;
    clienteEspecie?: string;
    clienteIdade?: number;
    valorParcela?: number;
    prazo?: number;
  };
}

export function AiInsightModal({ isOpen, onClose, context }: AiInsightModalProps) {
  const [insight, setInsight] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateInsight();
    }
  }, [isOpen]);

  async function generateInsight() {
    setIsLoading(true);
    setInsight("");
    try {
      const res = await fetch("/api/chat/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analise esta oportunidade de crédito e me dê insights baseados nos manuais: 
              Banco: ${context.bancoNome}
              Produto: ${context.produtoNome}
              Espécie do Cliente: ${context.clienteEspecie || 'Não informada'}
              Idade do Cliente: ${context.clienteIdade || 'Não informada'}
              Parcela: R$ ${context.valorParcela?.toFixed(2)}
              Prazo: ${context.prazo} meses
              
              Foque em: Regras de aceitação para esta espécie, limites de idade para este prazo e possíveis alertas do manual deste banco.`
            }
          ]
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      
      if (data.text) {
        setInsight(data.text);
      } else if (data.error) {
        setInsight(`⚠️ Erro: ${data.error}`);
      } else {
        setInsight("Resposta inesperada da API.");
      }
    } catch (err: any) {
      setInsight(`⚠️ ${err.message || "Não consegui analisar esta regra. Consulte o manual BeviHelp manualmente."}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-[#111113] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header com Gradiente */}
            <div className="px-8 py-6 bg-gradient-to-r from-violet-600/20 to-emerald-600/10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-600 rounded-xl shadow-lg shadow-violet-600/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Insight da Inteligência</h3>
                  <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">{context.bancoNome} • {context.produtoNome}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="px-8 py-10 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {isLoading && !insight && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <RefreshCw className="h-10 w-10 text-violet-500 animate-spin" />
                  <p className="text-zinc-400 animate-pulse text-sm">Consultando manuais técnicos...</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Info Pills */}
                <div className="flex flex-wrap gap-2">
                  {context.clienteEspecie && (
                    <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                      Espécie {context.clienteEspecie}
                    </div>
                  )}
                  {context.clienteIdade && context.clienteIdade > 0 && (
                    <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                      {context.clienteIdade} Anos
                    </div>
                  )}
                  <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-bold text-violet-400 uppercase tracking-tighter">
                    RAG Verificado
                  </div>
                </div>

                {/* AI Content */}
                <div 
                  className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ 
                    __html: insight
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-violet-400 font-bold">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="text-zinc-500">$1</em>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Dados Protegidos
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                Base: BeviHelp v2.4
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
