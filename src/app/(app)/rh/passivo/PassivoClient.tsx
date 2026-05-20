"use client";
import { useState, useMemo } from "react";
import {
  AlertTriangle, DollarSign, TrendingUp, Shield, Scale,
  ChevronDown, ChevronUp, User, CheckCircle2, XCircle, AlertCircle, Info
} from "lucide-react";
import { calcularPassivoTrabalhista, formatarMoeda, type CalculoPassivo } from "@/lib/rh/calculos-trabalhistas";

type Func = {
  id: string;
  nome: string;
  cpf: string;
  regimeContratacao: string;
  cargoFuncao?: string | null;
  tipoJornada: string;
  horasDiarias: number;
  salarioBase?: number | null;
  valorMensalPj?: number | null;
  bolsaAuxilio?: number | null;
  dataAdmissao?: string | null;
  nivelRisco: string;
  passivoEstimado: number;
};

const RISCO_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  BAIXO: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600", label: "Risco Baixo" },
  MEDIO: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600", label: "Risco Médio" },
  ALTO: { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-600", label: "Risco Alto" },
  EXTREMO: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", text: "text-red-600", label: "Risco Extremo" },
};

export function PassivoClient({
  funcionarios,
  regimeTributario,
}: {
  funcionarios: Func[];
  regimeTributario: string;
}) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroRegime, setFiltroRegime] = useState("todos");

  const dados = useMemo(() => {
    return funcionarios
      .filter(f => filtroRegime === "todos" || f.regimeContratacao === filtroRegime)
      .map(f => {
        const salario = f.salarioBase || f.valorMensalPj || f.bolsaAuxilio || 1518;
        const meses = f.dataAdmissao
          ? Math.max(1, Math.round((Date.now() - new Date(f.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 1;

        const passivo = calcularPassivoTrabalhista({
          salarioBase: salario,
          mesesTrabalhados: meses,
          regimeContratacao: f.regimeContratacao,
          tipoJornada: f.tipoJornada,
          horasDiarias: f.horasDiarias,
          regimeTributario,
        });

        return { ...f, salario, meses, passivo };
      });
  }, [funcionarios, filtroRegime, regimeTributario]);

  const passivoGeral = useMemo(() => dados.reduce((s, d) => s + d.passivo.passivoTotal, 0), [dados]);
  const comRisco = dados.filter(d => d.passivo.passivoTotal > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--brand-primary)" }}>⚠️ PASSIVO TRABALHISTA</p>
          <h1 className="text-3xl font-bold tracking-tight">Simulador de Risco Jurídico</h1>
          <p className="text-sm text-zinc-500 mt-1">Projeção do custo estimado de ações trabalhistas baseado na CLT, NR-17 e jurisprudência do TST.</p>
        </div>

        {/* Total */}
        <div className={`rounded-2xl p-6 border ${passivoGeral > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Passivo Trabalhista Total Estimado</p>
              <p className={`text-4xl font-black tabular-nums ${passivoGeral > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatarMoeda(passivoGeral)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{comRisco.length} funcionário(s) com risco · Prescrição quinquenal aplicada</p>
            </div>
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${passivoGeral > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
              {passivoGeral > 0 ? <Scale className="h-8 w-8 text-red-500" /> : <Shield className="h-8 w-8 text-emerald-500" />}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {["todos", "CLT", "PJ", "ESTAGIARIO", "INFORMAL"].map(r => (
            <button
              key={r}
              onClick={() => setFiltroRegime(r)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${filtroRegime === r ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700"}`}
            >
              {r === "todos" ? "Todos" : r}
            </button>
          ))}
        </div>

        {/* Info box */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p><strong>Como funciona:</strong> O simulador calcula o valor que cada funcionário poderia reivindicar em uma ação trabalhista, considerando:</p>
            <p>• FGTS retroativo (8%/mês) + multa rescisória de 40% • 13º salário não pago • Férias vencidas em dobro + 1/3 constitucional</p>
            <p>• Aviso prévio proporcional (Lei 12.506/2011) • Multas Art. 477 e 467 CLT • Horas extras retroativas (telemarketing 6h)</p>
            <p>• Honorários advocatícios (15%) • <strong>Prescrição quinquenal aplicada (máx. 60 meses)</strong></p>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {dados.map(d => {
            const risco = RISCO_CONFIG[d.passivo.nivelRisco] || RISCO_CONFIG.BAIXO;
            const isOpen = expandido === d.id;

            return (
              <div key={d.id} className={`rounded-2xl border ${risco.border} ${risco.bg} overflow-hidden transition-all`}>
                {/* Header do card */}
                <button
                  onClick={() => setExpandido(isOpen ? null : d.id)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 shrink-0">
                    {d.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{d.nome}</p>
                    <p className="text-xs text-zinc-500">{d.cargoFuncao || "—"} · {d.regimeContratacao} · {d.meses} meses</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black tabular-nums ${risco.text}`}>
                      {formatarMoeda(d.passivo.passivoTotal)}
                    </p>
                    <p className={`text-[10px] font-semibold uppercase ${risco.text}`}>{risco.label}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </button>

                {/* Breakdown */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                      <PassivoItem label="FGTS Retroativo" value={d.passivo.fgtsRetroativo} desc="8% × salário × meses" />
                      <PassivoItem label="Multa FGTS 40%" value={d.passivo.multaFgts40} desc="40% do saldo FGTS" />
                      <PassivoItem label="13º Salário" value={d.passivo.decimoTerceiro} desc="Retroativo" />
                      <PassivoItem label="Férias Vencidas" value={d.passivo.feriasVencidas} desc="Em dobro (Art. 137)" />
                      <PassivoItem label="Férias Proporcionais" value={d.passivo.feriasProporcionais} desc="Período corrente" />
                      <PassivoItem label="1/3 Férias" value={d.passivo.tercoFerias} desc="Terço constitucional" />
                      <PassivoItem label="Aviso Prévio" value={d.passivo.avisoPrevio} desc="30d + 3d/ano (máx 90d)" />
                      <PassivoItem label="INSS Retroativo" value={d.passivo.inssRetroativo} desc="Patronal 20%" />
                      <PassivoItem label="Horas Extras Retro." value={d.passivo.horasExtrasRetro} desc="Telemarketing 6h→8h" />
                      <PassivoItem label="Multa Art. 477" value={d.passivo.multaArt477} desc="Atraso verbas rescisórias" />
                      <PassivoItem label="Multa Art. 467" value={d.passivo.multaArt467} desc="50% verbas incontroversas" />
                      <PassivoItem label="Dano Moral" value={d.passivo.danoMoral} desc="Estimado (3× salário)" />
                      <PassivoItem label="Honorários Adv." value={d.passivo.honorarios} desc="15% sucumbência" />
                    </div>

                    {/* Comparação */}
                    {d.passivo.passivoTotal > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-red-100 dark:bg-red-900/30 p-4 text-center">
                          <p className="text-xs text-red-600 font-semibold uppercase mb-1">Se Entrar com Ação</p>
                          <p className="text-xl font-black text-red-700 tabular-nums">{formatarMoeda(d.passivo.passivoTotal)}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-4 text-center">
                          <p className="text-xs text-emerald-600 font-semibold uppercase mb-1">Custo de Regularizar Agora</p>
                          <p className="text-xl font-black text-emerald-700 tabular-nums">{formatarMoeda(d.salario * 1.4)}</p>
                          <p className="text-[10px] text-emerald-500 mt-1">~1.4× salário (registro + encargos mês)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {dados.length === 0 && (
          <div className="text-center py-16">
            <Shield className="h-12 w-12 mx-auto mb-4 text-emerald-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário com risco neste filtro</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PassivoItem({ label, value, desc }: { label: string; value: number; desc: string }) {
  if (value === 0) return null;
  return (
    <div className="rounded-xl bg-white/60 dark:bg-zinc-800/40 p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">{formatarMoeda(value)}</p>
      <p className="text-[9px] text-zinc-400 mt-0.5">{desc}</p>
    </div>
  );
}
