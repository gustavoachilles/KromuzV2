import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BANCOS_LEGADOS = [
  { nome: "Daycoval", minPag: 12, minRest: 12, minParc: 100, port: true, refin: true, portRefin: true, fatorSaldo: 0.85 },
  { nome: "BMG", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "PAN", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.74 },
  { nome: "Facta", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.73 },
  { nome: "Itaú", minPag: 15, minRest: 12, minParc: 150, port: true, refin: true, portRefin: false, fatorSaldo: 0.75 },
  { nome: "Bradesco", minPag: 15, minRest: 12, minParc: 150, port: true, refin: true, portRefin: false, fatorSaldo: 0.75 },
  { nome: "Caixa", minPag: 15, minRest: 18, minParc: 100, port: true, refin: true, portRefin: false, fatorSaldo: 0.73 },
  { nome: "Banco do Brasil", minPag: 15, minRest: 12, minParc: 100, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
  { nome: "Santander", minPag: 12, minRest: 12, minParc: 100, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "Safra", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "C6 Bank", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.73 },
  { nome: "Banrisul", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
  { nome: "Sicoob", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
];

export async function GET() {
  try {
    const empresas = await prisma.empresa.findMany();
    if (empresas.length === 0) {
      return NextResponse.json({ error: "Nenhuma empresa encontrada" }, { status: 400 });
    }

    let logs = [];

    for (const empresa of empresas) {
      logs.push(`Processando regras para a empresa: ${empresa.nomeEmpresa || empresa.id}`);
      
      const inss = await prisma.convenio.findFirst({
        where: { empresaId: empresa.id, slug: "inss" }
      });

      for (const b of BANCOS_LEGADOS) {
      let bancoDb = await prisma.banco.findFirst({
        where: { empresaId: empresa.id, nome: b.nome }
      });

      if (!bancoDb) {
        bancoDb = await prisma.banco.create({
          data: {
            empresaId: empresa.id,
            nome: b.nome,
            tipo: "consignado",
            tipoBanco: "consignado",
            fatorSaldo: b.fatorSaldo,
            ativoSimulacao: true,
            status: "ativo"
          }
        });
        logs.push(`Banco Criado: ${b.nome}`);
      } else {
        await prisma.banco.update({
          where: { id: bancoDb.id },
          data: { fatorSaldo: b.fatorSaldo, ativoSimulacao: true }
        });
        logs.push(`Banco Atualizado: ${b.nome}`);
      }

      const produtosProps = [
        { tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Consignado Novo" },
        { tipo: "PORTABILIDADE", nome: "Portabilidade" },
        { tipo: "REFINANCIAMENTO", nome: "Refinanciamento" },
        ...(b.portRefin ? [{ tipo: "PORTABILIDADE_REFIN", nome: "Portabilidade + Refin" }] : [])
      ];

      for (const prodProp of produtosProps) {
        let produto = await prisma.produtoCredito.findFirst({
          where: { empresaId: empresa.id, bancoId: bancoDb.id, tipoProduto: prodProp.tipo as any }
        });

        if (!produto) {
          produto = await prisma.produtoCredito.create({
            data: {
              empresaId: empresa.id,
              bancoId: bancoDb.id,
              convenioId: inss?.id,
              nomeProduto: prodProp.nome,
              tipoProduto: prodProp.tipo as any,
              ativo: true
            }
          });
        }

        const tabelaExistente = await prisma.tabelaCoeficiente.findFirst({
          where: { bancoId: bancoDb.id, produtoId: produto.id, prazo: 84 }
        });

        if (!tabelaExistente) {
          await prisma.tabelaCoeficiente.create({
            data: {
              empresaId: empresa.id,
              bancoId: bancoDb.id,
              produtoId: produto.id,
              convenioId: inss?.id,
              nome: `Tabela Padrão INSS 84x (${b.nome})`,
              prazo: 84,
              taxaJurosMensal: 1.66,
              coeficiente: 0.0225,
              ativo: true
            }
          });
        }

        const regraExistente = await prisma.regraProdutoCredito.findFirst({
          where: { bancoId: bancoDb.id, produtoId: produto.id }
        });

        if (!regraExistente) {
          await prisma.regraProdutoCredito.create({
            data: {
              empresaId: empresa.id,
              bancoId: bancoDb.id,
              bancoNome: bancoDb.nome,
              produtoId: produto.id,
              produtoNome: produto.nomeProduto,
              tipoOperacao: prodProp.tipo as any,
              ativa: true,
              prioridade: 1,
              taxaMinimaAm: 1.0,
              taxaMaximaAm: 1.66,
              trocoMinimoLiberado: 100,
              portPermitido: prodProp.tipo.includes("PORTABILIDADE") ? b.port : undefined,
              portParcelasMinPagas: prodProp.tipo.includes("PORTABILIDADE") ? b.minPag : undefined,
              refinPermitido: prodProp.tipo.includes("REFINANCIAMENTO") ? b.refin : undefined,
              refinParcelasMinPagas: prodProp.tipo.includes("REFINANCIAMENTO") ? b.minPag : undefined,
              refinValorMin: b.minParc,
              faixasEtarias: [{ idade_min: 21, idade_max: 73 }],
              especies: { aceitas: [21, 32, 41, 42, 46, 92] }
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Regras inseridas com sucesso!", logs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
