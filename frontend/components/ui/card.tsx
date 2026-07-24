import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const cardVariants = "rounded-lg border border-border bg-surface";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn(cardVariants, "p-4", className)} {...props} />;
};
