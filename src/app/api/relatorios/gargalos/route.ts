import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await getSessionEmpresaApi();
    if (!empresaId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const propostas = await prisma.proposta.findMany({
      where: { empresaId },
      select: {
        id: true,
        status: true,
        digitadaEm: true,
        aprovadaEm: true,
        pagaEm: true,
        createdAt: true
      }
    });

    // Mapeamento simples de tempos médios
    // Na vida real, usaríamos o historicoStatus que adicionamos ao banco.
    // Para agora, vamos usar as datas de marco que já existem.

    const metricas = {
      tempoMedioDigitacao: 0, // Criacao -> Digitada
      tempoMedioAprovacao: 0, // Digitada -> Aprovada
      tempoMedioPagamento: 0, // Aprovada -> Paga
    };

    let countDigitadas = 0;
    let countAprovadas = 0;
    let countPagas = 0;

    propostas.forEach(p => {
      if (p.digitadaEm && p.createdAt) {
        metricas.tempoMedioDigitacao += (new Date(p.digitadaEm).getTime() - new Date(p.createdAt).getTime());
        countDigitadas++;
      }
      if (p.aprovadaEm && p.digitadaEm) {
        metricas.tempoMedioAprovacao += (new Date(p.aprovadaEm).getTime() - new Date(p.digitadaEm).getTime());
        countAprovadas++;
      }
      if (p.pagaEm && p.aprovadaEm) {
        metricas.tempoMedioPagamento += (new Date(p.pagaEm).getTime() - new Date(p.aprovadaEm).getTime());
        countPagas++;
      }
    });

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    return NextResponse.json({
      gargalos: [
        { status: "Digitação", dias: countDigitadas > 0 ? (metricas.tempoMedioDigitacao / countDigitadas / MS_PER_DAY).toFixed(1) : 0 },
        { status: "Aprovação", dias: countAprovadas > 0 ? (metricas.tempoMedioAprovacao / countAprovadas / MS_PER_DAY).toFixed(1) : 0 },
        { status: "Pagamento", dias: countPagas > 0 ? (metricas.tempoMedioPagamento / countPagas / MS_PER_DAY).toFixed(1) : 0 },
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
