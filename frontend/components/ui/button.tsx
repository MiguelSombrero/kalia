import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border text-foreground hover:border-primary",
};

export const buttonVariants = (variant: ButtonVariant = "primary"): string => {
  return cn(
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
    variantClasses[variant],
  );
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  return <button className={cn(buttonVariants(variant), className)} {...props} />;
};
