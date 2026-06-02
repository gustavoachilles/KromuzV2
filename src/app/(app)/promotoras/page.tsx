import { getSessionEmpresa } from "@/lib/session";
import { redirect } from "next/navigation";
import { PromotorasClient } from "./PromotorasClient";

export const metadata = {
  title: "Cadastro de Promotoras | Kromuz",
};

export default async function PromotorasPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/login");

  return <PromotorasClient />;
}
