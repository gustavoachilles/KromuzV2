"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root Render Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
        💥
      </div>
      <h2 className="text-xl font-bold mb-2 text-white">Erro Fatal Crítico (Root)</h2>
      <div className="bg-red-950/50 border border-red-900/50 p-4 rounded-lg mb-6 max-w-2xl text-left overflow-auto w-full">
        <p className="text-red-300 font-mono text-sm">{error.message}</p>
        {error.stack && (
           <pre className="text-red-400/50 font-mono text-xs mt-2 whitespace-pre-wrap">{error.stack}</pre>
        )}
      </div>
      <button
        onClick={() => window.location.href = '/login'}
        className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-medium transition"
      >
        Voltar para Login
      </button>
    </div>
  );
}
