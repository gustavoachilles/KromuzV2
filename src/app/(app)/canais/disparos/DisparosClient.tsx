"use client";

import React, { useState } from "react";
import { Send, Plus, Users, Clock, CheckCircle2, Play, AlertCircle, X } from "lucide-react";

export function DisparosClient({ campanhas, canais, sessao }: { campanhas: any[], canais: any[], sessao: any }) {
  const [modalNovo, setModalNovo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    canalId: canais[0]?.id || "",
    filtro: "todos",
    mensagem: ""
  });
  
  const getStatusColor = (status: string) => { ... }; // Unchanged

  async function handleSubmit() {
    if (!form.nome || !form.mensagem || !form.canalId) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error("Erro ao criar campanha");
      
      alert("🚀 Campanha iniciada com sucesso! O sistema está disparando as mensagens em segundo plano.");
      setModalNovo(false);
      window.location.reload(); // Refresh para ver na lista
    } catch (err) {
      alert("Erro ao iniciar campanha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-violet-600" />
            Disparos em Massa
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Crie campanhas de WhatsApp para sua base filtrada de leads.
          </p>
        </div>
        <button 
          onClick={() => setModalNovo(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Campanha</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Agendamento</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Atingidos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {campanhas.map((camp: any) => (
              <tr key={camp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                <td className="px-6 py-4">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{camp.nome}</div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-1 max-w-sm">{camp.mensagemTemplate}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${getStatusColor(camp.status)}`}>
                    {camp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  {camp.dataAgendamento ? new Date(camp.dataAgendamento).toLocaleString() : "Imediato"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Users className="w-4 h-4" /> {camp.leadsAtingidos}
                  </div>
                </td>
              </tr>
            ))}
            {campanhas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                  Nenhuma campanha criada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Send className="w-5 h-5 text-violet-600" /> Nova Campanha
              </h2>
              <button onClick={() => setModalNovo(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome da Campanha</label>
                <input 
                  type="text" 
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="Ex: Black Friday Consignado" 
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Canal de Disparo</label>
                  <select 
                    value={form.canalId}
                    onChange={e => setForm({...form, canalId: e.target.value})}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    <option value="">Selecione um canal</option>
                    {canais.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nomeCanal}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtro da Base</label>
                  <select 
                    value={form.filtro}
                    onChange={e => setForm({...form, filtro: e.target.value})}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    <option value="todos">Todos os Leads</option>
                    <option value="NOVO">Apenas Leads Novos</option>
                    <option value="QUALIFICADO">Apenas Qualificados</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  Mensagem
                  <span className="text-xs text-zinc-400">Variáveis: {"{nome}"}, {"{banco}"}</span>
                </label>
                <textarea 
                  rows={5} 
                  value={form.mensagem}
                  onChange={e => setForm({...form, mensagem: e.target.value})}
                  placeholder="Olá {nome}! Temos uma novidade..." 
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>O disparo em lote consome cota do seu provedor de WhatsApp conectado. Verifique se o chip está aquecido para evitar bloqueios do número.</p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
              <button onClick={() => setModalNovo(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition">Cancelar</button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-violet-500/30 transition disabled:opacity-50"
              >
                {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Iniciando..." : "Iniciar Disparo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
