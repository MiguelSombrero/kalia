import type { HTMLAttributes, ReactNode } from "react";
import { cardVariants } from "./card";
import { cn } from "@/lib/cn";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  children?: ReactNode;
};

export const EmptyState = ({ title, children, className, ...props }: EmptyStateProps) => {
  return (
    <div className={cn(cardVariants, "border-dashed p-12 text-center", className)} {...props}>
      <p className="text-lg font-medium text-foreground">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
};
