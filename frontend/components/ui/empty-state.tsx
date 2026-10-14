import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionHeading } from "./section-heading";

type EmptyStateProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: string;
  headingLevel: 2 | 3;
  hint: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

export const EmptyState = ({ title, headingLevel, hint, action, children, className, ...props }: EmptyStateProps) => {
  return (
    <section className={cn("flex flex-col items-start gap-4 border-t border-border pt-6", className)} {...props}>
      <SectionHeading level={headingLevel} look="heading">
        {title}
      </SectionHeading>
      <p className="max-w-prose text-muted-foreground">{hint}</p>
      {children}
      {action}
    </section>
  );
};
