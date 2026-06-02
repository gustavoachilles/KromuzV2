import "dotenv/config";
import { prisma } from "../lib/prisma";
import { scrapeBeviTabelas } from "../lib/bevi";

async function run() {
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error("Nenhuma empresa encontrada");

  console.log("Empresa:", empresa.nomeEmpresa);

  const login = "SUB67-103060";
  const senha = "Justo@2024";
  const senhaRelatorio = "@Tabo201";
  
  const financeira = "FACTA";
  const convenio = "INSS";
  const formaContrato = "Port";

  console.log(`Buscando tabelas ${financeira} ${convenio} ${formaContrato}...`);
  const result = await scrapeBeviTabelas(login, senha, senhaRelatorio, { financeira, convenio, formaContrato });
  
  if (!result.meta.loginOk) throw new Error("Falha no login");
  
  console.log(`Encontradas ${result.tabelas.length} tabelas. Atualizando DB...`);

  // Find or create banco
  let banco = await prisma.banco.findFirst({
    where: { empresaId: empresa.id, nome: { contains: financeira, mode: "insensitive" } },
  });
  if (!banco) {
    banco = await prisma.banco.create({
      data: { empresaId: empresa.id, nome: `${financeira} FINANCEIRA`, tipo: "consignado", tipoBanco: "consignado" },
    });
  }

  // Find or create convenio
  let conv = await prisma.convenio.findFirst({
    where: { empresaId: empresa.id, slug: convenio.toLowerCase() },
  });
  if (!conv) {
    conv = await prisma.convenio.create({
      data: { empresaId: empresa.id, nome: convenio, slug: convenio.toLowerCase(), tipo: "federal" },
    });
  }

  // Find or create produto
  let produto = await prisma.produtoCredito.findFirst({
    where: { empresaId: empresa.id, bancoId: banco.id, tipoProduto: "PORTABILIDADE", convenioId: conv.id },
  });
  if (!produto) {
    produto = await prisma.produtoCredito.create({
      data: {
        empresaId: empresa.id, bancoId: banco.id, convenioId: conv.id,
        nomeProduto: `${financeira} - Portabilidade ${convenio}`,
        tipoProduto: "PORTABILIDADE",
      },
    });
  }

  let inseridas = 0, atualizadas = 0;
  for (const t of result.tabelas) {
    const data = {
      nome: t.nomeTabela,
      prazo: t.prazo,
      taxaJurosMensal: t.taxa,
      coeficiente: t.coeficiente,
      comissaoFlatPct: t.comissaoFlat,
      comissaoRepassePct: t.comissaoRepasse,
      ativo: true,
    };
    const existing = await prisma.tabelaCoeficiente.findFirst({
      where: { empresaId: empresa.id, bancoId: banco.id, produtoId: produto.id, nome: t.nomeTabela },
    });
    if (existing) {
      await prisma.tabelaCoeficiente.update({ where: { id: existing.id }, data });
      atualizadas++;
    } else {
      await prisma.tabelaCoeficiente.create({
        data: { ...data, empresaId: empresa.id, bancoId: banco.id, produtoId: produto.id, convenioId: conv.id },
      });
      inseridas++;
    }
  }

  console.log(`✅ Sucesso! Inseridas: ${inseridas}, Atualizadas: ${atualizadas}`);
}

run().catch(console.error);
