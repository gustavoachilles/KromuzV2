"use client";

import {
  Trophy,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Medal,
  Crown,
  Star,
  Flame,
} from "lucide-react";

type MetaRow = {
  vendedorEmail: string;
  vendedorNome: string | null;
  metaPropostas: number | null;
  metaVolume: number | null;
  metaLeads: number | null;
  metaComissao: number | null;
};

type PropostaPaga = {
  vendedorEmail: string | null;
  _count: number;
  _sum: { valorLiberado: number | null; valorComissao: number | null };
};

type LeadCriado = {
  vendedorEmail: string | null;
  _count: number;
};

type Membro = { email: string; nome: string | null; perfilSlug: string };

const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number | null) {
  if (!v) return "R$ 0";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(real: number, meta: number | null): number {
  if (!meta || meta <= 0) return 0;
  return Math.min(Math.round((real / meta) * 100), 100);
}

function getRankIcon(pos: number) {
  if (pos === 0) return <Crown className="h-5 w-5 text-amber-500" />;
  if (pos === 1) return <Medal className="h-5 w-5 text-zinc-400" />;
  if (pos === 2) return <Medal className="h-5 w-5 text-amber-700" />;
  return <Star className="h-4 w-4 text-zinc-300" />;
}

function getStreakLabel(pctTotal: number) {
  if (pctTotal >= 100) return { label: "🏆 Meta Batida!", color: "text-emerald-600" };
  if (pctTotal >= 75) return { label: "🔥 Quase lá!", color: "text-orange-500" };
  if (pctTotal >= 50) return { label: "💪 Bom ritmo", color: "text-blue-500" };
  if (pctTotal >= 25) return { label: "🚀 Acelerando", color: "text-violet-500" };
  return { label: "⏳ Começando", color: "text-zinc-400" };
}

export function RankingClient({
  metas,
  propostasPagas,
  leadsCriados,
  equipe,
  mesAtual,
  anoAtual,
}: {
  metas: MetaRow[];
  propostasPagas: PropostaPaga[];
  leadsCriados: LeadCriado[];
  equipe: Membro[];
  mesAtual: number;
  anoAtual: number;
}) {
  // Build ranking per vendedor
  const vendedorMap = new Map<string, {
    nome: string;
    propostas: number;
    volume: number;
    comissao: number;
    leads: number;
    metaPropostas: number | null;
    metaVolume: number | null;
    metaLeads: number | null;
    metaComissao: number | null;
  }>();

  // Seed from equipe
  equipe.forEach((m) => {
    vendedorMap.set(m.email, {
      nome: m.nome || m.email.split("@")[0],
      propostas: 0, volume: 0, comissao: 0, leads: 0,
      metaPropostas: null, metaVolume: null, metaLeads: null, metaComissao: null,
    });
  });

  // Fill metas
  metas.forEach((m) => {
    const v = vendedorMap.get(m.vendedorEmail);
    if (v) {
      v.metaPropostas = m.metaPropostas;
      v.metaVolume = m.metaVolume;
      v.metaLeads = m.metaLeads;
      v.metaComissao = m.metaComissao;
      if (m.vendedorNome) v.nome = m.vendedorNome;
    } else {
      vendedorMap.set(m.vendedorEmail, {
        nome: m.vendedorNome || m.vendedorEmail.split("@")[0],
        propostas: 0, volume: 0, comissao: 0, leads: 0,
        metaPropostas: m.metaPropostas, metaVolume: m.metaVolume,
        metaLeads: m.metaLeads, metaComissao: m.metaComissao,
      });
    }
  });

  // Fill real data
  propostasPagas.forEach((p) => {
    if (!p.vendedorEmail) return;
    const v = vendedorMap.get(p.vendedorEmail);
    if (v) {
      v.propostas = p._count;
      v.volume = p._sum.valorLiberado || 0;
      v.comissao = p._sum.valorComissao || 0;
    }
  });

  leadsCriados.forEach((l) => {
    if (!l.vendedorEmail) return;
    const v = vendedorMap.get(l.vendedorEmail);
    if (v) v.leads = l._count;
  });

  // Sort by volume desc
  const ranking = Array.from(vendedorMap.entries())
    .map(([email, data]) => ({ email, ...data }))
    .sort((a, b) => b.volume - a.volume);

  const totalVolume = ranking.reduce((s, r) => s + r.volume, 0);
  const totalPropostas = ranking.reduce((s, r) => s + r.propostas, 0);
  const totalLeads = ranking.reduce((s, r) => s + r.leads, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Trophy className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Ranking</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {meses[mesAtual]} {anoAtual}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Performance da equipe · {ranking.length} vendedor{ranking.length !== 1 ? "es" : ""}
          </p>
        </header>

        {/* KPI Global */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <TrendingUp className="h-5 w-5 text-violet-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{fmt(totalVolume)}</p>
            <p className="text-xs text-zinc-500">Volume Total</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <Target className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{totalPropostas}</p>
            <p className="text-xs text-zinc-500">Propostas Pagas</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
            <Users className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{totalLeads}</p>
            <p className="text-xs text-zinc-500">Leads no Mês</p>
          </div>
        </div>

        {/* Ranking Cards */}
        {ranking.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum vendedor cadastrado</h3>
            <p className="text-sm text-zinc-400 mt-1">Adicione membros em Configurações.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ranking.map((v, i) => {
              const pctVolume = pct(v.volume, v.metaVolume);
              const pctProp = pct(v.propostas, v.metaPropostas);
              const pctLeads = pct(v.leads, v.metaLeads);
              const avgPct = Math.round(
                ([pctVolume, pctProp, pctLeads].filter(Boolean).reduce((a, b) => a + b, 0)) /
                Math.max([pctVolume, pctProp, pctLeads].filter(Boolean).length, 1)
              );
              const streak = getStreakLabel(avgPct);

              return (
                <div
                  key={v.email}
                  className={`rounded-2xl border p-5 transition hover:shadow-md ${
                    i === 0
                      ? "border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50/50 to-white dark:from-amber-950/20 dark:to-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {/* Position */}
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
                      {getRankIcon(i)}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{v.nome}</p>
                      <p className={`text-xs font-semibold ${streak.color}`}>
                        {streak.label}
                      </p>
                    </div>

                    {/* Position number */}
                    <span className="text-3xl font-black text-zinc-200 dark:text-zinc-800 tabular-nums">
                      #{i + 1}
                    </span>
                  </div>

                  {/* Progress bars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ProgressBar
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      label="Volume"
                      value={fmt(v.volume)}
                      meta={v.metaVolume ? fmt(v.metaVolume) : null}
                      pct={pctVolume}
                      color="bg-violet-500"
                    />
                    <ProgressBar
                      icon={<Target className="h-3.5 w-3.5" />}
                      label="Propostas"
                      value={String(v.propostas)}
                      meta={v.metaPropostas ? String(v.metaPropostas) : null}
                      pct={pctProp}
                      color="bg-emerald-500"
                    />
                    <ProgressBar
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Leads"
                      value={String(v.leads)}
                      meta={v.metaLeads ? String(v.metaLeads) : null}
                      pct={pctLeads}
                      color="bg-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  icon,
  label,
  value,
  meta,
  pct: pctValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string | null;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          {icon} {label}
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {value}{meta ? ` / ${meta}` : ""}
        </span>
      </div>
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(pctValue, 2)}%` }}
        />
      </div>
      {meta && (
        <p className="text-[10px] text-right text-zinc-400 mt-0.5 tabular-nums">{pctValue}%</p>
      )}
    </div>
  );
}
