import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { PatrimonioClient } from "./PatrimonioClient";

export const metadata = { title: "Patrimônio | Ativo Imobilizado | Kromuz" };

export default async function PatrimonioPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <PatrimonioClient />;
}
