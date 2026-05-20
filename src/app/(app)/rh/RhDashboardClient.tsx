"use client";
import { useMemo } from "react";
import Link from "next/link";
import {
  Users, AlertTriangle, CheckCircle2, Shield, TrendingUp, DollarSign,
  UserCheck, Clock, ArrowRight, XCircle, AlertCircle, BarChart3,
  Building2, FileText, Receipt
} from "lucide-react";
import { formatarMoeda, calcularCustoTotalEmpresa, calcularPassivoTrabalhista } from "@/lib/rh/calculos-trabalhistas";

type Func = {
  id: string;
  nome: string;
  regimeContratacao: string;
  status: string;
  nivelRisco: string;
  passivoEstimado: number;
  salarioBase?: number | null;
  valorMensalPj?: number | null;
  bolsaAuxilio?: number | null;
  cargoFuncao?: string | null;
  tipoJornada: string;
  horasDiarias: number;
  dataAdmissao?: string | null;
  valeTransporte: boolean;
  valeAlimentacao?: number | null;
  planoSaude: boolean;
};

const RISCO_COLORS: Record<string, string> = {
  BAIXO: "text-emerald-500",
  MEDIO: "text-amber-500",
  ALTO: "text-orange-500",
  EXTREMO: "text-red-500",
};

