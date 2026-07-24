import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-border bg-surface text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
};

export const badgeVariants = (variant: BadgeVariant = "neutral"): string => {
  return cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    variantClasses[variant],
  );
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export const Badge = ({ variant = "neutral", className, ...props }: BadgeProps) => {
  return <span className={cn(badgeVariants(variant), className)} {...props} />;
};
