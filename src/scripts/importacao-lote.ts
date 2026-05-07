import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { extrairRegrasDePdf } from "../lib/motor-regras/extrair";
import { salvarRegrasNoBanco } from "../lib/motor-regras/salvar";

dotenv.config();

const DIR_ROTEIROS = path.resolve(
  __dirname,
  "../../../../Material de apoio regras roteiros"
);
const LOG_FILE = path.resolve(__dirname, "../../relatorio-importacao.json");

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== INICIANDO BULK IMPORT DE ROTEIROS ===");
  console.log(`Diretório: ${DIR_ROTEIROS}`);

  // 1. Pega a primeira empresa para associar os dados
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    console.error("ERRO: Nenhuma empresa encontrada no banco de dados.");
    process.exit(1);
  }
  console.log(`Usando empresa: ${empresa.nomeEmpresa} (ID: ${empresa.id})`);

  // 2. Lista os PDFs (não recursivo no momento, apenas os da raiz do diretório)
  if (!fs.existsSync(DIR_ROTEIROS)) {
    console.error("ERRO: Diretório não encontrado!");
    process.exit(1);
  }

  const files = fs.readdirSync(DIR_ROTEIROS).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Encontrados ${files.length} arquivos PDF.\n`);

  const relatorio: any[] = [];

  // 3. Processamento sequencial (LIMITADO A 2 PARA TESTE INICIAL)
  const filesToProcess = files.slice(0, 2);
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const filePath = path.join(DIR_ROTEIROS, file);
    const logPrefix = `[${i + 1}/${filesToProcess.length}] ${file}`;
    console.log(`\n▶ PROCESSANDO: ${logPrefix}`);

    try {
      const buffer = fs.readFileSync(filePath);

      // Cria um registro de importação no banco para vincular logs
      const importacao = await prisma.importacaoPDF.create({
        data: {
          empresaId: empresa.id,
          nomeArquivo: file,
          status: "extraindo",
          etapa: "Enviando para IA via CLI",
          arquivoUrl: "local_file",
        },
      });

      console.log(`  └ Enviando para IA... (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
      const resultadoIa = await extrairRegrasDePdf({ pdfBuffer: buffer });

      if (!resultadoIa.ok) {
        const errorMsg = (resultadoIa as any).error || "Erro desconhecido";
        console.error(`  └ ❌ Falha na IA: ${errorMsg}`);
        await prisma.importacaoPDF.update({
          where: { id: importacao.id },
          data: { status: "erro", erro: errorMsg, etapa: "Falha na extração" },
        });
        relatorio.push({ file, status: "erro", etapa: "ia", error: errorMsg });
        continue;
      }

      console.log(`  └ IA OK! Banco: ${resultadoIa.banco_nome} | ${resultadoIa.regras.length} regras encontradas.`);

      const resultadoSalvar = await salvarRegrasNoBanco({
        empresaId: empresa.id,
        bancoNomeInput: resultadoIa.banco_nome,
        importacaoPdfId: importacao.id,
        regras: resultadoIa.regras,
      });

      if (!resultadoSalvar.ok) {
        console.error(`  └ ❌ Falha ao salvar no banco: ${resultadoSalvar.error}`);
        await prisma.importacaoPDF.update({
          where: { id: importacao.id },
          data: { status: "erro", erro: resultadoSalvar.error, etapa: "Falha ao salvar banco de dados" },
        });
        relatorio.push({ file, status: "erro", etapa: "banco", error: resultadoSalvar.error });
        continue;
      }

      console.log(`  └ ✅ Sucesso! ${resultadoSalvar.salvas?.length} regras salvas.`);
      await prisma.importacaoPDF.update({
        where: { id: importacao.id },
        data: {
          status: "sucesso",
          etapa: "Concluído",
          resultado: resultadoIa as any,
        },
      });

      relatorio.push({
        file,
        status: "sucesso",
        banco: resultadoIa.banco_nome,
        regras: resultadoSalvar.salvas?.length,
      });

    } catch (e: any) {
      console.error(`  └ ❌ Erro fatal: ${e.message}`);
      relatorio.push({ file, status: "erro fatal", error: e.message });
    }

    // Rate Limiting: Aguarda 10 segundos antes do próximo arquivo
    if (i < files.length - 1) {
      console.log("  └ ⏳ Aguardando 10s para respeitar limites da API (Rate Limit)...");
      await wait(10000);
    }
  }

  console.log("\n=== BULK IMPORT CONCLUÍDO ===");
  const sucessos = relatorio.filter((r) => r.status === "sucesso").length;
  console.log(`Sucessos: ${sucessos} | Erros: ${files.length - sucessos}`);

  fs.writeFileSync(LOG_FILE, JSON.stringify(relatorio, null, 2));
  console.log(`Relatório salvo em: ${LOG_FILE}`);
}

run().catch(console.error);
