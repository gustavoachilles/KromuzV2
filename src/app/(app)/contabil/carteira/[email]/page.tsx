import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { ExtratoVendedorClient } from "./ExtratoVendedorClient";

export const metadata = { title: "Extrato do Vendedor | Kromuz" };

export default async function ExtratoPage({ params }: { params: Promise<{ email: string }> }) {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");

  const { email } = await params;

  return <ExtratoVendedorClient email={decodeURIComponent(email)} />;
}
