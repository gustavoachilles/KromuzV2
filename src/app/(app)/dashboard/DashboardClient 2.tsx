"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  Calculator,
  BookOpen,
  FileText,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Brain,
  BarChart3,
  Shield,
  Users,
  Kanban,
} from "lucide-react";

type KPIs = {
  totalBancos: number;
  totalBancosSimulacao: number;
  totalProdutos: number;
  totalTabelas: number;
  totalRegras: number;
  totalConvenios: number;
  totalImportacoes: number;
  importacoesOk: number;
  totalLeads: number;
  totalPropostas: number;
  totalPropostasPagas: number;
  volumeTotal: number;
  comissaoTotal: number;
};

type FunilItem = { name: string; value: number; fill: string };
type RankingItem = { vendedorNome: string | null; _sum: { valorLiberado: number | null; valorComissao: number | null } };

type ImportacaoRecente = {
  id: string;
  nomeArquivo: string;
  status: string;
  createdAt: string | Date;
  _count: { regrasGeradas: number };
};

type RegraPorTipo = {
  tipoOperacao: string;
  _count: number;
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refinanciamento",
  PORTABILIDADE: "Portabilidade",
  PORTABILIDADE_REFIN: "Port + Refin",
  CARTAO_CONSIGNADO: "Cartão Consig.",
  CARTAO_BENEFICIO: "Cartão Benefício",
};

const tipoColor: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "bg-emerald-500",
  REFINANCIAMENTO: "bg-amber-500",
  PORTABILIDADE: "bg-indigo-500",
  PORTABILIDADE_REFIN: "bg-violet-500",
  CARTAO_CONSIGNADO: "bg-fuchsia-500",
  CARTAO_BENEFICIO: "bg-pink-500",
};

export function DashboardClient({
  sessao,
  kpis,
  importacoesRecentes,
  regrasPorTipo,
  funilData,
  rankingVendedores,
}: {
  sessao: { nomeUsuario: string | null; nomeEmpresa: string };
  kpis: KPIs;
  importacoesRecentes: ImportacaoRecente[];
  regrasPorTipo: RegraPorTipo[];
  funilData?: FunilItem[];
  rankingVendedores?: RankingItem[];
}) {
  const router = useRouter();

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const maxRegras = Math.max(...regrasPorTipo.map((r) => r._count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {saudacao}, {sessao.nomeUsuario || "Operador"} 👋
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Visão geral da <span className="font-medium">{sessao.nomeEmpresa}</span>
          </p>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Building2 className="h-5 w-5" />}
            label="Bancos Ativos"
            value={kpis.totalBancos}
            sub={`${kpis.totalBancosSimulacao} na simulação`}
            color="violet"
            onClick={() => router.push("/bancos")}
          />
          <KpiCard
            icon={<Layers className="h-5 w-5" />}
            label="Produtos"
            value={kpis.totalProdutos}
            color="indigo"
            onClick={() => router.push("/produtos")}
          />
          <KpiCard
            icon={<Calculator className="h-5 w-5" />}
            label="Tabelas"
            value={kpis.totalTabelas}
            color="emerald"
          />
          <KpiCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Regras Ativas"
            value={kpis.totalRegras}
            sub={`${kpis.totalImportacoes} PDFs importados`}
            color="fuchsia"
            onClick={() => router.push("/regras")}
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Volume Liberado"
            value={`R$ ${kpis.volumeTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            color="emerald"
          />
          <KpiCard
            icon={<Shield className="h-5 w-5" />}
            label="Comissão Paga"
            value={`R$ ${kpis.comissaoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            color="amber"
          />
        </div>

        {/* Funil e Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Funil de Vendas</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Conversão do Lead até o Pagamento</p>
              </div>
              <BarChart3 className="h-5 w-5 text-zinc-400" />
            </div>
            
            <div className="space-y-4">
              {funilData?.map((item, index) => {
                const max = Math.max(...(funilData.map(f => f.value) || [1]));
                const pct = Math.max((item.value / max) * 100, 5);
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.name}</span>
                      <span className="font-bold tabular-nums">{item.value}</span>
                    </div>
                    <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Top Vendedores</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Ranking por volume liberado</p>
              </div>
              <Users className="h-5 w-5 text-zinc-400" />
            </div>

            <div className="space-y-4">
              {rankingVendedores?.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <p className="text-sm">Nenhuma venda registrada.</p>
                </div>
              ) : (
                rankingVendedores?.map((v, i) => (
                  <div key={v.vendedorNome} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{v.vendedorNome || "Desconhecido"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {(v._sum.valorLiberado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        R$ {(v._sum.valorComissao || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} comissão
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regras por Tipo */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Regras por Tipo de Operação</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Distribuição das {kpis.totalRegras} regras ativas
                </p>
              </div>
              <Brain className="h-5 w-5 text-zinc-400" />
            </div>

            {regrasPorTipo.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm">Nenhuma regra cadastrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {regrasPorTipo
                  .sort((a, b) => b._count - a._count)
                  .map((r) => (
                    <div key={r.tipoOperacao} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 w-32 shrink-0 truncate">
                        {tipoLabel[r.tipoOperacao] || r.tipoOperacao}
                      </span>
                      <div className="flex-1 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full rounded-lg ${tipoColor[r.tipoOperacao] || "bg-zinc-500"} transition-all duration-500`}
                          style={{ width: `${Math.max((r._count / maxRegras) * 100, 8)}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                          {r._count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Importações Recentes */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Importações Recentes</h2>
              <button
                onClick={() => router.push("/roteiros")}
                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 font-medium flex items-center gap-1"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {importacoesRecentes.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm">Nenhuma importação ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importacoesRecentes.map((imp) => {
                  const statusIcon =
                    imp.status === "concluido" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : imp.status === "erro" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    );

                  return (
                    <div
                      key={imp.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                      onClick={() => router.push(`/regras?importacao=${imp.id}`)}
                    >
                      {statusIcon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {imp.nomeArquivo}
                        </p>
                        <p className="text-[11px] text-zinc-500 tabular-nums">
                          {new Date(imp.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                          {imp._count.regrasGeradas} regras
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={<Calculator className="h-5 w-5" />}
            title="Simular Extrato"
            desc="Upload de HISCON para análise de oportunidades"
            onClick={() => router.push("/simulador")}
          />
          <QuickAction
            icon={<Brain className="h-5 w-5" />}
            title="Importar Roteiro"
            desc="Extraia regras de um PDF de banco via IA"
            onClick={() => router.push("/motor-regras")}
          />
          <QuickAction
            icon={<Building2 className="h-5 w-5" />}
            title="Gerenciar Bancos"
            desc="Adicione bancos e tabelas de coeficientes"
            onClick={() => router.push("/bancos")}
          />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/40 dark:text-fuchsia-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4 transition ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700" : ""
      }`}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto group-hover:text-violet-500 group-hover:translate-x-1 transition" />
      </div>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{title}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
    </button>
  );
}
