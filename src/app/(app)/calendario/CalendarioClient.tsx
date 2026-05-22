"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Check, Phone,
  Mail, Users, ClipboardList, RefreshCcw, Trash2, Edit3, Clock,
  AlertTriangle, CheckCircle2, Loader2, Flag
} from "lucide-react";
import { toast } from "sonner";

type Atividade = {
  id: string; titulo: string; descricao?: string; tipo: string;
  dataInicio: string; dataFim?: string; diaInteiro: boolean;
  status: string; prioridade: string; cor: string;
  leadId?: string; leadNome?: string;
  responsavelId?: string; responsavelNome?: string;
  lembrete?: number; concluidaEm?: string;
};

type Metricas = { total: number; pendentes: number; concluidas: number; atrasadas: number };

const TIPOS = [
  { key: "TAREFA", label: "Tarefa", icon: ClipboardList, color: "#6366f1" },
  { key: "LIGACAO", label: "Ligação", icon: Phone, color: "#10b981" },
  { key: "REUNIAO", label: "Reunião", icon: Users, color: "#f59e0b" },
  { key: "EMAIL", label: "E-mail", icon: Mail, color: "#3b82f6" },
  { key: "FOLLOW_UP", label: "Follow-up", icon: RefreshCcw, color: "#ef4444" },
];

