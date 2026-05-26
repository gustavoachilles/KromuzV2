import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { inssOperacoesDisponiveis, fgtsSaldo, FACTA_CONFIG } from "@/lib/facta";

/**
 * POST /api/consultas/executar
 *
 * Orquestrador de Consultas — recebe solicitação de consulta (INSS, FGTS, CLT)
 * INSS: Consulta direta via API Facta (retorna tabelas/taxas em tempo real)
 * FGTS: Consulta saldo via API Facta (só produção) ou FilaRpa
 * CLT:  Cria tarefa na FilaRpa para processamento via robô
 *
 * Usado tanto pela Mesa do Operador quanto pela IA do WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const { empresaId } = sessao;

    const data = await req.json();
    const { tipo, cpf, telefone, dataNascimento, origem = "MESA", valor, prazo } = data;

    // Validações
    if (!tipo || !["INSS", "FGTS", "CLT"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo de consulta inválido. Use: INSS, FGTS ou CLT." }, { status: 400 });
    }

    const cpfLimpo = cpf?.replace(/\D/g, "");
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    if ((tipo === "FGTS" || tipo === "CLT") && !dataNascimento) {
      return NextResponse.json({ error: "Data de nascimento é obrigatória para consultas FGTS/CLT." }, { status: 400 });
    }

    if ((tipo === "FGTS" || tipo === "CLT") && !telefone) {
      return NextResponse.json({ error: "Telefone é obrigatório para consultas FGTS/CLT." }, { status: 400 });
    }

    // Buscar ou criar lead vinculado ao CPF
    let lead = await prisma.lead.findFirst({
      where: { empresaId, cpf: cpfLimpo },
      orderBy: { updatedAt: "desc" },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          empresaId,
          nome: `Consulta ${tipo} — ${cpfLimpo}`,
          cpf: cpfLimpo,
          telefone: telefone?.replace(/\D/g, "") || null,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
          status: "NOVO",
          origem: `CONSULTA_${tipo}`,
          canalContato: origem === "WHATSAPP" ? "whatsapp" : "presencial",
        },
      });
    }

    // ── INSS: Consulta direta via Facta API ──
    if (tipo === "INSS") {
      try {
        // Converter data ISO para DD/MM/AAAA se necessário
        let dataNasc = dataNascimento || "";
        if (dataNasc.includes("-")) {
          const [y, m, d] = dataNasc.split("-");
          dataNasc = `${d}/${m}/${y}`;
        }

        const resultado = await inssOperacoesDisponiveis({
          cpf: cpfLimpo,
          dataNascimento: dataNasc || "01/01/1970",
          valor: valor || 1000,
          prazo: prazo || 84,
          tipoOperacao: 13,
        });

        // Salvar resultado no lead
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            observacoes: `Consulta INSS Facta (${FACTA_CONFIG.isHomol ? "HOMOL" : "PROD"}): ${
              resultado.erro ? resultado.mensagem : `${resultado.tabelas?.length || 0} tabelas encontradas`
            }`,
          },
        });

        return NextResponse.json({
          success: !resultado.erro,
          leadId: lead.id,
          tipo: "INSS",
          fonte: "FACTA_API",
          ambiente: FACTA_CONFIG.isHomol ? "HOMOLOGAÇÃO" : "PRODUÇÃO",
          message: resultado.erro
            ? resultado.mensagem
            : `Consulta INSS realizada com sucesso. ${resultado.tabelas?.length || 0} tabela(s) disponível(is).`,
          tabelas: resultado.tabelas || [],
        });
      } catch (e: any) {
        console.error("[Consulta INSS Facta] Erro:", e.message);
        // Fallback: cria na FilaRpa se a API falhar
      }
    }

    // ── FGTS: Consulta saldo via Facta (só produção) ──
    if (tipo === "FGTS" && !FACTA_CONFIG.isHomol) {
      try {
        const resultado = await fgtsSaldo(cpfLimpo);

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            observacoes: `Consulta FGTS Facta: ${
              resultado.erro ? resultado.mensagem : `Saldo total: R$ ${resultado.retorno?.saldo_total || "0"}`
            }`,
          },
        });

        return NextResponse.json({
          success: !resultado.erro,
          leadId: lead.id,
          tipo: "FGTS",
          fonte: "FACTA_API",
          ambiente: "PRODUÇÃO",
          message: resultado.erro
            ? resultado.mensagem
            : `Saldo FGTS consultado: R$ ${resultado.retorno?.saldo_total || "0"}`,
          saldo: resultado.retorno || null,
        });
      } catch (e: any) {
        console.error("[Consulta FGTS Facta] Erro:", e.message);
      }
    }

    // ── Fallback: FilaRpa (FGTS homol, CLT, ou quando API falha) ──
    const tipoRpa = `CONSULTA_${tipo}`;
    const tarefa = await prisma.filaRpa.create({
      data: {
        empresaId,
        tipo: tipoRpa,
        referenciaId: lead.id,
        payload: {
          tipoConsulta: tipo,
          cpf: cpfLimpo,
          telefone: telefone?.replace(/\D/g, "") || null,
          dataNascimento: dataNascimento || null,
          origem,
        },
        status: "PENDENTE",
      },
    });

    const mensagemExtra = tipo === "FGTS" && FACTA_CONFIG.isHomol
      ? " (Ambiente de homologação: saldo FGTS não disponível via API, consulta será feita via robô)"
      : "";

    return NextResponse.json({
      success: true,
      jobId: tarefa.id,
      leadId: lead.id,
      tipo,
      fonte: "FILA_RPA",
      message: `Consulta ${tipo} enviada para processamento.${mensagemExtra}`,
    });
  } catch (error: any) {
    console.error("Erro na consulta:", error);
    return NextResponse.json({ error: "Erro interno ao processar consulta." }, { status: 500 });
  }
}
