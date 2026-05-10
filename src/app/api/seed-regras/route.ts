import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BANCOS_LEGADOS = [
  { nome: "Daycoval", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "BMG", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "PAN", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Facta", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Safra", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "C6 Bank", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "Banrisul", minPag: 12, minParc: 20, port: true, refin: true, portRefin: false, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "Amigoz", minPag: 12, minParc: 20, port: false, refin: false, portRefin: false, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: false, hasCartao: true },
  { nome: "BRB", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Digio", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "Finanto Bank", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "iCred", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "Mais BB", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "Mercantil", minPag: 12, minParc: 20, port: false, refin: false, portRefin: false, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: false, hasCartao: true },
  { nome: "PicPay", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Presença Bank", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Quero Mais", minPag: 12, minParc: 20, port: false, refin: false, portRefin: false, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: true },
  { nome: "Total Cash", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
  { nome: "VCTEX", minPag: 12, minParc: 20, port: true, refin: true, portRefin: true, fatorSaldo: 1.0, valorMinimo: 500, trocoMin: 100, hasEmprestimo: true, hasCartao: false },
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
      
      // Desativa bancos genéricos previamente inseridos
      await prisma.banco.updateMany({
        where: {
          empresaId: empresa.id,
          nome: { in: ["Itaú", "Bradesco", "Caixa", "Banco do Brasil", "Santander", "Sicoob"] }
        },
        data: {
          status: "inativo",
          ativoSimulacao: false
        }
      });

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

      const produtosProps = [];
      if (b.hasEmprestimo) {
        produtosProps.push({ tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Consignado Novo" });
        produtosProps.push({ tipo: "PORTABILIDADE", nome: "Portabilidade" });
        produtosProps.push({ tipo: "REFINANCIAMENTO", nome: "Refinanciamento" });
        if (b.portRefin) {
          produtosProps.push({ tipo: "PORTABILIDADE_REFIN", nome: "Portabilidade + Refin" });
        }
      }
      if (b.hasCartao) {
        produtosProps.push({ tipo: "CARTAO_CONSIGNADO", nome: "Cartão Consignado" });
        produtosProps.push({ tipo: "CARTAO_BENEFICIO", nome: "Cartão Benefício" });
      }

      const tiposPermitidos = produtosProps.map(p => p.tipo);

      // Desativa produtos e regras antigas que não são mais permitidas para este banco
      await prisma.produtoCredito.updateMany({
        where: {
          empresaId: empresa.id,
          bancoId: bancoDb.id,
          tipoProduto: { notIn: tiposPermitidos as any }
        },
        data: { ativo: false }
      });
      await prisma.regraProdutoCredito.updateMany({
        where: {
          empresaId: empresa.id,
          bancoId: bancoDb.id,
          tipoOperacao: { notIn: tiposPermitidos as any }
        },
        data: { ativa: false }
      });

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
        } else {
          // Reativa se já existia
          await prisma.produtoCredito.update({
            where: { id: produto.id },
            data: { ativo: true }
          });
        }

        const prazos = [84, 96, 108];
        for (const prazo of prazos) {
          const coefExato = prazo === 84 ? 0.023105 : prazo === 96 ? 0.0206 : 0.0191;
          const tabelaExistente = await prisma.tabelaCoeficiente.findFirst({
            where: { bancoId: bancoDb.id, produtoId: produto.id, prazo: prazo }
          });

          if (!tabelaExistente) {
            await prisma.tabelaCoeficiente.create({
              data: {
                empresaId: empresa.id,
                bancoId: bancoDb.id,
                produtoId: produto.id,
                convenioId: inss?.id,
                nome: `Tabela Padrão INSS ${prazo}x (${b.nome})`,
                prazo: prazo,
                taxaJurosMensal: 1.66,
                coeficiente: coefExato,
                ativo: true
              }
            });
          } else {
            await prisma.tabelaCoeficiente.update({
              where: { id: tabelaExistente.id },
              data: {
                coeficiente: coefExato,
                taxaJurosMensal: 1.66
              }
            });
          }
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
              trocoMinimoLiberado: b.trocoMin,
              margemNovaValorMin: b.valorMinimo,
              portPermitido: prodProp.tipo.includes("PORTABILIDADE") ? b.port : undefined,
              portParcelasMinPagas: prodProp.tipo.includes("PORTABILIDADE") ? b.minPag : undefined,
              portValorMin: b.valorMinimo,
              refinPermitido: prodProp.tipo.includes("REFINANCIAMENTO") ? b.refin : undefined,
              refinParcelasMinPagas: prodProp.tipo.includes("REFINANCIAMENTO") ? b.minPag : undefined,
              refinValorMin: b.valorMinimo,
              refinTrocoMin: b.trocoMin,
              faixasEtarias: [{ idade_min: 21, idade_max: 73 }],
              especies: { aceitas: [21, 32, 41, 42, 46, 92] }
            }
          });
        } else {
          await prisma.regraProdutoCredito.update({
            where: { id: regraExistente.id },
            data: { ativa: true }
          });
        }
      }
      }
    }

    return NextResponse.json({ success: true, message: "Regras inseridas com sucesso!", logs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
