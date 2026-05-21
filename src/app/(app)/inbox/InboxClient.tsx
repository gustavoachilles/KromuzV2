"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Camera, Send, Search, CheckCircle2, Loader2, Wand2, Phone,
  Bot, Plus, X, Tag, ArrowRightLeft, Clock, User, Hash, ChevronRight,
  Zap, Archive, Inbox as InboxIcon, Filter, MoreVertical, Copy
} from "lucide-react";
import { toast } from "sonner";

type MsgRapida = { id: string; titulo: string; conteudo: string; atalho?: string; categoria?: string };
type TagObj = { id: string; nome: string; cor: string };

const ABAS = [
  { key: "", label: "Todas", icon: InboxIcon },
  { key: "AGUARDANDO_IA", label: "Aguardando", icon: Bot },
  { key: "ABERTO", label: "Em Atendimento", icon: MessageSquare },
  { key: "FECHADO", label: "Finalizadas", icon: Archive },
];

const CANAL_ICONS: Record<string, { icon: any; color: string }> = {
  WHATSAPP: { icon: MessageSquare, color: "#25D366" },
  INSTAGRAM: { icon: Camera, color: "#E1306C" },
  FACEBOOK: { icon: MessageSquare, color: "#1877F2" },
};

function timeSince(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function InboxClient({ conversas: initConversas, sessao }: { conversas: any[]; sessao: any }) {
  const [conversas, setConversas] = useState(initConversas);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [novoTexto, setNovoTexto] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"WHATSAPP" | "INTERNA">("WHATSAPP");
  const [agendadoPara, setAgendadoPara] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [melhorandoTexto, setMelhorandoTexto] = useState(false);
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("");
  const [showPerfil, setShowPerfil] = useState(true);
  const [msgsRapidas, setMsgsRapidas] = useState<MsgRapida[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [tags, setTags] = useState<TagObj[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showFinalizarMenu, setShowFinalizarMenu] = useState(false);
  const [motivoFechamento, setMotivoFechamento] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversaAtiva = conversas.find(c => c.id === ativaId);

  // Load mensagens rápidas e tags
  useEffect(() => {
    fetch("/api/inbox/mensagens-rapidas").then(r => r.json()).then(setMsgsRapidas).catch(() => {});
    fetch("/api/inbox/tags").then(r => r.json()).then(setTags).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversaAtiva?.mensagens?.length]);

  // Polling
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/inbox/sync");
        if (res.ok) setConversas(await res.json());
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Filtro de conversas
  const filtradas = useMemo(() => {
    return conversas.filter(c => {
      if (abaAtiva && c.status !== abaAtiva) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return c.clienteNome.toLowerCase().includes(q) || c.clienteContato.includes(q) || (c.ultimaMensagem || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [conversas, abaAtiva, busca]);

  // Contadores por aba
  const contadores = useMemo(() => ({
    "": conversas.length,
    AGUARDANDO_IA: conversas.filter(c => c.status === "AGUARDANDO_IA").length,
    ABERTO: conversas.filter(c => c.status === "ABERTO").length,
    FECHADO: conversas.filter(c => c.status === "FECHADO").length,
  }), [conversas]);

  // Atalho "/" para mensagens rápidas
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNovoTexto(val);
    if (val.startsWith("/") && val.length > 1) {
      setShowQuickReplies(true);
      setQuickFilter(val.slice(1).toLowerCase());
    } else {
      setShowQuickReplies(false);
      setQuickFilter("");
    }
  };

  const selectQuickReply = (msg: MsgRapida) => {
    // Substituir variáveis
    let text = msg.conteudo;
    if (conversaAtiva) {
      text = text.replace(/{nome}/gi, conversaAtiva.clienteNome || "");
      text = text.replace(/{contato}/gi, conversaAtiva.clienteContato || "");
    }
    setNovoTexto(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const filteredQuickReplies = msgsRapidas.filter(m =>
    m.titulo.toLowerCase().includes(quickFilter) || (m.atalho || "").toLowerCase().includes(quickFilter)
  );

  // Melhorar texto IA
  async function handleMelhorarTexto() {
    if (!novoTexto.trim() || melhorandoTexto) return;
    setMelhorandoTexto(true);
    try {
      const res = await fetch("/api/ai/melhorar-texto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ textoOriginal: novoTexto }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNovoTexto(data.textoMelhorado);
      toast.success("Texto melhorado com IA!");
    } catch { toast.error("Falha ao melhorar texto."); }
    setMelhorandoTexto(false);
  }

  // Enviar mensagem
  async function handleEnviar(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!ativaId || !novoTexto.trim() || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/mensagens/enviar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: ativaId, conteudo: novoTexto, tipo: tipoMensagem, agendadoPara: agendadoPara || null }),
      });
      if (!res.ok) throw new Error();
      const { mensagem } = await res.json();
      setConversas(prev => prev.map(c => c.id === ativaId ? { ...c, mensagens: [...c.mensagens, mensagem], ultimaMensagem: tipoMensagem === "INTERNA" ? `[NOTA] ${novoTexto}` : novoTexto, updatedAt: new Date().toISOString() } : c));
      setNovoTexto(""); setAgendadoPara("");
      if (tipoMensagem === "INTERNA") setTipoMensagem("WHATSAPP");
    } catch { toast.error("Erro ao enviar."); }
    setEnviando(false);
  }

  // Ações
  const executarAcao = async (acao: string, dados?: any) => {
    if (!ativaId) return;
    try {
      const r = await fetch("/api/inbox/acoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: ativaId, acao, dados }),
      });
      if (r.ok) {
        const updated = await r.json();
        setConversas(prev => prev.map(c => c.id === ativaId ? { ...c, ...updated } : c));
        toast.success(acao === "FINALIZAR" ? "Conversa finalizada" : acao === "TRANSFERIR" ? "Conversa transferida" : acao === "ASSUMIR" ? "Atendimento assumido" : "Ação executada");
        setShowFinalizarMenu(false); setShowTransferMenu(false);
      }
    } catch { toast.error("Erro na ação."); }
  };

  const getIcon = (tipo: string) => {
    const c = CANAL_ICONS[tipo?.toUpperCase()] || CANAL_ICONS.WHATSAPP;
    return <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />;
  };

  return (
    <div className="h-screen py-4 pr-4">
      <div className="flex h-full bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">

        {/* ═══ SIDEBAR ═══ */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30">

          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
            <h2 className="font-bold text-lg mb-3 text-zinc-900 dark:text-white">Inbox Omnichannel</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" placeholder="Buscar por nome, telefone..." value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none" />
            </div>
          </div>

          {/* Abas */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1">
            {ABAS.map(aba => (
              <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wide flex flex-col items-center gap-0.5 border-b-2 transition-colors ${abaAtiva === aba.key ? "border-brand text-brand" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}>
                <aba.icon className="w-3.5 h-3.5" />
                {aba.label}
                {(contadores as any)[aba.key] > 0 && <span className="text-[9px] bg-zinc-200 dark:bg-zinc-700 rounded-full px-1.5">{(contadores as any)[aba.key]}</span>}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {filtradas.map(conv => (
              <button key={conv.id} onClick={() => setAtivaId(conv.id)}
                className={`w-full text-left p-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${ativaId === conv.id ? "bg-brand/10 dark:bg-brand/20 border-l-4 border-l-brand" : "border-l-4 border-l-transparent"}`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                      {conv.clienteNome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate block">{conv.clienteNome}</span>
                      <div className="flex items-center gap-1.5">
                        {getIcon(conv.canal?.tipo)}
                        <p className="text-[11px] text-zinc-500 truncate">{conv.ultimaMensagem || "Iniciar conversa..."}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] text-zinc-400">{timeSince(conv.updatedAt)}</span>
                    {conv.naoLidas > 0 && <span className="text-[9px] bg-brand text-white rounded-full px-1.5 py-0.5 font-bold">{conv.naoLidas}</span>}
                  </div>
                </div>
                {/* Tags */}
                {conv.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 ml-10">
                    {conv.tags.slice(0, 3).map((t: string) => {
                      const tagObj = tags.find(tg => tg.nome === t);
                      return <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (tagObj?.cor || "#6366f1") + "20", color: tagObj?.cor || "#6366f1" }}>{t}</span>;
                    })}
                    {conv.tags.length > 3 && <span className="text-[9px] text-zinc-400">+{conv.tags.length - 3}</span>}
                  </div>
                )}
              </button>
            ))}
            {filtradas.length === 0 && <div className="p-8 text-center text-zinc-400 text-sm">Nenhuma conversa encontrada.</div>}
          </div>
        </div>

        {/* ═══ CHAT ═══ */}
        <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-zinc-950 relative">
          {conversaAtiva ? (
            <>
              {/* Header do Chat */}
              <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-bold">
                    {conversaAtiva.clienteNome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                      {conversaAtiva.clienteNome}
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{conversaAtiva.clienteContato}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      {getIcon(conversaAtiva.canal?.tipo)} Via {conversaAtiva.canal?.nomeCanal}
                      {conversaAtiva.departamento && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[9px] rounded font-bold">{conversaAtiva.departamento}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tags */}
                  <div className="relative">
                    <button onClick={() => setShowTagMenu(!showTagMenu)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400" title="Tags">
                      <Tag className="w-4 h-4" />
                    </button>
                    {showTagMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 w-48 z-50">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase px-2 mb-1">Tags</p>
                        {tags.map(t => {
                          const has = conversaAtiva.tags?.includes(t.nome);
                          return (
                            <button key={t.id} onClick={() => { executarAcao(has ? "REMOVE_TAG" : "ADD_TAG", { tag: t.nome }); }}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${has ? "font-bold" : ""}`}>
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                              {t.nome}
                              {has && <CheckCircle2 className="w-3 h-3 text-brand ml-auto" />}
                            </button>
                          );
                        })}
                        {tags.length === 0 && <p className="text-[11px] text-zinc-400 px-2 py-1">Nenhuma tag criada</p>}
                      </div>
                    )}
                  </div>

                  {/* Transferir */}
                  <div className="relative">
                    <button onClick={() => setShowTransferMenu(!showTransferMenu)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400" title="Transferir">
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    {showTransferMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 w-48 z-50">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase px-2 mb-1">Departamento</p>
                        {["VENDAS", "SUPORTE", "FINANCEIRO"].map(d => (
                          <button key={d} onClick={() => executarAcao("TRANSFERIR", { departamento: d })}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800">{d}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Perfil toggle */}
                  <button onClick={() => setShowPerfil(!showPerfil)} className={`p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 ${showPerfil ? "text-brand" : "text-zinc-400"}`} title="Perfil">
                    <User className="w-4 h-4" />
                  </button>

                  {/* Ação principal */}
                  {conversaAtiva.status === "AGUARDANDO_IA" ? (
                    <button onClick={() => executarAcao("ASSUMIR")} className="bg-brand hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> Assumir
                    </button>
                  ) : conversaAtiva.status === "FECHADO" ? (
                    <button onClick={() => executarAcao("REABRIR")} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition">Reabrir</button>
                  ) : (
                    <div className="relative">
                      <button onClick={() => setShowFinalizarMenu(!showFinalizarMenu)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                      </button>
                      {showFinalizarMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 w-56 z-50">
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">Motivo (opcional)</p>
                          <input type="text" value={motivoFechamento} onChange={e => setMotivoFechamento(e.target.value)} placeholder="Ex: Venda concluída"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 outline-none mb-2" />
                          <button onClick={() => { executarAcao("FINALIZAR", { motivo: motivoFechamento }); setMotivoFechamento(""); }}
                            className="w-full bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold">Confirmar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 flex">
                <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                  {conversaAtiva.mensagens.map((msg: any) => {
                    const isMine = msg.remetente === "VENDEDOR" || msg.remetente === "IA" || msg.remetente === "SISTEMA";
                    const isNote = msg.tipo === "INTERNA";
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isNote ? "bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 italic rounded-tr-none" : isMine ? "bg-[#d9fdd3] dark:bg-violet-900 text-zinc-900 dark:text-zinc-100 rounded-tr-none" : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none"}`}>
                          {isNote && <div className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60">📌 Nota Interna</div>}
                          {msg.remetente === "IA" && <div className="text-[10px] font-bold text-brand mb-1 flex items-center gap-1"><Bot className="w-3 h-3" /> IA</div>}
                          {msg.remetente === "SISTEMA" && <div className="text-[10px] font-bold text-zinc-400 mb-1">⚙️ Sistema</div>}
                          <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                          <div className={`text-[10px] text-right mt-1 ${isMine ? "text-emerald-700/60 dark:text-violet-300/60" : "text-zinc-400"}`}>
                            {msg.agendadoPara && <Clock className="w-3 h-3 inline mr-1" />}
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {conversaAtiva.mensagens.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                      <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg">As mensagens aparecerão aqui.</div>
                    </div>
                  )}
                </div>

                {/* Perfil Lateral */}
                <AnimatePresence>
                  {showPerfil && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      className="border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex-shrink-0">
                      <div className="w-[280px] p-4 space-y-4 overflow-y-auto h-full">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand text-xl font-bold mx-auto mb-2">
                            {conversaAtiva.clienteNome.substring(0, 2).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-zinc-900 dark:text-white">{conversaAtiva.clienteNome}</h3>
                          <p className="text-xs text-zinc-500">{conversaAtiva.clienteContato}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Canal</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">{getIcon(conversaAtiva.canal?.tipo)} {conversaAtiva.canal?.nomeCanal}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Status</span>
                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${conversaAtiva.status === "ABERTO" ? "bg-emerald-100 text-emerald-700" : conversaAtiva.status === "FECHADO" ? "bg-zinc-100 text-zinc-500" : "bg-amber-100 text-amber-700"}`}>{conversaAtiva.status}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Criada</span>
                            <span className="text-zinc-600 dark:text-zinc-400">{new Date(conversaAtiva.createdAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                          {conversaAtiva.departamento && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Departamento</span>
                              <span className="font-bold text-blue-600">{conversaAtiva.departamento}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Mensagens</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{conversaAtiva.mensagens.length}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {(conversaAtiva.tags || []).map((t: string) => {
                              const tagObj = tags.find(tg => tg.nome === t);
                              return (
                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{ backgroundColor: (tagObj?.cor || "#6366f1") + "20", color: tagObj?.cor || "#6366f1" }}>
                                  {t}
                                  <button onClick={() => executarAcao("REMOVE_TAG", { tag: t })} className="hover:opacity-50"><X className="w-2.5 h-2.5" /></button>
                                </span>
                              );
                            })}
                            {(conversaAtiva.tags || []).length === 0 && <p className="text-[11px] text-zinc-400">Sem tags</p>}
                          </div>
                        </div>

                        {/* Lead info */}
                        {conversaAtiva.lead && (
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Dados do Lead</p>
                            <div className="space-y-1 text-xs">
                              {conversaAtiva.lead.email && <p className="text-zinc-600 dark:text-zinc-400">✉️ {conversaAtiva.lead.email}</p>}
                              {conversaAtiva.lead.telefone && <p className="text-zinc-600 dark:text-zinc-400">📱 {conversaAtiva.lead.telefone}</p>}
                              {conversaAtiva.lead.uf && <p className="text-zinc-600 dark:text-zinc-400">📍 {conversaAtiva.lead.uf}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Barra de tipo + agendamento */}
              {conversaAtiva.status !== "FECHADO" && (
                <>
                  <div className="px-4 py-1.5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                      <button type="button" onClick={() => setTipoMensagem("WHATSAPP")}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition ${tipoMensagem === "WHATSAPP" ? "bg-white dark:bg-zinc-700 shadow-sm text-brand" : "text-zinc-500"}`}>WhatsApp</button>
                      <button type="button" onClick={() => setTipoMensagem("INTERNA")}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition ${tipoMensagem === "INTERNA" ? "bg-amber-400 text-amber-950 shadow-sm" : "text-zinc-500"}`}>Nota</button>
                    </div>
                    {tipoMensagem === "WHATSAPP" && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <input type="datetime-local" value={agendadoPara} onChange={e => setAgendadoPara(e.target.value)}
                          className="bg-transparent border-none text-[11px] text-zinc-500 focus:ring-0 cursor-pointer" />
                      </div>
                    )}
                    <div className="ml-auto text-[10px] text-zinc-400 flex items-center gap-1"><Zap className="w-3 h-3" /> "/" para atalhos</div>
                  </div>

                  {/* Quick Replies Popup */}
                  <AnimatePresence>
                    {showQuickReplies && filteredQuickReplies.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="mx-4 mb-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {filteredQuickReplies.map(m => (
                          <button key={m.id} onClick={() => selectQuickReply(m)}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                            <Zap className="w-3.5 h-3.5 text-brand shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{m.titulo} {m.atalho && <span className="text-zinc-400 font-normal">({m.atalho})</span>}</p>
                              <p className="text-[11px] text-zinc-400 truncate">{m.conteudo.substring(0, 60)}...</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input */}
                  <form onSubmit={handleEnviar} className="p-3 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 z-10 flex-shrink-0">
                    <input ref={inputRef} type="text" value={novoTexto} onChange={handleInputChange}
                      placeholder={tipoMensagem === "INTERNA" ? "Nota interna privada..." : "Digite ou / para atalhos..."}
                      className={`flex-1 rounded-full px-5 py-2.5 text-sm focus:outline-none shadow-sm border border-transparent transition ${tipoMensagem === "INTERNA" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-zinc-800 focus:border-brand"}`} />
                    {tipoMensagem === "WHATSAPP" && novoTexto.trim().length > 0 && (
                      <button type="button" onClick={handleMelhorarTexto} disabled={melhorandoTexto} title="Melhorar com IA"
                        className="w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0 disabled:opacity-50 border border-indigo-200 dark:border-indigo-800">
                        {melhorandoTexto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      </button>
                    )}
                    <button type="submit" disabled={enviando || !novoTexto.trim()}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 disabled:opacity-50 ${tipoMensagem === "INTERNA" ? "bg-amber-500 text-amber-950" : "bg-brand text-white"}`}>
                      {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
              <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
              </div>
              <h2 className="text-xl font-light text-zinc-500 dark:text-zinc-400">Kromuz Omnichannel Inbox</h2>
              <p className="text-sm mt-2 max-w-sm text-center">Selecione uma conversa para começar. Use as abas para filtrar por status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
