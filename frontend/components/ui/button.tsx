import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-border bg-surface text-foreground hover:bg-surface-sunken",
  destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

/** `compact` is for a control repeated on every row of a list. */
export type ButtonSize = "default" | "compact";

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-10 px-4 py-2",
  compact: "min-h-8 px-2.5 py-1.5",
};

export const buttonVariants = (variant: ButtonVariant = "primary", size: ButtonSize = "default"): string => {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control border text-label font-semibold uppercase transition-colors",
    sizeClasses[size],
    variantClasses[variant],
  );
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export const Button = ({ variant = "primary", size = "default", className, ...props }: ButtonProps) => {
  return <button className={cn(buttonVariants(variant, size), className)} {...props} />;
};
