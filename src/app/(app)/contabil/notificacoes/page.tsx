import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { NotificacoesClient } from "./NotificacoesClient";

export const metadata = { title: "Central de Alertas | Kromuz" };

export default async function NotificacoesPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <NotificacoesClient />;
}
