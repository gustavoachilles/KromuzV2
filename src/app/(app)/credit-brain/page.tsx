import { Suspense } from "react";
import CreditBrainClient from "./CreditBrainClient";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionEmpresa } from "@/lib/session";

export default async function CreditBrainPage() {
  const sessao = await getSessionEmpresa();

  return (
    <div className="flex flex-col gap-6 p-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credit Brain</h1>
        <p className="text-muted-foreground">
          Motor de enquadramento inteligente e ranking de aprovação.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="w-full h-[600px] rounded-xl" />}>
        <CreditBrainClient empresaId={sessao.empresaId} />
      </Suspense>
    </div>
  );
}
