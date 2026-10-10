import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "accent" | "style" | "ink";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface text-foreground",
  accent: "bg-accent text-accent-foreground",
  style: "bg-style text-style-foreground",
  ink: "border-foreground bg-foreground text-background",
};

export const badgeVariants = (variant: BadgeVariant = "neutral"): string => {
  return cn(
    "inline-flex items-center rounded-control border border-border px-2 py-0.5 text-label font-semibold uppercase",
    variantClasses[variant],
  );
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export const Badge = ({ variant = "neutral", className, ...props }: BadgeProps) => {
  return <span className={cn(badgeVariants(variant), className)} {...props} />;
};
