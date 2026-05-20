"use client";
import { useState, useMemo } from "react";
import {
  Clock, Play, Pause, Square, Coffee, AlertTriangle, CheckCircle2,
  Calendar, Timer, Users, Sun, Moon, ChevronDown
} from "lucide-react";

type FuncResumo = {
  id: string;
  nome: string;
  cargoFuncao?: string | null;
  tipoJornada: string;
  horasDiarias: number;
  horasSemanais: number;
  regimeContratacao: string;
};

type Pausa = {
  id: string;
  tipoPausa: string;
  inicio: string;
  fim?: string | null;
  duracaoMinutos?: number | null;
  cumprida: boolean;
};

type Registro = {
  id: string;
  funcionarioId: string;
  data: string;
  entrada?: string | null;
  saidaAlmoco?: string | null;
  retornoAlmoco?: string | null;
  saida?: string | null;
  horasTrabalhadas?: number | null;
  horasExtras?: number | null;
  falta: boolean;
  justificativa?: string | null;
  pausas: Pausa[];
};

function formatHora(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function calcHorasTrab(reg: Registro): number {
  if (!reg.entrada) return 0;
  const fim = reg.saida ? new Date(reg.saida) : new Date();
  const inicio = new Date(reg.entrada);
  let horas = (fim.getTime() - inicio.getTime()) / 3600000;

  // Descontar almoço
  if (reg.saidaAlmoco && reg.retornoAlmoco) {
    const almoco = (new Date(reg.retornoAlmoco).getTime() - new Date(reg.saidaAlmoco).getTime()) / 3600000;
    horas -= almoco;
  }

  return Math.max(0, Math.round(horas * 100) / 100);
}

export function PontoClient({
  funcionarios,
  registrosHoje: initialRegistros,
  empresaId,
}: {
  funcionarios: FuncResumo[];
  registrosHoje: Registro[];
  empresaId: string;
}) {
  const [registros, setRegistros] = useState<Record<string, Registro>>(() => {
    const map: Record<string, Registro> = {};
    for (const r of initialRegistros) map[r.funcionarioId] = r;
    return map;
  });
  const [loading, setLoading] = useState<string | null>(null);

  const hojeStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // Resumo
  const resumo = useMemo(() => {
    const presentes = funcionarios.filter(f => registros[f.id]?.entrada);
    const ausentes = funcionarios.filter(f => !registros[f.id]?.entrada);
    const emAlmoco = funcionarios.filter(f => {
      const r = registros[f.id];
      return r?.saidaAlmoco && !r?.retornoAlmoco;
    });
    const finalizados = funcionarios.filter(f => registros[f.id]?.saida);
    return { presentes: presentes.length, ausentes: ausentes.length, emAlmoco: emAlmoco.length, finalizados: finalizados.length };
  }, [funcionarios, registros]);

  async function registrarBatida(funcId: string, tipo: "entrada" | "saida_almoco" | "retorno_almoco" | "saida") {
    setLoading(`${funcId}-${tipo}`);
    try {
      const res = await fetch("/api/rh/ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funcionarioId: funcId, tipo }),
      });
      if (res.ok) {
        const reg = await res.json();
        setRegistros(prev => ({ ...prev, [funcId]: reg }));
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao registrar ponto");
      }
    } finally {
      setLoading(null);
    }
  }

  async function registrarPausa(funcId: string, regId: string, tipoPausa: string) {
    setLoading(`${funcId}-pausa`);
    try {
      const res = await fetch("/api/rh/ponto/pausa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funcionarioId: funcId, registroPontoId: regId, tipoPausa }),
      });
      if (res.ok) {
        const reg = await res.json();
        setRegistros(prev => ({ ...prev, [funcId]: reg }));
      }
    } finally {
      setLoading(null);
    }
  }

  function getStatusBadge(func: FuncResumo) {
    const reg = registros[func.id];
    if (!reg?.entrada) return { label: "Ausente", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800" };
    if (reg.saida) return { label: "Finalizado", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
    if (reg.saidaAlmoco && !reg.retornoAlmoco) return { label: "Almoço", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" };
    return { label: "Trabalhando", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" };
  }

  function getNextAction(func: FuncResumo) {
    const reg = registros[func.id];
    if (!reg?.entrada) return { tipo: "entrada" as const, label: "Registrar Entrada", icon: <Play className="h-3.5 w-3.5" /> };
    if (!reg.saidaAlmoco) return { tipo: "saida_almoco" as const, label: "Saída Almoço", icon: <Coffee className="h-3.5 w-3.5" /> };
    if (!reg.retornoAlmoco) return { tipo: "retorno_almoco" as const, label: "Retorno Almoço", icon: <Play className="h-3.5 w-3.5" /> };
    if (!reg.saida) return { tipo: "saida" as const, label: "Registrar Saída", icon: <Square className="h-3.5 w-3.5" /> };
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>⏱️ CONTROLE DE PONTO</p>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Ponto Eletrônico</h1>
          <p className="text-sm text-zinc-500 mt-1 capitalize">{hojeStr}</p>
        </div>

        {/* Resumo do dia */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{resumo.presentes}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Presentes</p>
          </div>
          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 text-center">
            <p className="text-2xl font-bold text-zinc-500">{resumo.ausentes}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ausentes</p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{resumo.emAlmoco}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Em Almoço</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{resumo.finalizados}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Finalizados</p>
          </div>
        </div>

        {/* PJ Alert */}
        {funcionarios.length === 0 && (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário elegível para controle de ponto</p>
            <p className="text-sm text-zinc-400 mt-1">Cadastre funcionários CLT ou Estagiários para utilizar o controle de ponto. PJs são excluídos automaticamente para evitar caracterização de subordinação.</p>
          </div>
        )}

        {/* Lista de funcionários */}
        {funcionarios.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="hidden lg:grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-3 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Funcionário</span>
              <span>Status</span>
              <span>Entrada</span>
              <span>Almoço</span>
              <span>Retorno</span>
              <span>Saída</span>
              <span>Horas Trab.</span>
              <span>NR-17</span>
              <span className="text-right">Ação</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {funcionarios.map(func => {
                const reg = registros[func.id];
                const status = getStatusBadge(func);
                const action = getNextAction(func);
                const horasTrab = reg ? calcHorasTrab(reg) : 0;
                const isExcedendo = horasTrab > func.horasDiarias;
                const isTelemarketing = func.tipoJornada === "TELEMARKETING_6H";

                // NR-17 pausas check
                const pausas = reg?.pausas || [];
                const pausa1 = pausas.find(p => p.tipoPausa === "PAUSA_10MIN_1");
                const pausa2 = pausas.find(p => p.tipoPausa === "PAUSA_10MIN_2");
                const refeicao = pausas.find(p => p.tipoPausa === "REFEICAO_20MIN");

                return (
                  <div key={func.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-3 items-center px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                    {/* Nome */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {func.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{func.nome}</p>
                        <p className="text-[10px] text-zinc-400">{func.cargoFuncao || "—"} · {func.horasDiarias}h/dia</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Batidas */}
                    <div className="text-sm tabular-nums">{formatHora(reg?.entrada)}</div>
                    <div className="text-sm tabular-nums">{formatHora(reg?.saidaAlmoco)}</div>
                    <div className="text-sm tabular-nums">{formatHora(reg?.retornoAlmoco)}</div>
                    <div className="text-sm tabular-nums">{formatHora(reg?.saida)}</div>

                    {/* Horas */}
                    <div className={`text-sm font-semibold tabular-nums ${isExcedendo ? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {reg?.entrada ? `${horasTrab.toFixed(1)}h` : "—"}
                      {isExcedendo && <span className="text-[9px] text-red-400 ml-1">HE</span>}
                    </div>

                    {/* NR-17 */}
                    <div>
                      {isTelemarketing && reg?.entrada ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => !pausa1 && reg && registrarPausa(func.id, reg.id, "PAUSA_10MIN_1")}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${pausa1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 hover:bg-amber-200 cursor-pointer"}`}
                            title="Pausa 10min #1"
                          >
                            P1{pausa1 ? "✓" : ""}
                          </button>
                          <button
                            onClick={() => !pausa2 && reg && registrarPausa(func.id, reg.id, "PAUSA_10MIN_2")}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${pausa2 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 hover:bg-amber-200 cursor-pointer"}`}
                            title="Pausa 10min #2"
                          >
                            P2{pausa2 ? "✓" : ""}
                          </button>
                          <button
                            onClick={() => !refeicao && reg && registrarPausa(func.id, reg.id, "REFEICAO_20MIN")}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${refeicao ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 hover:bg-amber-200 cursor-pointer"}`}
                            title="Refeição 20min"
                          >
                            R{refeicao ? "✓" : ""}
                          </button>
                        </div>
                      ) : isTelemarketing ? (
                        <span className="text-[10px] text-zinc-400">Aguard. entrada</span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">N/A</span>
                      )}
                    </div>

                    {/* Ação */}
                    <div className="text-right">
                      {action && (
                        <button
                          onClick={() => registrarBatida(func.id, action.tipo)}
                          disabled={loading === `${func.id}-${action.tipo}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-50 ${
                            action.tipo === "saida"
                              ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30"
                          }`}
                        >
                          {action.icon} {loading === `${func.id}-${action.tipo}` ? "..." : action.label}
                        </button>
                      )}
                      {!action && reg?.saida && (
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 justify-end">
                          <CheckCircle2 className="h-3 w-3" /> Completo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NR-17 info */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" /> Regras NR-17 — Telemarketing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-600 dark:text-blue-400">
            <div>
              <p className="font-semibold">Jornada Máxima</p>
              <p>6h/dia efetivas (36h/semanais)</p>
            </div>
            <div>
              <p className="font-semibold">Pausas Obrigatórias</p>
              <p>2 pausas de 10min (remuneradas, dentro da jornada)</p>
            </div>
            <div>
              <p className="font-semibold">Intervalo Refeição</p>
              <p>20min obrigatórios (não computa na jornada)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
