import { prisma } from './src/lib/prisma';

/**
 * SEED BEVIHELP — Dados reais extraídos do BeviHelp (Zendesk) em Maio/2026.
 * Taxas, prazos, idades, parcelas mínimas e restrições reais por banco.
 */

// Fonte: BEVIHELP/INSS/Resumos/16 - Taxa de Juros por Banco e Produto
// Fonte: BEVIHELP/INSS/Resumos/15 - Idade Mínima e Máxima
// Fonte: BEVIHELP/INSS/Resumos/14 - Portabilidade e Refin Portabilidade
// Fonte: BEVIHELP/INSS/Resumos/13 - Refinanciamento de Carteira
// Fonte: BEVIHELP/INSS/Resumos/12 - Margem Livre Novo

interface BancoBeviHelp {
  nome: string;
  taxaEmprestimo: number;      // a.m.
  taxaPortabilidade: number | null;
  taxaCartaoRMC: number | null;
  taxaCartaoRCC: number | null;
  prazoMaxEmprestimo: number;
  idadeMin: number;
  idadeMaxQuitacao: number;
  portPermitido: boolean;
  portParcelasMin: number;
  refinPermitido: boolean;
  refinParcelasMin: number;
  fatorSaldo: number;
  ativo: boolean;
  portRefin: boolean;
}

const BANCOS_BEVIHELP: BancoBeviHelp[] = [
  // Ativos com portabilidade
  { nome: "Banrisul",       taxaEmprestimo: 1.83, taxaPortabilidade: 1.83, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 72, portPermitido: true,  portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.72, ativo: true,  portRefin: false },
  { nome: "C6 Bank",        taxaEmprestimo: 1.80, taxaPortabilidade: 1.80, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 77, portPermitido: true,  portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: true },
  { nome: "Facta",          taxaEmprestimo: 1.83, taxaPortabilidade: 1.83, taxaCartaoRMC: 2.49, taxaCartaoRCC: 2.49, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 73, portPermitido: true,  portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: true },
  { nome: "NBC Bank",       taxaEmprestimo: 1.80, taxaPortabilidade: 1.80, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 78, portPermitido: true,  portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: true },
  { nome: "Presença Bank",  taxaEmprestimo: 1.80, taxaPortabilidade: 1.80, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: true,  portParcelasMin: 0,  refinPermitido: true,  refinParcelasMin: 0,  fatorSaldo: 0.74, ativo: true,  portRefin: true },
  { nome: "Total Cash",     taxaEmprestimo: 1.80, taxaPortabilidade: 1.52, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: true,  portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.74, ativo: true,  portRefin: true },
  { nome: "Cred Capital",   taxaEmprestimo: 1.76, taxaPortabilidade: 1.76, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 96, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: true,  portParcelasMin: 0,  refinPermitido: true,  refinParcelasMin: 0,  fatorSaldo: 0.74, ativo: true,  portRefin: true },

  // Ativos sem portabilidade (represada/suspensa)
  { nome: "Daycoval",       taxaEmprestimo: 1.80, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 68, portPermitido: false, portParcelasMin: 12, refinPermitido: true,  refinParcelasMin: 12, fatorSaldo: 0.85, ativo: true,  portRefin: false },
  { nome: "BMG",            taxaEmprestimo: 1.84, taxaPortabilidade: null, taxaCartaoRMC: 2.49, taxaCartaoRCC: 2.49, prazoMaxEmprestimo: 84, idadeMin: 21, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.72, ativo: true,  portRefin: false },
  { nome: "BRB",            taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 12, refinPermitido: true,  refinParcelasMin: 12, fatorSaldo: 0.73, ativo: true,  portRefin: false },
  { nome: "Digio",          taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.74, ativo: true,  portRefin: false },
  { nome: "Finanto Bank",   taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 75, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: false },
  { nome: "iCred",          taxaEmprestimo: 1.80, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.74, ativo: true,  portRefin: false },
  { nome: "Pan",            taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 65, portPermitido: false, portParcelasMin: 6,  refinPermitido: true,  refinParcelasMin: 6,  fatorSaldo: 0.74, ativo: true,  portRefin: false },
  { nome: "PicPay",         taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: false },
  { nome: "Quero Mais",     taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: false },
  { nome: "Safra",          taxaEmprestimo: 1.83, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 21, idadeMaxQuitacao: 70, portPermitido: false, portParcelasMin: 12, refinPermitido: true,  refinParcelasMin: 12, fatorSaldo: 0.72, ativo: true,  portRefin: false },
  { nome: "Mercantil",      taxaEmprestimo: 1.85, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: false },
  { nome: "VCTeX",          taxaEmprestimo: 1.80, taxaPortabilidade: null, taxaCartaoRMC: null, taxaCartaoRCC: null, prazoMaxEmprestimo: 84, idadeMin: 18, idadeMaxQuitacao: 80, portPermitido: false, portParcelasMin: 6,  refinPermitido: false, refinParcelasMin: 6,  fatorSaldo: 0.73, ativo: true,  portRefin: false },
];

