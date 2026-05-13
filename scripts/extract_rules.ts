import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Parse manual do .env para não depender de bibliotecas extras
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}


// Schema z construído baseado no modelo RegraProdutoCredito do Prisma
const RuleSchema = z.object({
  bancoNome: z.string(),
  produtoNome: z.string(),
  tipoOperacao: z.enum([
    'EMPRESTIMO_CONSIGNADO',
    'REFINANCIAMENTO',
    'PORTABILIDADE',
    'PORTABILIDADE_REFIN',
    'CARTAO_CONSIGNADO',
    'CARTAO_BENEFICIO'
  ]),
  // Regras Pessoais
  idadeMinima: z.number().nullable().describe("Idade mínima geral permitida"),
  idadeMaxRepresentante: z.number().nullable().describe("Idade máxima para representante legal, se aplicável"),
  analfabetoPermitido: z.boolean().nullable(),
  
  // Regras de Refinanciamento e Portabilidade
  refinPermitido: z.boolean().nullable(),
  portPermitido: z.boolean().nullable(),
  
  // Regras Financeiras
  taxaMinimaAm: z.number().nullable(),
  taxaMaximaAm: z.number().nullable(),
  prazoMaximo: z.number().nullable(),
  
  // Status (Ativo, Suspenso)
  ativa: z.boolean().describe("Se a operação está ativa ou suspensa/bloqueada"),
  
  // Observações gerais cruciais extraídas
  observacoes: z.string().nullable().describe("Detalhes críticos ou regras especiais (ex: só opera com parcela X, IN204)")
});

async function extractRules() {
  const bevihelpDir = path.join(process.env.HOME || '', 'Documents', 'ANTIGRAVITY', 'BEVIHELP', 'INSS');
  
  // Vamos focar no banco Icred para a prova de conceito
  const icredDir = path.join(bevihelpDir, 'Icred');
  const files = fs.readdirSync(icredDir).filter(f => f.endsWith('.md'));
  
  console.log(`Encontrados ${files.length} arquivos na pasta do Icred.`);
  
  // Selecionando o arquivo de regras gerais
  const mainRuleFile = files.find(f => f.includes('Regras Completas'));
  
  if (!mainRuleFile) {
    console.error("Arquivo de Regras Completas não encontrado para Icred.");
    return;
  }

  const filePath = path.join(icredDir, mainRuleFile);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`\nExtraindo informações via Gemini do arquivo: ${mainRuleFile}...`);
  console.log(`(Certifique-se de que GOOGLE_GENERATIVE_AI_API_KEY esteja no arquivo .env)`);

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: RuleSchema,
      prompt: `
        Você é um especialista em crédito consignado. 
        Analise o texto do manual abaixo (retirado do BeviHelp) e extraia as regras de negócio para o motor de cálculo.
        Se uma informação não existir no texto, retorne null.
        
        Texto do Manual:
        ${content}
      `,
    });

    console.log("\n✅ DADOS EXTRAÍDOS COM SUCESSO (ESTRUTURA PARA PRISMA):");
    console.dir(object, { depth: null, colors: true });
    
  } catch (error) {
    console.error("Erro na extração:", error);
  }
}

extractRules();