const PRIORIDADES = [
  { key: "BAIXA", label: "Baixa", color: "#94a3b8" },
  { key: "MEDIA", label: "Média", color: "#6366f1" },
  { key: "ALTA", label: "Alta", color: "#f59e0b" },
  { key: "URGENTE", label: "Urgente", color: "#ef4444" },
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function CalendarioClient() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [metricas, setMetricas] = useState<Metricas>({ total: 0, pendentes: 0, concluidas: 0, atrasadas: 0 });
  const [mesAtual, setMesAtual] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Atividade | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    titulo: "", descricao: "", tipo: "TAREFA", dataInicio: "", dataFim: "",
    diaInteiro: false, prioridade: "MEDIA", cor: "#6366f1", leadNome: "", lembrete: "",
  });

  const mesKey = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`;

  const fetchAtividades = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/atividades?mes=${mesKey}`);
      if (r.ok) {
        const data = await r.json();
        setAtividades(data.atividades);
        setMetricas(data.metricas);
      }
    } catch { toast.error("Erro ao carregar atividades"); }
    setLoading(false);
  };

  useEffect(() => { fetchAtividades(); }, [mesKey]);

  const salvar = async () => {
    if (!form.titulo || !form.dataInicio) { toast.error("Título e data são obrigatórios"); return; }
    try {
      const method = editando ? "PUT" : "POST";
      const body = editando ? { id: editando.id, ...form } : form;
      const r = await fetch("/api/atividades", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        toast.success(editando ? "Atualizado!" : "Criado!");
        setShowModal(false);
        setEditando(null);
        resetForm();
        fetchAtividades();
      } else { toast.error("Erro ao salvar"); }
    } catch { toast.error("Erro ao salvar"); }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir atividade?")) return;
    try {
      const r = await fetch(`/api/atividades?id=${id}`, { method: "DELETE" });
      if (r.ok) { toast.success("Excluída!"); fetchAtividades(); }
    } catch { toast.error("Erro"); }
  };

  const toggleConcluir = async (atv: Atividade) => {
    const novoStatus = atv.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";
    try {
      const r = await fetch("/api/atividades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: atv.id, status: novoStatus }) });
      if (r.ok) { toast.success(novoStatus === "CONCLUIDA" ? "Concluída! ✅" : "Reaberta"); fetchAtividades(); }
    } catch { toast.error("Erro"); }
  };

  const abrirEditar = (atv: Atividade) => {
    setEditando(atv);
    setForm({
      titulo: atv.titulo, descricao: atv.descricao || "", tipo: atv.tipo,
      dataInicio: atv.dataInicio.substring(0, 16), dataFim: atv.dataFim?.substring(0, 16) || "",
      diaInteiro: atv.diaInteiro, prioridade: atv.prioridade, cor: atv.cor,
      leadNome: atv.leadNome || "", lembrete: atv.lembrete?.toString() || "",
    });
    setShowModal(true);
  };

  const abrirNovo = (dia?: string) => {
    setEditando(null);
    resetForm();
    if (dia) setForm(f => ({ ...f, dataInicio: `${dia}T09:00` }));
    setShowModal(true);
  };

  const resetForm = () => setForm({ titulo: "", descricao: "", tipo: "TAREFA", dataInicio: "", dataFim: "", diaInteiro: false, prioridade: "MEDIA", cor: "#6366f1", leadNome: "", lembrete: "" });

  // Gerar dias do calendário
  const diasCalendario = useMemo(() => {
    const y = mesAtual.getFullYear(), m = mesAtual.getMonth();
    const primeiro = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    const inicioSemana = primeiro.getDay();
    const dias: { date: Date; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior
    for (let i = inicioSemana - 1; i >= 0; i--) {
      dias.push({ date: new Date(y, m, -i), isCurrentMonth: false });
    }
    // Dias do mês atual
    for (let d = 1; d <= ultimo.getDate(); d++) {
      dias.push({ date: new Date(y, m, d), isCurrentMonth: true });
    }
    // Completar última semana
    const remaining = 7 - (dias.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        dias.push({ date: new Date(y, m + 1, d), isCurrentMonth: false });
      }
    }
    return dias;
  }, [mesAtual]);

  const hoje = new Date().toISOString().split("T")[0];

  const getAtividadesDia = (date: Date) => {
    const dStr = date.toISOString().split("T")[0];
    return atividades.filter(a => a.dataInicio.startsWith(dStr));
  };

  const atividadesDiaSelecionado = diaSelecionado
    ? atividades.filter(a => a.dataInicio.startsWith(diaSelecionado))
    : [];

  const tipoInfo = (tipo: string) => TIPOS.find(t => t.key === tipo) || TIPOS[0];
  const prioridadeInfo = (p: string) => PRIORIDADES.find(pr => pr.key === p) || PRIORIDADES[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-brand uppercase tracking-wider">Calendário</p>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Atividades</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie tarefas, ligações e follow-ups</p>
          </div>
          <button onClick={() => abrirNovo()} className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-brand/25">
            <Plus className="w-4 h-4" /> Nova Atividade
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: metricas.total, icon: CalendarDays, color: "text-brand", bg: "bg-brand/10" },
            { label: "Pendentes", value: metricas.pendentes, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Concluídas", value: metricas.concluidas, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Atrasadas", value: metricas.atrasadas, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
          ].map(k => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
                <div>
                  <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{k.value}</p>
                  <p className="text-xs text-zinc-500">{k.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Calendário */}
          <div className="flex-1">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              {/* Nav Mês */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1))} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ChevronLeft className="w-5 h-5 text-zinc-500" />
                </button>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                </h2>
                <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1))} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-bold text-zinc-400 uppercase">{d}</div>
                ))}
              </div>

              {/* Grid dias */}
              {loading ? (
                <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
              ) : (
                <div className="grid grid-cols-7">
                  {diasCalendario.map((dia, i) => {
                    const dStr = dia.date.toISOString().split("T")[0];
                    const atvs = getAtividadesDia(dia.date);
                    const isHoje = dStr === hoje;
                    const isSelecionado = dStr === diaSelecionado;

                    return (
                      <button key={i} onClick={() => setDiaSelecionado(dStr)}
                        className={`min-h-[90px] p-1.5 border-b border-r border-zinc-100 dark:border-zinc-800 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/30
                          ${!dia.isCurrentMonth ? "opacity-30" : ""}
                          ${isSelecionado ? "bg-brand/5 ring-2 ring-brand/30 ring-inset" : ""}
                        `}>
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                          ${isHoje ? "bg-brand text-white" : "text-zinc-700 dark:text-zinc-300"}
                        `}>{dia.date.getDate()}</span>
                        <div className="mt-0.5 space-y-0.5">
                          {atvs.slice(0, 3).map(a => (
                            <div key={a.id} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate text-white`}
                              style={{ backgroundColor: a.status === "CONCLUIDA" ? "#94a3b8" : a.cor }}>
                              {a.titulo}
                            </div>
                          ))}
                          {atvs.length > 3 && <div className="text-[10px] text-zinc-400 px-1">+{atvs.length - 3} mais</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral — Atividades do dia */}
          <div className="w-80 shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-24">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {diaSelecionado ? new Date(diaSelecionado + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }) : "Selecione um dia"}
                </h3>
                {diaSelecionado && (
                  <button onClick={() => abrirNovo(diaSelecionado)} className="p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
                {atividadesDiaSelecionado.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">
                    {diaSelecionado ? "Nenhuma atividade" : "Clique em um dia"}
                  </div>
                ) : atividadesDiaSelecionado.map(atv => {
                  const tp = tipoInfo(atv.tipo);
                  const pr = prioridadeInfo(atv.prioridade);
                  const Icon = tp.icon;
                  const isAtrasada = atv.status === "PENDENTE" && new Date(atv.dataInicio) < new Date();

                  return (
                    <motion.div key={atv.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl border transition ${atv.status === "CONCLUIDA" ? "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:shadow-md"}`}>
                      <div className="flex items-start gap-2.5">
                        <button onClick={() => toggleConcluir(atv)}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition
                          ${atv.status === "CONCLUIDA" ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300 hover:border-brand"}`}>
                          {atv.status === "CONCLUIDA" && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${atv.status === "CONCLUIDA" ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"}`}>{atv.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: tp.color + "20", color: tp.color }}>
                              <Icon className="w-3 h-3" /> {tp.label}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pr.color + "20", color: pr.color }}>
                              {pr.label}
                            </span>
                            {isAtrasada && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">Atrasada</span>}
                          </div>
                          {atv.leadNome && <p className="text-[11px] text-zinc-400 mt-1">📌 {atv.leadNome}</p>}
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {new Date(atv.dataInicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {atv.dataFim && ` — ${new Date(atv.dataFim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => abrirEditar(atv)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => excluir(atv.id)} className="p-1 rounded hover:bg-rose-50 text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => { setShowModal(false); setEditando(null); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg p-6"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{editando ? "Editar Atividade" : "Nova Atividade"}</h3>
                  <button onClick={() => { setShowModal(false); setEditando(null); }} className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>

                <div className="space-y-4">
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da atividade *"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand/30 outline-none" />

                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand/30 outline-none resize-none" />

                  {/* Tipo */}
                  <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Tipo</label>
                    <div className="flex gap-2 flex-wrap">
                      {TIPOS.map(t => (
                        <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key, cor: t.color }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${form.tipo === t.key ? "text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"}`}
                          style={form.tipo === t.key ? { backgroundColor: t.color } : {}}>
                          <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1.5 block">Prioridade</label>
                    <div className="flex gap-2">
                      {PRIORIDADES.map(p => (
                        <button key={p.key} onClick={() => setForm(f => ({ ...f, prioridade: p.key }))}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${form.prioridade === p.key ? "text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"}`}
                          style={form.prioridade === p.key ? { backgroundColor: p.color } : {}}>
                          <Flag className="w-3 h-3" /> {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 mb-1 block">Início *</label>
                      <input type="datetime-local" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 mb-1 block">Fim</label>
                      <input type="datetime-local" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none" />
                    </div>
                  </div>

                  {/* Lead & Lembrete */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 mb-1 block">Lead vinculado</label>
                      <input value={form.leadNome} onChange={e => setForm(f => ({ ...f, leadNome: e.target.value }))} placeholder="Nome do lead"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 mb-1 block">Lembrete</label>
                      <select value={form.lembrete} onChange={e => setForm(f => ({ ...f, lembrete: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none">
                        <option value="">Sem lembrete</option>
                        <option value="15">15 min antes</option>
                        <option value="30">30 min antes</option>
                        <option value="60">1 hora antes</option>
                        <option value="1440">1 dia antes</option>
                      </select>
                    </div>
                  </div>

                  <button onClick={salvar} className="w-full bg-brand hover:bg-brand/90 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-brand/25">
                    {editando ? "Salvar Alterações" : "Criar Atividade"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