// Espécies aceitas globalmente (fonte: Resumo 06)
const ESPECIES_EMPRESTIMO = [1, 2, 3, 4, 5, 6, 21, 32, 33, 41, 42, 46, 57, 72, 78, 81, 91, 92, 93];

/**
 * Calcula coeficiente com base na taxa mensal e prazo.
 * Fórmula Price: coef = i / (1 - (1+i)^(-n))
 */
function calcularCoeficiente(taxaMensal: number, prazo: number): number {
  const i = taxaMensal / 100;
  return i / (1 - Math.pow(1 + i, -prazo));
}

async function seed() {
  console.log("🚀 SEED BEVIHELP — Inserindo dados reais dos bancos INSS...\n");

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    console.log("❌ Nenhuma empresa encontrada. Cadastre uma empresa primeiro.");
    return;
  }

  const inss = await prisma.convenio.findFirst({
    where: { empresaId: empresa.id, slug: "inss" }
  });

  // 1. Desativa TODOS os bancos, produtos, regras e tabelas antigos (genéricos do seed anterior)
  console.log("🗑️  Desativando dados genéricos do seed anterior...");
  await prisma.regraProdutoCredito.updateMany({
    where: { empresaId: empresa.id },
    data: { ativa: false }
  });
  await prisma.tabelaCoeficiente.updateMany({
    where: { empresaId: empresa.id },
    data: { ativo: false }
  });
  await prisma.banco.updateMany({
    where: { empresaId: empresa.id },
    data: { ativoSimulacao: false }
  });

  let totalRegras = 0;
  let totalTabelas = 0;

  for (const b of BANCOS_BEVIHELP) {
    console.log(`\n🏦 ${b.nome}`);

    // 2. Upsert Banco
    let banco = await prisma.banco.findFirst({
      where: { empresaId: empresa.id, nome: b.nome }
    });

    if (!banco) {
      banco = await prisma.banco.create({
        data: {
          empresaId: empresa.id,
          nome: b.nome,
          tipo: "consignado",
          tipoBanco: "consignado",
          status: b.ativo ? "ativo" : "inativo",
          fatorSaldo: b.fatorSaldo,
          ativoSimulacao: b.ativo,
        }
      });
      console.log(`   ✅ Banco criado`);
    } else {
      await prisma.banco.update({
        where: { id: banco.id },
        data: {
          fatorSaldo: b.fatorSaldo,
          ativoSimulacao: b.ativo,
          status: b.ativo ? "ativo" : "inativo",
        }
      });
      console.log(`   ♻️  Banco atualizado`);
    }

    // 3. Definir Produtos
    const produtos: { tipo: string; nome: string; taxa: number }[] = [];
    
    // Empréstimo novo (todos têm)
    produtos.push({ tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Novo", taxa: b.taxaEmprestimo });

    // Portabilidade (só se permitido E tem taxa)
    if (b.portPermitido && b.taxaPortabilidade) {
      produtos.push({ tipo: "PORTABILIDADE", nome: "Portabilidade", taxa: b.taxaPortabilidade });
    }

    // Refinanciamento (mesmo banco)
    if (b.refinPermitido) {
      produtos.push({ tipo: "REFINANCIAMENTO", nome: "Refinanciamento", taxa: b.taxaEmprestimo });
    }

    // Port + Refin
    if (b.portRefin && b.portPermitido && b.taxaPortabilidade) {
      produtos.push({ tipo: "PORTABILIDADE_REFIN", nome: "Port + Refin", taxa: b.taxaPortabilidade });
    }

    // Cartão Consignado (RMC)
    if (b.taxaCartaoRMC) {
      produtos.push({ tipo: "CARTAO_CONSIGNADO", nome: "Cartão Consignado", taxa: b.taxaCartaoRMC });
    }

    // Cartão Benefício (RCC)
    if (b.taxaCartaoRCC) {
      produtos.push({ tipo: "CARTAO_BENEFICIO", nome: "Cartão Benefício", taxa: b.taxaCartaoRCC });
    }

    for (const prod of produtos) {
      // 4. Upsert Produto
      let produto = await prisma.produtoCredito.findFirst({
        where: { empresaId: empresa.id, bancoId: banco.id, tipoProduto: prod.tipo as any }
      });

      if (!produto) {
        produto = await prisma.produtoCredito.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            convenioId: inss?.id,
            nomeProduto: prod.nome,
            tipoProduto: prod.tipo as any,
            ativo: true
          }
        });
      } else {
        await prisma.produtoCredito.update({
          where: { id: produto.id },
          data: { ativo: true }
        });
      }

      // 5. Inserir Tabela de Coeficiente com taxa REAL
      const prazo = b.prazoMaxEmprestimo;
      const coeficiente = calcularCoeficiente(prod.taxa, prazo);

      const tabelaExistente = await prisma.tabelaCoeficiente.findFirst({
        where: { bancoId: banco.id, produtoId: produto.id, prazo: prazo }
      });

      if (!tabelaExistente) {
        await prisma.tabelaCoeficiente.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            produtoId: produto.id,
            convenioId: inss?.id,
            nome: `${b.nome} - ${prod.nome} ${prazo}x (${prod.taxa}%)`,
            prazo: prazo,
            taxaJurosMensal: prod.taxa,
            coeficiente: Number(coeficiente.toFixed(8)),
            ativo: true
          }
        });
        totalTabelas++;
      } else {
        await prisma.tabelaCoeficiente.update({
          where: { id: tabelaExistente.id },
          data: {
            taxaJurosMensal: prod.taxa,
            coeficiente: Number(coeficiente.toFixed(8)),
            ativo: true,
            nome: `${b.nome} - ${prod.nome} ${prazo}x (${prod.taxa}%)`,
          }
        });
      }

      // 6. Inserir Regra com dados REAIS
      const regraExistente = await prisma.regraProdutoCredito.findFirst({
        where: { bancoId: banco.id, produtoId: produto.id }
      });

      const regraData = {
        empresaId: empresa.id,
        bancoId: banco.id,
        bancoNome: banco.nome,
        produtoId: produto.id,
        produtoNome: produto.nomeProduto,
        tipoOperacao: prod.tipo as any,
        ativa: true,
        prioridade: 1,
        taxaMinimaAm: 1.0,
        taxaMaximaAm: prod.taxa,
        trocoMinimoLiberado: 100,
        margemNovaValorMin: 200,
        portPermitido: prod.tipo.includes("PORTABILIDADE") ? b.portPermitido : undefined,
        portParcelasMinPagas: prod.tipo.includes("PORTABILIDADE") ? b.portParcelasMin : undefined,
        portValorMin: 500,
        refinPermitido: prod.tipo.includes("REFINANCIAMENTO") ? b.refinPermitido : undefined,
        refinParcelasMinPagas: prod.tipo.includes("REFINANCIAMENTO") ? b.refinParcelasMin : undefined,
        refinValorMin: 500,
        refinTrocoMin: 100,
        faixasEtarias: [{ idade_min: b.idadeMin, idade_max: b.idadeMaxQuitacao }],
        especies: { aceitas: ESPECIES_EMPRESTIMO },
      };

      if (!regraExistente) {
        await prisma.regraProdutoCredito.create({ data: regraData });
        totalRegras++;
      } else {
        await prisma.regraProdutoCredito.update({
          where: { id: regraExistente.id },
          data: { ...regraData, ativa: true }
        });
      }

      console.log(`   📋 ${prod.tipo} → ${prod.taxa}% a.m. | Coef: ${coeficiente.toFixed(6)} | Prazo: ${prazo}x`);
    }
  }

  console.log(`\n✨ SEED CONCLUÍDO!`);
  console.log(`   🏦 ${BANCOS_BEVIHELP.length} bancos processados`);
  console.log(`   📋 ${totalRegras} regras criadas`);
  console.log(`   📊 ${totalTabelas} tabelas de coeficiente criadas`);
  console.log(`   🔒 Dados genéricos desativados`);
}

seed()
  .catch((e) => {
    console.error("❌ Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
