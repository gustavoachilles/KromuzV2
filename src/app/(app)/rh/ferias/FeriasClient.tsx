"use client";
import { useState, useMemo } from "react";
import {
  Calendar, AlertTriangle, CheckCircle2, Clock, Plus, X,
  Sun, Palmtree, AlertCircle, XCircle, Timer, ChevronDown
} from "lucide-react";
import { formatarMoeda } from "@/lib/rh/calculos-trabalhistas";

type Ferias = {
  id: string;
  funcionarioId: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  periodoConcessivoFim: string;
  diasDireito: number;
  diasGozados: number;
  diasVendidos: number;
  dataInicio?: string | null;
  dataFim?: string | null;
  status: string;
  valorFerias?: number | null;
  valorTerco?: number | null;
  pagoEmDobro: boolean;
  observacoes?: string | null;
};

type Func = {
  id: string;
  nome: string;
  cargoFuncao?: string | null;
  dataAdmissao?: string | null;
  salarioBase?: number | null;
  ferias: Ferias[];
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  PENDENTE: { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800", label: "Pendente", icon: <Clock className="h-3 w-3" /> },
  AGENDADA: { color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40", label: "Agendada", icon: <Calendar className="h-3 w-3" /> },
  EM_GOZO: { color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40", label: "Em Gozo", icon: <Palmtree className="h-3 w-3" /> },
  GOZADA: { color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800", label: "Gozada", icon: <CheckCircle2 className="h-3 w-3" /> },
  VENCIDA: { color: "bg-red-50 text-red-700 dark:bg-red-950/40", label: "Vencida!", icon: <AlertTriangle className="h-3 w-3" /> },
};

function diasAte(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function FeriasClient({ funcionarios, empresaId }: { funcionarios: Func[]; empresaId: string }) {
  const [modal, setModal] = useState<Func | null>(null);
  const [formInicio, setFormInicio] = useState("");
  const [formFim, setFormFim] = useState("");
  const [formDiasVendidos, setFormDiasVendidos] = useState("0");
  const [salvando, setSalvando] = useState(false);

  // Calcular períodos automaticamente para quem não tem férias cadastradas
  const dados = useMemo(() => {
    return funcionarios.map(f => {
      const admissao = f.dataAdmissao ? new Date(f.dataAdmissao) : null;
      if (!admissao) return { ...f, periodos: f.ferias, alertas: [] };

      // Gerar períodos aquisitivos automaticamente
      const periodos = [...f.ferias];
      const agora = new Date();
      const mesesDesdeAdmissao = Math.floor((agora.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const anosCompletos = Math.floor(mesesDesdeAdmissao / 12);

      // Se não tem períodos cadastrados, gerar automaticamente
      if (periodos.length === 0 && anosCompletos >= 1) {
        for (let i = 0; i < anosCompletos; i++) {
          const inicio = new Date(admissao);
          inicio.setFullYear(inicio.getFullYear() + i);
          const fim = new Date(inicio);
          fim.setFullYear(fim.getFullYear() + 1);
          const concessivoFim = new Date(fim);
          concessivoFim.setFullYear(concessivoFim.getFullYear() + 1);

          const isVencida = concessivoFim < agora;

          periodos.push({
            id: `auto-${i}`,
            funcionarioId: f.id,
            periodoAquisitivoInicio: inicio.toISOString(),
            periodoAquisitivoFim: fim.toISOString(),
            periodoConcessivoFim: concessivoFim.toISOString(),
            diasDireito: 30,
            diasGozados: 0,
            diasVendidos: 0,
            dataInicio: null,
            dataFim: null,
            status: isVencida ? "VENCIDA" : "PENDENTE",
            valorFerias: null,
            valorTerco: null,
            pagoEmDobro: isVencida,
            observacoes: null,
          });
        }
      }

      // Alertas
      const alertas: string[] = [];
      for (const p of periodos) {
        if (p.status === "VENCIDA" || (p.status === "PENDENTE" && diasAte(p.periodoConcessivoFim) < 0)) {
          alertas.push(`Férias VENCIDAS — período ${formatDate(p.periodoAquisitivoInicio)} a ${formatDate(p.periodoAquisitivoFim)}. Pagamento em DOBRO obrigatório (Art. 137 CLT).`);
        } else if (p.status === "PENDENTE" && diasAte(p.periodoConcessivoFim) <= 90) {
          alertas.push(`Férias vencem em ${diasAte(p.periodoConcessivoFim)} dias — período ${formatDate(p.periodoAquisitivoInicio)} a ${formatDate(p.periodoAquisitivoFim)}. Agende agora!`);
        }
      }

      return { ...f, periodos, alertas };
    });
  }, [funcionarios]);

  // Resumo
  const resumo = useMemo(() => {
    let vencidas = 0, vencendoBreve = 0, emGozo = 0, ok = 0;
    for (const d of dados) {
      for (const p of d.periodos) {
        if (p.status === "VENCIDA") vencidas++;
        else if (p.status === "PENDENTE" && diasAte(p.periodoConcessivoFim) <= 90 && diasAte(p.periodoConcessivoFim) > 0) vencendoBreve++;
        else if (p.status === "EM_GOZO") emGozo++;
        else if (p.status === "GOZADA") ok++;
      }
    }
    return { vencidas, vencendoBreve, emGozo, ok };
  }, [dados]);

  async function agendarFerias(funcId: string) {
    if (!formInicio || !formFim) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/rh/ferias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funcionarioId: funcId,
          dataInicio: formInicio,
          dataFim: formFim,
          diasVendidos: parseInt(formDiasVendidos) || 0,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao agendar férias");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>🌴 GESTÃO DE FÉRIAS</p>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Férias</h1>
          <p className="text-sm text-zinc-500 mt-1">Períodos aquisitivos, concessivos e agendamento — apenas funcionários CLT</p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-xl p-4 text-center ${resumo.vencidas > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
            <p className={`text-2xl font-bold ${resumo.vencidas > 0 ? "text-red-600" : "text-zinc-400"}`}>{resumo.vencidas}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Férias Vencidas</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${resumo.vencendoBreve > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
            <p className={`text-2xl font-bold ${resumo.vencendoBreve > 0 ? "text-amber-600" : "text-zinc-400"}`}>{resumo.vencendoBreve}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Vencendo em 90 dias</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{resumo.emGozo}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Em Gozo</p>
          </div>
          <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">{resumo.ok}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Gozadas</p>
          </div>
        </div>

        {/* Alertas */}
        {dados.some(d => d.alertas.length > 0) && (
          <div className="space-y-2">
            {dados.flatMap(d => d.alertas.map((a, i) => (
              <div key={`${d.id}-${i}`} className={`flex items-start gap-3 p-3 rounded-xl ${a.includes("VENCIDAS") ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}>
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.includes("VENCIDAS") ? "text-red-500" : "text-amber-500"}`} />
                <div>
                  <p className="text-xs font-semibold">{d.nome}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{a}</p>
                </div>
              </div>
            )))}
          </div>
        )}

        {/* Lista por funcionário */}
        <div className="space-y-3">
          {dados.map(d => {
            if (d.periodos.length === 0 && !d.dataAdmissao) return null;
            const hasAlerta = d.alertas.length > 0;

            return (
              <div key={d.id} className={`rounded-2xl border ${hasAlerta ? "border-amber-200 dark:border-amber-800" : "border-zinc-200 dark:border-zinc-800"} bg-white dark:bg-zinc-900 overflow-hidden`}>
                <div className="flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500">
                    {d.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{d.nome}</p>
                    <p className="text-xs text-zinc-400">{d.cargoFuncao || "—"} · Admissão: {formatDate(d.dataAdmissao)}</p>
                  </div>
                  <button
                    onClick={() => { setModal(d); setFormInicio(""); setFormFim(""); setFormDiasVendidos("0"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    <Plus className="h-3 w-3" /> Agendar Férias
                  </button>
                </div>

                {d.periodos.length > 0 ? (
                  <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {d.periodos.map(p => {
                      const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDENTE;
                      const diasRestantes = diasAte(p.periodoConcessivoFim);
                      const diasPendentes = p.diasDireito - p.diasGozados - p.diasVendidos;

                      return (
                        <div key={p.id} className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr] gap-3 items-center px-4 py-3 text-sm">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Período Aquisitivo</p>
                            <p className="font-medium text-xs">{formatDate(p.periodoAquisitivoInicio)} → {formatDate(p.periodoAquisitivoFim)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Concessivo até</p>
                            <p className={`font-medium text-xs ${diasRestantes < 0 ? "text-red-500" : diasRestantes <= 90 ? "text-amber-500" : ""}`}>
                              {formatDate(p.periodoConcessivoFim)}
                              {diasRestantes > 0 && <span className="text-zinc-400 ml-1">({diasRestantes}d)</span>}
                              {diasRestantes < 0 && <span className="text-red-400 ml-1">(vencido!)</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Dias</p>
                            <p className="text-xs">{p.diasGozados}/{p.diasDireito} gozados {p.diasVendidos > 0 && `· ${p.diasVendidos} vendidos`}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase">Período de Gozo</p>
                            <p className="text-xs">{p.dataInicio ? `${formatDate(p.dataInicio)} → ${formatDate(p.dataFim)}` : "Não agendado"}</p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <div className="text-right">
                            {p.pagoEmDobro && <span className="text-[10px] font-bold text-red-500">2×</span>}
                            {d.salarioBase && diasPendentes > 0 && (
                              <p className="text-xs text-zinc-500 tabular-nums">
                                {formatarMoeda((d.salarioBase / 30) * diasPendentes * (p.pagoEmDobro ? 2 : 1) * (4 / 3))}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-400">
                    Sem períodos aquisitivos completos (admissão: {formatDate(d.dataAdmissao)})
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {dados.length === 0 && (
          <div className="text-center py-16">
            <Palmtree className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário CLT cadastrado</p>
          </div>
        )}

        {/* Info jurídica */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">📘 Regras de Férias — CLT</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-600 dark:text-blue-400">
            <div><p className="font-semibold">Período Aquisitivo</p><p>12 meses de trabalho para adquirir o direito a 30 dias de férias.</p></div>
            <div><p className="font-semibold">Período Concessivo</p><p>12 meses após o aquisitivo para o empregador conceder as férias. Se ultrapassar: pagamento em DOBRO (Art. 137).</p></div>
            <div><p className="font-semibold">Abono Pecuniário</p><p>O empregado pode vender até 1/3 das férias (10 dias). O terço constitucional (1/3 do salário) é obrigatório.</p></div>
          </div>
        </div>
      </div>

      {/* Modal de agendamento */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Palmtree className="h-5 w-5" style={{ color: "var(--brand-primary)" }} /> Agendar Férias</h2>
              <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-zinc-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-zinc-500">{modal.nome}</p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Data Início *</label>
                <input type="date" value={formInicio} onChange={e => setFormInicio(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Data Fim *</label>
                <input type="date" value={formFim} onChange={e => setFormFim(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Dias Vendidos (Abono Pecuniário)</label>
                <input type="number" min="0" max="10" value={formDiasVendidos} onChange={e => setFormDiasVendidos(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
                <p className="text-[10px] text-zinc-400">Máx. 10 dias (1/3 das férias)</p>
              </div>
            </div>

            {modal.salarioBase && formInicio && formFim && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm">
                <p className="text-xs text-zinc-500 mb-1">Valor estimado:</p>
                <p className="font-bold text-emerald-600">
                  {formatarMoeda(modal.salarioBase * (4 / 3))}
                  <span className="text-xs font-normal text-zinc-500 ml-1">(salário + 1/3 constitucional)</span>
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-500">Cancelar</button>
              <button
                onClick={() => agendarFerias(modal.id)}
                disabled={!formInicio || !formFim || salvando}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                {salvando ? "Salvando..." : "Confirmar Agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
