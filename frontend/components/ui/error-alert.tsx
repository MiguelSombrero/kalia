import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { cardVariants } from "./card";
import { Icon } from "./icon";

type ErrorAlertProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> & {
  children: ReactNode;
  action?: ReactNode;
};

export const ErrorAlert = ({ children, action, className, ...props }: ErrorAlertProps) => {
  return (
    <div role="alert" className={cn(cardVariants, "flex items-stretch", className)} {...props}>
      <span
        aria-hidden="true"
        className="flex w-12 shrink-0 items-center justify-center border-r border-border bg-destructive text-destructive-foreground"
      >
        <Icon name="close" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <p className="text-sm text-foreground">{children}</p>
        {action}
      </div>
    </div>
  );
};
