import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { OrcamentoClient } from "./OrcamentoClient";

export const metadata = { title: "Orçamento | Budget Control | Kromuz" };

export default async function OrcamentoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");

  return <OrcamentoClient />;
}
