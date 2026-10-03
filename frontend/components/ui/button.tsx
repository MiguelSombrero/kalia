import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-border bg-surface text-foreground hover:bg-surface-sunken",
  destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

export const buttonVariants = (variant: ButtonVariant = "primary"): string => {
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border px-4 py-2 text-label font-semibold uppercase transition-colors",
    variantClasses[variant],
  );
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  return <button className={cn(buttonVariants(variant), className)} {...props} />;
};
