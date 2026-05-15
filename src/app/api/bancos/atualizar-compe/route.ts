import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// Mapa de bancos com COMPE e tipo
const BANCOS_DADOS: Record<string, { compe: string; tipo: string }> = {
  "Amigoz":         { compe: "",    tipo: "consignado" },
  "Banco do Brasil":{ compe: "001", tipo: "rede" },
  "Banrisul":       { compe: "041", tipo: "rede" },
  "BMG":            { compe: "318", tipo: "consignado" },
  "Bradesco":       { compe: "237", tipo: "rede" },
  "BRB":            { compe: "070", tipo: "rede" },
  "C6 Bank":        { compe: "336", tipo: "consignado" },
  "Caixa":          { compe: "104", tipo: "rede" },
  "Daycoval":       { compe: "707", tipo: "consignado" },
  "Digio":          { compe: "335", tipo: "consignado" },
  "Facta":          { compe: "149", tipo: "consignado" },
  "Finanto Bank":   { compe: "",    tipo: "consignado" },
  "iCred":          { compe: "",    tipo: "consignado" },
  "Itaú":           { compe: "341", tipo: "rede" },
  "Mais BB":        { compe: "",    tipo: "rede" },
  "Mercantil":      { compe: "389", tipo: "rede" },
  "PAN":            { compe: "623", tipo: "consignado" },
  "PicPay":         { compe: "380", tipo: "consignado" },
  "Presença Bank":  { compe: "",    tipo: "consignado" },
  "Quero Mais":     { compe: "",    tipo: "consignado" },
  "Safra":          { compe: "422", tipo: "rede" },
  "Sabemi":         { compe: "",    tipo: "consignado" },
  "Zema":           { compe: "",    tipo: "consignado" },
  "Paraná Banco":   { compe: "254", tipo: "consignado" },
  "Cetelem":        { compe: "",    tipo: "consignado" },
  "Ole Consignado": { compe: "",    tipo: "consignado" },
  "Master":         { compe: "243", tipo: "consignado" },
  "Crefisa":        { compe: "069", tipo: "consignado" },
  "V8":             { compe: "",    tipo: "consignado" },
};

// POST /api/bancos/atualizar-compe — atualiza COMPE e tipo de todos os bancos
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (sessao.perfilSlug !== "admin") return Response.json({ error: "Sem permissão" }, { status: 403 });

  const bancos = await prisma.banco.findMany({
    where: { empresaId: sessao.empresaId },
  });

  const resultados: string[] = [];

  for (const banco of bancos) {
    const dados = BANCOS_DADOS[banco.nome];
    if (dados) {
      await prisma.banco.update({
        where: { id: banco.id },
        data: {
          codigoCompe: dados.compe || banco.codigoCompe,
          tipoBanco: dados.tipo,
          tipo: dados.tipo,
        },
      });
      resultados.push(`✅ ${banco.nome} → COMPE: ${dados.compe || "N/A"} | Tipo: ${dados.tipo}`);
    } else {
      resultados.push(`⚠️ ${banco.nome} → Não encontrado no mapa`);
    }
  }

  return Response.json({ ok: true, resultados, total: bancos.length });
}
