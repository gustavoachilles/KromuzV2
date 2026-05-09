import { getSessionEmpresa } from "@/lib/session";
import { ImportarLeadsClient } from "./ImportarLeadsClient";

export const metadata = {
  title: "Importar Leads | Kromuz",
  description: "Importe e analise massivamente sua base de clientes.",
};

export default async function ImportarLeadsPage() {
  const sessao = await getSessionEmpresa();

  return <ImportarLeadsClient empresaId={sessao.empresaId} />;
}
