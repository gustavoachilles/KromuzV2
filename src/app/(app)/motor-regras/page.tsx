// Tela do Motor de Regras V2.
// Sprint 1 — núcleo do diferencial Kromuz: ingestão de roteiros via IA.

export const dynamic = "force-dynamic";

import { ImportadorPDF } from "@/components/motor-regras/ImportadorPDF";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Brain, Database } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export default async function MotorRegrasPage() {
  const sessao = await getSessionEmpresa();

  // Caso seja um ambiente zerado sem empresa, a sessão já cuidou de criar.
  const empresaId = sessao.empresaId;

  const [totalRegras, totalImportacoes, totalBancos] = await Promise.all([
    prisma.regraProdutoCredito.count({ where: { empresaId: empresaId } }),
    prisma.importacaoPDF.count({ where: { empresaId: empresaId } }),
    prisma.banco.count({ where: { empresaId: empresaId, ativo: true } }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-brand">
            <Brain className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              Sprint 1 · Motor de Regras V2
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Cérebro de crédito do Kromuz
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Pipeline inteligente que lê os roteiros operacionais dos bancos (PDFs/imagens) e
            extrai automaticamente as regras de margem nova, refinanciamento, portabilidade,
            cartão consignado e cartão benefício.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <KPICard
            icon={<Database className="h-4 w-4" />}
            label="Bancos cadastrados"
            valor={totalBancos}
          />
          <KPICard
            icon={<Sparkles className="h-4 w-4" />}
            label="Regras ativas"
            valor={totalRegras}
          />
          <KPICard
            icon={<Brain className="h-4 w-4" />}
            label="PDFs importados"
            valor={totalImportacoes}
          />
        </div>

        <ImportadorPDF empresaId={empresaId} />
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{valor.toLocaleString("pt-BR")}</p>
      </CardContent>
    </Card>
  );
}
