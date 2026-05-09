"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Render Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
        ⚠️
      </div>
      <h2 className="text-xl font-bold mb-2 text-white">Oops! Algo deu errado no Dashboard.</h2>
      <div className="bg-red-950/50 border border-red-900/50 p-4 rounded-lg mb-6 max-w-lg text-left overflow-auto">
        <p className="text-red-300 font-mono text-sm">{error.message}</p>
        {error.stack && (
           <pre className="text-red-400/50 font-mono text-xs mt-2 whitespace-pre-wrap">{error.stack}</pre>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-medium transition"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
