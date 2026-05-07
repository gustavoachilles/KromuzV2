import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE SAÍDA DA INTELIGÊNCIA ARTIFICIAL (HISCON INSS)
// ─────────────────────────────────────────────────────────────────────────────

export const ContratoAtivoSchema = z.object({
  banco: z.string().describe("Nome da instituição financeira (ex: BMG, Itaú, Pan)"),
  valor_parcela: z.number().describe("Valor da parcela mensal"),
  taxa_juros_mensal: z.number().describe("Taxa de juros ao mês do contrato. Ex: 1.66"),
  parcelas_pagas: z.number().describe("Quantidade de parcelas já descontadas/pagas"),
  prazo_total: z.number().describe("Quantidade total de parcelas do contrato (ex: 84)"),
  saldo_devedor_estimado: z.number().describe("Saldo devedor ou valor para quitação"),
  data_averbacao: z.string().optional().describe("Data em que o contrato foi averbado (YYYY-MM-DD)")
});

export const ExtratoHisconSchema = z.object({
  dados_cliente: z.object({
    nome: z.string().describe("Nome do beneficiário"),
    idade: z.number().describe("Idade calculada com base na data de nascimento"),
    uf: z.string().describe("Sigla do estado de residência (ex: SP, RJ)"),
    especie_beneficio: z.number().describe("Código da espécie do benefício INSS (ex: 41, 42, 32, 21)"),
    possui_representante_legal: z.boolean().describe("Se o benefício é gerido por tutor, curador ou procurador"),
    data_despacho_beneficio: z.string().describe("Data de início do benefício ou DDB (YYYY-MM-DD)"),
    
    margens: z.object({
      emprestimo_livre: z.number().describe("Valor de margem disponível para novo empréstimo"),
      cartao_rmc_livre: z.number().describe("Valor de margem disponível para cartão de crédito (RMC)"),
      cartao_rcc_livre: z.number().describe("Valor de margem disponível para cartão benefício (RCC)")
    })
  }),
  contratos_ativos: z.array(ContratoAtivoSchema).describe("Lista de todos os empréstimos ativos no extrato")
});

export type ExtratoHisconRaw = z.infer<typeof ExtratoHisconSchema>;
