"use client";

import { Users, Target, DollarSign, TrendingUp, UserCircle, CheckCircle2 } from "lucide-react";

type Membro = { email: string; nome: string | null; perfilSlug: string };
type PropostaGrupo = { vendedorEmail: string | null; status: string; _count: number; _sum: { valorLiberado: number | null; valorComissao: number | null } };
type LeadGrupo = { vendedorEmail: string | null; status: string; _count: number };
type MetaRow = { vendedorEmail: string; metaPropostas: number | null; metaVolume: number | null; metaLeads: number | null };

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DashVendedoresClient({
  equipe, propostasMes, leadsMes, metasMes, mesLabel,
}: {
  equipe: Membro[];
  propostasMes: PropostaGrupo[];
  leadsMes: LeadGrupo[];
  metasMes: MetaRow[];
  mesLabel: string;
}) {
  const vendedores = equipe.map((m) => {
    const props = propostasMes.filter((p) => p.vendedorEmail === m.email);
    const leads = leadsMes.filter((l) => l.vendedorEmail === m.email);
    const meta = metasMes.find((mt) => mt.vendedorEmail === m.email);

    const totalProps = props.reduce((s, p) => s + p._count, 0);
    const propsPagas = props.filter((p) => p.status === "PAGA").reduce((s, p) => s + p._count, 0);
    const volume = props.reduce((s, p) => s + (p._sum.valorLiberado || 0), 0);
    const volumePago = props.filter((p) => p.status === "PAGA").reduce((s, p) => s + (p._sum.valorLiberado || 0), 0);
    const comissao = props.reduce((s, p) => s + (p._sum.valorComissao || 0), 0);
    const totalLeads = leads.reduce((s, l) => s + l._count, 0);
    const leadsNovos = leads.filter((l) => l.status === "NOVO").reduce((s, l) => s + l._count, 0);

    return {
      email: m.email,
      nome: m.nome || m.email.split("@")[0],
      perfil: m.perfilSlug,
      totalProps, propsPagas, volume, volumePago, comissao, totalLeads, leadsNovos,
      meta,
    };
  }).sort((a, b) => b.volumePago - a.volumePago);

  const totalGeral = vendedores.reduce((s, v) => s + v.volumePago, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <Users className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Vendedores</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight capitalize">{mesLabel}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">{vendedores.length} vendedor{vendedores.length !== 1 ? "es" : ""} · {fmt(totalGeral)} produzido</p>
        </header>

        {vendedores.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum vendedor</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {vendedores.map((v, i) => (
              <div key={v.email} className={`rounded-2xl border p-6 transition hover:shadow-md ${i === 0 ? "border-indigo-300 dark:border-indigo-700 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{v.nome}</p>
                    <p className="text-[10px] text-zinc-400">{v.perfil} · {v.email}</p>
                  </div>
                  <span className="text-2xl font-black text-zinc-200 dark:text-zinc-800">#{i + 1}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat icon={<TrendingUp className="h-3.5 w-3.5 text-violet-500" />} label="Volume" value={fmt(v.volume)} sub={`${fmt(v.volumePago)} pago`} />
                  <MiniStat icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} label="Propostas" value={`${v.propsPagas} pagas`} sub={`${v.totalProps} total`} />
                  <MiniStat icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />} label="Comissão" value={fmt(v.comissao)} />
                  <MiniStat icon={<Users className="h-3.5 w-3.5 text-indigo-500" />} label="Leads" value={`${v.totalLeads}`} sub={`${v.leadsNovos} novos`} />
                </div>

                {v.meta && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> Meta do mês</p>
                    <div className="grid grid-cols-2 gap-2">
                      {v.meta.metaVolume && <MetaBar label="Volume" real={v.volumePago} meta={v.meta.metaVolume} color="bg-violet-500" />}
                      {v.meta.metaPropostas && <MetaBar label="Propostas" real={v.propsPagas} meta={v.meta.metaPropostas} color="bg-emerald-500" />}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 p-3">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[10px] text-zinc-400">{label}</span></div>
      <p className="text-sm font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}

function MetaBar({ label, real, meta, color }: { label: string; real: number; meta: number; color: string }) {
  const pct = Math.min(Math.round((real / meta) * 100), 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}
