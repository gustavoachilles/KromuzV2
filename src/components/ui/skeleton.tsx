"use client";

import { motion } from "framer-motion";

/** Bloco skeleton animado com shimmer */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** Skeleton de KPI card (usado em dashboards) */
export function SkeletonKPI({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton de tabela (usado em listagens) */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className={`h-3 ${i === 0 ? "w-20" : i === 1 ? "w-32 flex-1" : "w-16"}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-zinc-50 dark:border-zinc-800/30">
          {Array.from({ length: cols }).map((_, j) => (
            <Shimmer key={j} className={`h-4 ${j === 0 ? "w-20" : j === 1 ? "w-40 flex-1" : j === cols - 1 ? "w-12" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton de cards em grid (usado em categorias, patrimônio) */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-3 w-20" />
            </div>
          </div>
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton de gráfico de barras (dashboard) */
export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
      <Shimmer className="h-4 w-40 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Shimmer className={`w-full rounded-t-lg`} style={{ height: `${20 + Math.random() * 60}%` }} />
            <Shimmer className="h-2 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de lista de notificações */
export function SkeletonAlerts({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-start gap-4">
          <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton de página inteira (header + KPIs + tabela) */
export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-8 w-64" />
          <Shimmer className="h-3 w-96" />
        </div>
        <SkeletonKPI />
        <SkeletonTable />
      </div>
    </div>
  );
}
