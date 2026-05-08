import { NextRequest, NextResponse } from "next/server";
import { parseHisconPdf } from "@/lib/simulador/parser-v2";
import { processarHisconV3 } from "@/lib/simulador/extrator-hiscon";
import { calcularOportunidades, ClienteSimulacao, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [Simulador] Recebendo requisição...");
    const body = await req.json();
    const { pdfBase64, empresaId } = body;

    if (!pdfBase64 || !empresaId) {
      return NextResponse.json({ error: "Parâmetros inválidos: pdfBase64 e empresaId são obrigatórios." }, { status: 400 });
    }

    const buffer = Buffer.from(pdfBase64, "base64");

    // 1. Tenta extrair dados via Robô (Parser)
    console.log("📄 [Simulador] Iniciando extração do PDF com o Robô...");
    let hiscon;
    try {
      hiscon = await parseHisconPdf(buffer);
      console.log("✅ [Simulador] Robô leu o PDF com sucesso!");
    } catch (e: any) {
      console.warn("⚠️ [Simulador] Robô falhou, tentando via IA...", e.message);
      const extracao = await extrairHisconDePdf(pdfBase64);
      if (!extracao.ok) {
        return NextResponse.json({ error: extracao.erro }, { status: 422 });
      }
      hiscon = extracao.dados;
      console.log("✅ [Simulador] IA leu o PDF com sucesso!");
    }

    // 2. Mapeia para os tipos do simulador
    console.log("🗺️ [Simulador] Mapeando dados do cliente...");
    const dataAtual = new Date();
    let ddb = new Date(hiscon.dados_cliente.data_despacho_beneficio);
    if (isNaN(ddb.getTime())) ddb = dataAtual;

    const clienteSimulacao: ClienteSimulacao = {
      idade: hiscon.dados_cliente.idade,
      uf: hiscon.dados_cliente.uf,
      especie: hiscon.dados_cliente.especie_beneficio,
      possuiRepresentanteLegal: hiscon.dados_cliente.possui_representante_legal,
      dataDespachoBeneficio: ddb,
      margemLivre: hiscon.dados_cliente.margens.emprestimo_livre,
      margemRmc: hiscon.dados_cliente.margens.cartao_rmc_livre,
      margemRcc: hiscon.dados_cliente.margens.cartao_rcc_livre,
    };

    const contratosAtivos: ContratoAtivo[] = hiscon.contratos_ativos.map((c, index) => ({
      id: `contrato-${index}`,
      bancoNome: c.banco,
      valorParcela: c.valor_parcela,
      parcelasPagas: c.parcelas_pagas || 0,
      parcelasTotal: c.prazo_total,
      taxaJuros: c.taxa_juros_mensal || 1.66,
      saldoDevedorEstimado: c.saldo_devedor_estimado,
      prazoRestante: c.prazo_total - (c.parcelas_pagas || 0),
    }));

    // 3. Busca Regras e Tabelas do Banco de Dados
    console.log("🗄️ [Simulador] Buscando regras e tabelas no banco de dados...");
    const [regras, tabelas] = await Promise.all([
      prisma.regraProdutoCredito.findMany({
        where: { empresaId, ativa: true },
      }),
      prisma.tabelaCoeficiente.findMany({
        where: { empresaId, ativo: true },
      })
    ]);
    console.log(`✅ [Simulador] Banco respondeu: ${regras.length} regras e ${tabelas.length} tabelas encontradas.`);

    // 4. Calcula Oportunidades
    console.log("⚖️ [Simulador] Calculando oportunidades...");
    const oportunidades = calcularOportunidades(clienteSimulacao, contratosAtivos, regras, tabelas);
    console.log("🏁 [Simulador] Simulação concluída!");

    return NextResponse.json({
      cliente: hiscon.dados_cliente,
      contratos: contratosAtivos,
      oportunidades
    });

  } catch (error: any) {
    console.error("❌ [Simulador] ERRO CRÍTICO NA ROTA:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar simulação." }, { status: 500 });
  }
}
