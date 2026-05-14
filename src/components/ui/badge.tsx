import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
  primary: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  outline: "border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
