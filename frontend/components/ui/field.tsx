import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export const fieldClasses =
  "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-destructive";

type FieldErrorProps = Omit<HTMLAttributes<HTMLParagraphElement>, "children"> & { children: ReactNode };

export const FieldError = ({ className, children, ...props }: FieldErrorProps) => {
  return (
    <p className={cn("mt-2 flex items-start gap-2 text-sm text-foreground", className)} {...props}>
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center bg-destructive text-destructive-foreground"
      >
        <Icon name="close" strokeWidth={3} className="size-3" />
      </span>
      <span>{children}</span>
    </p>
  );
};
