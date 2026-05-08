import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { VendedoresClient } from "./VendedoresClient";

export const metadata = { title: "Equipe e Metas | Kromuz" };

export default async function VendedoresPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao || sessao.perfilSlug !== "admin") redirect("/leads");

  return <VendedoresClient />;
}
