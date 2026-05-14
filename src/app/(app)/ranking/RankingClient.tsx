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
  FileDigit
} from "lucide-react";

type MetaRow = {
  vendedorEmail: string;
  vendedorNome: string | null;
  metaPropostas: number | null;
  metaVolume: number | null;
  metaLeads: number | null;
  metaComissao: number | null;
};

type PropostaAgrupada = {
  vendedorEmail: string | null;
  _count: number;
  _sum?: { valorLiberado: number | null; valorComissao: number | null };
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

export function RankingClient({
  metas,
  propostasPagas,
  propostasDigitadas = [],
  leadsCriados,
  equipe,
  mesAtual,
  anoAtual,
}: {
  metas: MetaRow[];
  propostasPagas: PropostaAgrupada[];
  propostasDigitadas?: PropostaAgrupada[];
  leadsCriados: LeadCriado[];
  equipe: Membro[];
  mesAtual: number;
  anoAtual: number;
}) {
  // Build ranking per vendedor
  const vendedorMap = new Map<string, {
    nome: string;
    propostas: number;
    propostasDigitadas: number;
    volume: number;
    comissao: number;
    leads: number;
    metaPropostas: number | null;
    metaVolume: number | null;
    metaLeads: number | null;
    metaComissao: number | null;
    pontos: number;
  }>();

  // Seed from equipe
  equipe.forEach((m) => {
    vendedorMap.set(m.email, {
      nome: m.nome || m.email.split("@")[0],
      propostas: 0, propostasDigitadas: 0, volume: 0, comissao: 0, leads: 0, pontos: 0,
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
        propostas: 0, propostasDigitadas: 0, volume: 0, comissao: 0, leads: 0, pontos: 0,
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
      v.volume = p._sum?.valorLiberado || 0;
      v.comissao = p._sum?.valorComissao || 0;
    }
  });

  propostasDigitadas.forEach((p) => {
    if (!p.vendedorEmail) return;
    const v = vendedorMap.get(p.vendedorEmail);
    if (v) v.propostasDigitadas = p._count;
  });

  leadsCriados.forEach((l) => {
    if (!l.vendedorEmail) return;
    const v = vendedorMap.get(l.vendedorEmail);
    if (v) v.leads = l._count;
  });

  // Calcular Pontos de Gamificação
  vendedorMap.forEach((v) => {
    // 1 Ponto a cada R$ 100 pagos
    const pontosVolume = Math.floor(v.volume / 100);
    // 50 Pontos por proposta digitada
    const pontosDigitadas = v.propostasDigitadas * 50;
    // 10 Pontos por lead criado/atendido
    const pontosLeads = v.leads * 10;
    
    v.pontos = pontosVolume + pontosDigitadas + pontosLeads;
  });

  // Sort by PONTOS desc
  const ranking = Array.from(vendedorMap.entries())
    .map(([email, data]) => ({ email, ...data }))
    .sort((a, b) => b.pontos - a.pontos);

  const totalVolume = ranking.reduce((s, r) => s + r.volume, 0);
  const totalPontos = ranking.reduce((s, r) => s + r.pontos, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Trophy className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-bold">Ranking XP</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand">
              Corridão de Vendas - {meses[mesAtual]}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
              Acumule pontos digitando, convertendo e faturando alto!
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total de Pontos (Equipe)</span>
            <span className="text-4xl font-black text-brand tabular-nums flex items-center gap-2">
               {totalPontos.toLocaleString()} <Flame className="h-8 w-8" />
            </span>
          </div>
        </header>

        {/* Info Box */}
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex items-start gap-3">
           <Flame className="w-5 h-5 text-brand shrink-0 mt-0.5" />
           <div>
              <h4 className="font-bold text-brand text-sm">Como funciona a pontuação?</h4>
              <p className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-1">
                 💸 <strong>Pagos:</strong> 1 Ponto a cada R$ 100 de volume pago.<br/>
                 ✍️ <strong>Digitados:</strong> 50 Pontos por cada proposta digitada aguardando no banco.<br/>
                 🎯 <strong>Leads:</strong> 10 Pontos por cada lead novo na esteira.
              </p>
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
          <div className="space-y-4">
            {ranking.map((v, i) => {
              const isPodium = i < 3;
              
              return (
                <div
                  key={v.email}
                  className={`rounded-2xl border p-5 transition hover:shadow-lg relative overflow-hidden ${
                    i === 0
                      ? "border-amber-400 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/40 dark:to-zinc-900"
                      : i === 1 ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/20"
                      : i === 2 ? "border-orange-300/50 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-900/10"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                >
                  {i === 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-300/30 to-transparent rounded-bl-full" />}
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                     <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center h-12 w-12 rounded-full shrink-0 shadow-sm ${
                           i === 0 ? "bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/30" : 
                           i === 1 ? "bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-zinc-500/30" : 
                           i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-500 shadow-orange-500/30" : 
                           "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                           {isPodium ? <Crown className="h-6 w-6 text-white" /> : <span className="font-bold text-zinc-500">{i + 1}º</span>}
                        </div>
                        
                        <div>
                           <p className="font-black text-lg text-zinc-900 dark:text-white leading-tight">{v.nome}</p>
                           <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Volume: {fmt(v.volume)}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-6 md:gap-10">
                        {/* Breakdown */}
                        <div className="flex items-center gap-4 text-center">
                           <div>
                              <p className="text-xs text-zinc-500 font-semibold mb-0.5"><DollarSign className="w-3 h-3 inline text-emerald-500" /> Pagos</p>
                              <p className="font-bold tabular-nums">{v.propostas}</p>
                           </div>
                           <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                           <div>
                              <p className="text-xs text-zinc-500 font-semibold mb-0.5"><FileDigit className="w-3 h-3 inline text-violet-500" /> Digit.</p>
                              <p className="font-bold tabular-nums">{v.propostasDigitadas}</p>
                           </div>
                           <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                           <div>
                              <p className="text-xs text-zinc-500 font-semibold mb-0.5"><Users className="w-3 h-3 inline text-blue-500" /> Leads</p>
                              <p className="font-bold tabular-nums">{v.leads}</p>
                           </div>
                        </div>

                        {/* Pontos Totais */}
                        <div className="text-right shrink-0 min-w-[120px]">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pontos XP</p>
                           <p className={`text-3xl font-black tabular-nums flex justify-end items-center gap-1 ${
                              i === 0 ? "text-amber-500" : "text-orange-500"
                           }`}>
                              {v.pontos.toLocaleString()} <Flame className="h-6 w-6" />
                           </p>
                        </div>
                     </div>
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
