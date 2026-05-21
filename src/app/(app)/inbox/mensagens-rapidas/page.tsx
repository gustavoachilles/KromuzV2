import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { MensagensRapidasClient } from "./MensagensRapidasClient";

export const metadata = { title: "Mensagens Rápidas | Kromuz" };

export default async function MensagensRapidasPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  return <MensagensRapidasClient />;
}
