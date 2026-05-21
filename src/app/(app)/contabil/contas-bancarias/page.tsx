import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { ContasBancariasClient } from "./ContasBancariasClient";

export const metadata = { title: "Contas Bancárias | Kromuz" };

export default async function ContasBancariasPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");

  return <ContasBancariasClient />;
}
