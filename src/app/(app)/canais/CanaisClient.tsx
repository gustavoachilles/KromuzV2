"use client";

import React, { useState } from "react";
import { MessageSquare, Camera, ThumbsUp, Plus, Bot, Power, Save, X, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Canal = {
  id: string;
  tipo: string;
  nomeCanal: string;
  identificador: string | null;
  botAtivo: boolean;
  promptBase: string | null;
  ativo: boolean;
};

export function CanaisClient({ canais: initCanais, sessao }: { canais: Canal[], sessao: any }) {
  const [canais, setCanais] = useState(initCanais);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    nomeCanal: "WhatsApp Principal",
    apiUrl: "",
    apiKey: ""
  });
  const router = useRouter();
  
  const isAdmin = sessao.perfilSlug === "admin";

  const getIcon = (tipo: string) => {
    switch (tipo?.toUpperCase()) {
      case "WHATSAPP": return <MessageSquare className="w-5 h-5" />;
      case "INSTAGRAM": return <Instagram className="w-5 h-5" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  async function handleGerarQR() {
    if (!form.apiUrl || !form.apiKey) {
      alert("Preencha a URL e a API Key da sua Evolution API.");
      return;
    }

    setLoading(true);
    setQrCode(null);
    try {
      const res = await fetch("/api/canais/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.qrcode) {
        setQrCode(data.qrcode);
      } else {
        alert("Instância conectada ou QR Code não gerado. Verifique seu servidor.");
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Canais de Atendimento
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Conecte suas redes e configure a Inteligência Artificial para autoatendimento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/canais/disparos')} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg font-medium transition">
            <Send className="w-4 h-4 text-violet-500" /> Campanhas / Disparos
          </button>
          {isAdmin && (
            <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition">
              <Plus className="w-4 h-4" /> Novo Canal
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {canais.map(canal => (
          <div key={canal.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                  {getIcon(canal.tipo)}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{canal.nomeCanal}</h3>
                  <p className="text-xs text-zinc-500">{canal.identificador || "Não configurado"}</p>
                </div>
              </div>
              <button className={`p-2 rounded-full ${canal.ativo ? 'text-emerald-500 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'}`}>
                <Power className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 mt-2">
              <div className="flex items-center gap-2 text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                <Bot className="w-4 h-4 text-violet-500" /> Automação (IA)
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs text-zinc-500 border border-zinc-100 dark:border-zinc-800">
                {canal.botAtivo ? (
                  <p className="line-clamp-3 italic text-zinc-600 dark:text-zinc-400">"{canal.promptBase}"</p>
                ) : (
                  <p>Bot desativado para este canal.</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              <button className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm py-2 rounded-lg transition">
                Configurar API
              </button>
            </div>
          </div>
        ))}
        {canais.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            Nenhum canal conectado. Clique em Novo Canal para começar.
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" /> Conectar WhatsApp
              </h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl text-sm text-violet-800 dark:text-violet-300">
                Para conectar, digite os dados do seu servidor <b>Evolution API</b>.
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Canal</label>
                <input type="text" value={form.nomeCanal} onChange={e => setForm({...form, nomeCanal: e.target.value})} placeholder="Ex: WhatsApp Suporte" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">URL da Evolution API</label>
                <input type="text" value={form.apiUrl} onChange={e => setForm({...form, apiUrl: e.target.value})} placeholder="https://evolution.seuservidor.com" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Global API Key</label>
                <input type="password" value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} placeholder="Sua chave secreta" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              {qrCode && (
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-2 border-emerald-500/20 mt-4">
                  <p className="text-sm font-bold text-emerald-600 mb-4 animate-pulse">QR CODE GERADO! ESCANEIE AGORA:</p>
                  <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-64 h-64 shadow-xl rounded-lg border-4 border-white" />
                  <p className="text-xs text-zinc-500 mt-4 text-center">Após escanear, aguarde alguns segundos e atualize a página.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => { setModal(false); setQrCode(null); }} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition">Fechar</button>
              {!qrCode && (
                <button 
                  onClick={handleGerarQR}
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/30 transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Conectando..." : "Gerar QR Code"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
