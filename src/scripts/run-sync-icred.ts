import "dotenv/config";
import { prisma } from "../lib/prisma";
import { scrapeBeviTabelas } from "../lib/bevi";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const TIPO_PRODUTO: Record<string, string> = {
  "Novo": "EMPRESTIMO_CONSIGNADO",
  "Port": "PORTABILIDADE",
  "Refin": "REFINANCIAMENTO",
  "Port+Refin": "PORTABILIDADE_REFIN",
  "Cartão": "CARTAO_CONSIGNADO",
  "Cartão Benefício": "CARTAO_BENEFICIO",
};

// iCred via Bevi - todas as combinações
const COMBINACOES = [
  { convenio: "INSS", formaContrato: "Novo" },
  { convenio: "INSS", formaContrato: "Port" },
  { convenio: "INSS", formaContrato: "Refin" },
  { convenio: "INSS", formaContrato: "Port+Refin" },
  { convenio: "INSS", formaContrato: "Cartão" },
  { convenio: "INSS", formaContrato: "Cartão Benefício" },
];

async function run() {
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error("Nenhuma empresa encontrada");
  console.log("🏢 Empresa:", empresa.nomeEmpresa);

  const login = "SUB67-103060";
  const senha = "Justo@2024";
  const senhaRelatorio = "@Tabo201";
  
  // Tentar diferentes nomes para iCred no Bevi
  const NOMES_ICRED = ["ICRED", "I CRED", "iCred", "I-CRED"];
  const financeira = "ICRED"; // nome padrão

  // Primeiro, vamos descobrir o nome correto fazendo uma busca
  console.log("🔍 Buscando iCred no Bevi...");
  
  const testResult = await scrapeBeviTabelas(login, senha, senhaRelatorio, {
    financeira: "ICRED",
    convenio: "INSS",
    formaContrato: "Novo",
  });

  if (!testResult.meta.loginOk) {
    console.log("❌ Falha no login do Bevi");
    return;
  }

  console.log(`📊 Teste ICRED INSS Novo: ${testResult.tabelas.length} tabelas`);
  
  if (testResult.tabelas.length === 0) {
    console.log("⚠️ 'ICRED' não encontrou tabelas. Tentando variações...");
    
    for (const nome of NOMES_ICRED.slice(1)) {
      console.log(`  Tentando "${nome}"...`);
      const r = await scrapeBeviTabelas(login, senha, senhaRelatorio, {
        financeira: nome,
        convenio: "INSS",
        formaContrato: "Novo",
      });
      console.log(`  ${nome}: ${r.tabelas.length} tabelas`);
      if (r.tabelas.length > 0) {
        console.log(`✅ Nome correto: "${nome}"`);
        break;
      }
      await sleep(10000);
    }
  }

  // Agora importar todas as combinações
  let banco = await prisma.banco.findFirst({
    where: { empresaId: empresa.id, nome: { contains: "cred", mode: "insensitive" } },
  });
  if (!banco) {
    banco = await prisma.banco.create({
      data: { empresaId: empresa.id, nome: "iCred", tipo: "consignado", tipoBanco: "consignado" },
    });
    console.log("✨ Banco iCred criado");
  }
  console.log(`🏦 Banco: ${banco.nome} (${banco.id})`);

  let totalInseridas = 0, totalAtualizadas = 0, totalErros = 0;

  for (let i = 0; i < COMBINACOES.length; i++) {
    const combo = COMBINACOES[i];
    const label = `iCred ${combo.convenio} ${combo.formaContrato}`;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`🔄 [${i + 1}/${COMBINACOES.length}] ${label}`);
    console.log(`${"═".repeat(60)}`);

    try {
      const result = await scrapeBeviTabelas(login, senha, senhaRelatorio, {
        financeira: "ICRED",
        convenio: combo.convenio,
        formaContrato: combo.formaContrato,
      });

      if (!result.meta.loginOk) {
        console.log("  ❌ Falha no login");
        totalErros++;
        continue;
      }

      if (result.tabelas.length === 0) {
        console.log(`  ⚠️ Nenhuma tabela encontrada — pulando`);
        continue;
      }

      console.log(`  📊 ${result.tabelas.length} tabelas encontradas`);

      // Criar convênio
      let conv = await prisma.convenio.findFirst({
        where: { empresaId: empresa.id, slug: combo.convenio.toLowerCase() },
      });
      if (!conv) {
        conv = await prisma.convenio.create({
          data: { empresaId: empresa.id, nome: combo.convenio, slug: combo.convenio.toLowerCase(), tipo: "federal" },
        });
      }

      // Criar produto
      const tipoProduto = TIPO_PRODUTO[combo.formaContrato] || "EMPRESTIMO_CONSIGNADO";
      let produto = await prisma.produtoCredito.findFirst({
        where: { empresaId: empresa.id, bancoId: banco.id, tipoProduto, convenioId: conv.id },
      });
      if (!produto) {
        produto = await prisma.produtoCredito.create({
          data: {
            empresaId: empresa.id, bancoId: banco.id, convenioId: conv.id,
            nomeProduto: `iCred - ${combo.formaContrato} ${combo.convenio}`,
            tipoProduto,
          },
        });
      }

      // Salvar
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

      console.log(`  ✅ ${inseridas} inseridas, ${atualizadas} atualizadas`);
      totalInseridas += inseridas;
      totalAtualizadas += atualizadas;
    } catch (err: any) {
      console.log(`  ❌ Erro: ${err.message}`);
      totalErros++;
    }

    if (i < COMBINACOES.length - 1) {
      console.log("  ⏳ Aguardando 15s...");
      await sleep(15000);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏁 RESUMO FINAL - iCred`);
  console.log(`   Inseridas: ${totalInseridas}`);
  console.log(`   Atualizadas: ${totalAtualizadas}`);
  console.log(`   Erros: ${totalErros}`);
  console.log(`${"═".repeat(60)}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
