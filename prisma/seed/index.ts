// Seed inicial — popula a empresa demo com bancos consignados, convênios e
// produtos canônicos. Replica os seeds do Base44 (seedConveniosPadrao,
// seedProdutosConsignadoPadrao) já adaptados para o schema Prisma novo.

import { TipoOperacao } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";

const CONVENIOS = [
  { nome: "INSS", slug: "inss", tipo: "federal", descricao: "Aposentados e pensionistas do INSS" },
  { nome: "SIAPE", slug: "siape", tipo: "federal", descricao: "Servidores Públicos Federais" },
  { nome: "FGTS", slug: "fgts", tipo: "federal", descricao: "Antecipação de saque-aniversário do FGTS" },
  { nome: "FORÇAS_ARMADAS", slug: "forcas_armadas", tipo: "federal", descricao: "Marinha, Exército, Aeronáutica" },
  { nome: "ESTADUAL", slug: "estadual", tipo: "estadual", descricao: "Servidores estaduais" },
  { nome: "MUNICIPAL", slug: "municipal", tipo: "municipal", descricao: "Servidores municipais" },
  { nome: "PRIVADO", slug: "privado", tipo: "privado", descricao: "CLT privado" },
] as const;

// Bancos consignados que aparecem nos roteiros operacionais reais (Material de apoio)
const BANCOS = [
  { nome: "BMG", codigo: "318" },
  { nome: "PAN", codigo: "623" },
  { nome: "Facta", codigo: "149" },
  { nome: "Daycoval", codigo: "707" },
  { nome: "BRB", codigo: "070" },
  { nome: "Mercantil", codigo: "389" },
  { nome: "Banrisul", codigo: "041" },
  { nome: "C6 Bank", codigo: "336" },
  { nome: "Digio", codigo: "335" },
  { nome: "iCred", codigo: "329" },
  { nome: "Mais BB", codigo: "079" },
  { nome: "PicPay", codigo: "380" },
  { nome: "Presença Bank", codigo: "292" },
  { nome: "Quero+ Crédito", codigo: "329" },
  { nome: "Safra", codigo: "422" },
  { nome: "Total Cash", codigo: "094" },
  { nome: "VCTEX", codigo: "470" },
  { nome: "Amigoz", codigo: "634" },
  { nome: "Finanto Bank", codigo: "613" },
] as const;

// Produtos canônicos por banco — replica seedProdutosConsignadoPadrao
const PRODUTOS_PADRAO: { tipo: TipoOperacao; nome: string }[] = [
  { tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Consignado" },
  { tipo: "REFINANCIAMENTO", nome: "Refinanciamento" },
  { tipo: "PORTABILIDADE", nome: "Portabilidade" },
  { tipo: "PORTABILIDADE_REFIN", nome: "Port + Refin" },
  { tipo: "CARTAO_CONSIGNADO", nome: "Cartão Consignado" },
  { tipo: "CARTAO_BENEFICIO", nome: "Cartão Benefício" },
];

async function main() {
  console.log("🌱 Seed Kromuz V2 — populando empresa demo");

  const empresa = await prisma.empresa.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      nomeEmpresa: "Kromuz Demo",
      nomeFantasia: "Kromuz",
      planoSlug: "enterprise",
      status: "ativa",
      nivelPlataforma: "rede",
    },
  });
  console.log(`   ✓ Empresa: ${empresa.nomeEmpresa}`);

  // Convênios
  for (const c of CONVENIOS) {
    await prisma.convenio.upsert({
      where: { empresaId_slug: { empresaId: empresa.id, slug: c.slug } },
      update: { nome: c.nome, tipo: c.tipo, descricao: c.descricao },
      create: { empresaId: empresa.id, ...c },
    });
  }
  console.log(`   ✓ ${CONVENIOS.length} convênios`);

  const inss = await prisma.convenio.findUnique({
    where: { empresaId_slug: { empresaId: empresa.id, slug: "inss" } },
  });

  // Bancos + produtos canônicos
  for (const b of BANCOS) {
    const banco = await prisma.banco.upsert({
      where: { empresaId_nome: { empresaId: empresa.id, nome: b.nome } },
      update: { codigoCompe: b.codigo },
      create: {
        empresaId: empresa.id,
        nome: b.nome,
        codigoCompe: b.codigo,
        tipo: "consignado",
        tipoBanco: "consignado",
        ativo: true,
        ativoSimulacao: true,
      },
    });

    if (!inss) continue;
    for (const p of PRODUTOS_PADRAO) {
      const existente = await prisma.produtoCredito.findFirst({
        where: {
          empresaId: empresa.id,
          bancoId: banco.id,
          tipoProduto: p.tipo,
          convenioId: inss.id,
        },
        select: { id: true },
      });
      if (!existente) {
        await prisma.produtoCredito.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            convenioId: inss.id,
            nomeProduto: p.nome,
            tipoProduto: p.tipo,
            ativo: true,
          },
        });
      }
    }

    if (inss) {
      await prisma.bancoConvenio.upsert({
        where: {
          empresaId_bancoId_convenioId: {
            empresaId: empresa.id,
            bancoId: banco.id,
            convenioId: inss.id,
          },
        },
        update: { ativo: true },
        create: {
          empresaId: empresa.id,
          bancoId: banco.id,
          convenioId: inss.id,
          ativo: true,
        },
      });
    }
  }
  console.log(`   ✓ ${BANCOS.length} bancos + ${BANCOS.length * PRODUTOS_PADRAO.length} produtos`);

  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