export function RhDashboardClient({
  funcionarios,
  regimeTributario,
  nomeEmpresa,
}: {
  funcionarios: Func[];
  regimeTributario: string;
  nomeEmpresa: string;
}) {
  const stats = useMemo(() => {
    const ativos = funcionarios.filter(f => f.status === "ATIVO");
    const clt = ativos.filter(f => f.regimeContratacao === "CLT");
    const pj = ativos.filter(f => f.regimeContratacao === "PJ");
    const estagiarios = ativos.filter(f => f.regimeContratacao === "ESTAGIARIO");
    const informais = ativos.filter(f => f.regimeContratacao === "INFORMAL");

    const passivoTotal = ativos.reduce((s, f) => s + (f.passivoEstimado || 0), 0);

    // Custo mensal da folha (CLT)
    let custoFolhaMensal = 0;
    for (const f of clt) {
      if (f.salarioBase) {
        const custo = calcularCustoTotalEmpresa({
          salarioBase: f.salarioBase,
          valeTransporte: f.valeTransporte,
          valeAlimentacao: f.valeAlimentacao || 0,
          planoSaude: f.planoSaude,
          regimeTributario,
        });
        custoFolhaMensal += custo.custoTotal;
      }
    }

    // Custo PJ mensal
    const custoPjMensal = pj.reduce((s, f) => s + (f.valorMensalPj || 0), 0);

    // Compliance score (0-100)
    let score = 100;
    if (informais.length > 0) score -= informais.length * 20;
    if (pj.length > 0) score -= pj.length * 5;
    const riscosAltos = ativos.filter(f => f.nivelRisco === "ALTO" || f.nivelRisco === "EXTREMO");
    score -= riscosAltos.length * 10;
    score = Math.max(0, Math.min(100, score));

    // Top riscos
    const topRiscos = [...ativos]
      .sort((a, b) => (b.passivoEstimado || 0) - (a.passivoEstimado || 0))
      .slice(0, 5)
      .filter(f => f.passivoEstimado > 0);

    // Alertas
    const alertas: { tipo: string; msg: string; nivel: string }[] = [];
    if (informais.length > 0) {
      alertas.push({
        tipo: "INFORMAL",
        msg: `${informais.length} funcionário(s) sem registro. Multa: ${formatarMoeda(informais.length * 3000)} (Art. 47 CLT)`,
        nivel: "EXTREMO",
      });
    }
    for (const f of ativos) {
      if (f.regimeContratacao === "PJ" && (f.tipoJornada === "TELEMARKETING_6H" || f.horasDiarias >= 8)) {
        alertas.push({
          tipo: "PEJOTIZACAO",
          msg: `${f.nome}: PJ com jornada controlada — risco de reconhecimento de vínculo CLT`,
          nivel: "ALTO",
        });
      }
    }

    return {
      total: ativos.length,
      clt: clt.length,
      pj: pj.length,
      estagiarios: estagiarios.length,
      informais: informais.length,
      passivoTotal,
      custoFolhaMensal,
      custoPjMensal,
      custoTotalMensal: custoFolhaMensal + custoPjMensal,
      score,
      topRiscos,
      alertas,
    };
  }, [funcionarios, regimeTributario]);

  const scoreColor = stats.score >= 80 ? "text-emerald-500" : stats.score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = stats.score >= 80 ? "bg-emerald-500" : stats.score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1" style={{ color: "var(--brand-primary)" }}>📊 DASHBOARD</p>
            <h1 className="text-3xl font-bold tracking-tight">RH & Compliance Trabalhista</h1>
            <p className="text-sm text-zinc-500 mt-1">Visão executiva da gestão de pessoas — {nomeEmpresa}</p>
          </div>
          <Link
            href="/rh/funcionarios"
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 transition"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <UserCheck className="h-4 w-4" /> Gerenciar Funcionários
          </Link>
        </div>

        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DashCard
            icon={<Users className="h-5 w-5" />}
            label="Total de Funcionários"
            value={stats.total.toString()}
            sublabel="ativos"
            color="bg-zinc-100 dark:bg-zinc-800"
            iconColor="text-zinc-500"
          />
          <DashCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Custo Mensal Total"
            value={formatarMoeda(stats.custoTotalMensal)}
            sublabel={`CLT: ${formatarMoeda(stats.custoFolhaMensal)} · PJ: ${formatarMoeda(stats.custoPjMensal)}`}
            color="bg-blue-50 dark:bg-blue-950/30"
            iconColor="text-blue-500"
          />
          <DashCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Passivo Trabalhista"
            value={formatarMoeda(stats.passivoTotal)}
            sublabel="risco acumulado estimado"
            color={stats.passivoTotal > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"}
            iconColor={stats.passivoTotal > 0 ? "text-red-500" : "text-emerald-500"}
          />
          <div className={`rounded-2xl p-5 ${stats.score >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : stats.score >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className={`h-5 w-5 ${scoreColor}`} />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Compliance Score</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black tabular-nums ${scoreColor}`}>{stats.score}</span>
              <span className="text-sm text-zinc-400 mb-1">/ 100</span>
            </div>
            <div className="mt-3 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full ${scoreBg} transition-all duration-500 rounded-full`} style={{ width: `${stats.score}%` }} />
            </div>
          </div>
        </div>

        {/* Row 2: Distribution + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição por regime */}
          <div className="lg:col-span-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-zinc-400" /> Distribuição por Regime</h3>
            <div className="space-y-3">
              {[
                { key: "CLT", count: stats.clt, color: "bg-emerald-500", total: stats.total },
                { key: "PJ", count: stats.pj, color: "bg-amber-500", total: stats.total },
                { key: "Estagiários", count: stats.estagiarios, color: "bg-blue-500", total: stats.total },
                { key: "Informais", count: stats.informais, color: "bg-red-500", total: stats.total },
              ].map(r => (
                <div key={r.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{r.key}</span>
                    <span className="text-zinc-500">{r.count} <span className="text-xs">({stats.total ? Math.round(r.count / stats.total * 100) : 0}%)</span></span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${stats.total ? (r.count / stats.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas Ativos</h3>
            {stats.alertas.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">Sem alertas críticos</p>
                  <p className="text-xs text-zinc-500">Sua empresa está em conformidade trabalhista.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stats.alertas.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${a.nivel === "EXTREMO" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}>
                    {a.nivel === "EXTREMO"
                      ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    }
                    <div>
                      <p className="text-xs font-semibold">{a.tipo}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{a.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Top Riscos */}
        {stats.topRiscos.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-500" /> Top 5 — Maior Passivo Trabalhista</h3>
            <div className="space-y-2">
              {stats.topRiscos.map((f, i) => (
                <div key={f.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                  <span className="text-lg font-black text-zinc-300 w-6 text-center">{i + 1}</span>
                  <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {f.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.nome}</p>
                    <p className="text-xs text-zinc-500">{f.cargoFuncao || "—"} · {f.regimeContratacao}</p>
                  </div>
                  <div className={`text-right ${RISCO_COLORS[f.nivelRisco] || "text-zinc-500"}`}>
                    <p className="font-bold text-sm tabular-nums">{formatarMoeda(f.passivoEstimado)}</p>
                    <p className="text-[10px] uppercase font-semibold">{f.nivelRisco}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { href: "/rh/funcionarios", icon: <UserCheck className="h-5 w-5" />, label: "Funcionários", desc: "Cadastrar e gerenciar" },
            { href: "/rh/ponto", icon: <Clock className="h-5 w-5" />, label: "Controle de Ponto", desc: "Batidas e jornada" },
            { href: "/rh/passivo", icon: <AlertTriangle className="h-5 w-5" />, label: "Passivo Trabalhista", desc: "Simulador de risco" },
            { href: "/rh/folha", icon: <Receipt className="h-5 w-5" />, label: "Folha & Holerites", desc: "Projeção mensal" },
          ].map(a => (
            <Link key={a.href} href={a.href} className="group flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-brand transition" style={{ "--tw-text-opacity": 1 } as React.CSSProperties}>
                {a.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-xs text-zinc-400">{a.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashCard({ icon, label, value, sublabel, color, iconColor }: {
  icon: React.ReactNode; label: string; value: string; sublabel: string; color: string; iconColor: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={iconColor}>{icon}</div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>
    </div>
  );
}
