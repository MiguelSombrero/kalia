import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-primary-foreground enabled:hover:bg-primary/90",
  outline: "border-border bg-surface text-foreground enabled:hover:bg-surface-sunken",
  destructive: "border-destructive bg-destructive text-destructive-foreground enabled:hover:bg-destructive/90",
};

/** `compact` is for a control repeated on every row of a list. */
export type ButtonSize = "default" | "compact";

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-10 px-4 py-2",
  compact: "min-h-8 px-2.5 py-1.5",
};

export const buttonVariants = (variant: ButtonVariant = "primary", size: ButtonSize = "default"): string => {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control border text-label font-semibold uppercase motion-safe:transition-colors",
    "data-pending:cursor-progress data-pending:opacity-75",
    sizeClasses[size],
    variantClasses[variant],
  );
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Its form's request is in flight (docs/design.md, Feedback and errors). */
  pending?: boolean;
};

export const Button = ({ variant = "primary", size = "default", pending = false, disabled, className, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants(variant, size), className)}
      {...props}
      disabled={pending || disabled}
      data-pending={pending || undefined}
    />
  );
};
