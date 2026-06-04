import { Metadata } from "next";
import ClientesClient from "./ClientesClient";

export const metadata: Metadata = {
  title: "Clientes | Kromuz",
  description: "Gestão da carteira de clientes",
};

export default function ClientesPage() {
  return <ClientesClient />;
}
