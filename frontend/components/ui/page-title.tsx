import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type PageTitleSize = "page" | "name";

const sizeClasses: Record<PageTitleSize, string> = {
  page: "font-extrabold text-balance md:text-display",
  name: "font-bold md:text-name",
};

type PageTitleProps = HTMLAttributes<HTMLHeadingElement> & { size?: PageTitleSize };

export const PageTitle = ({ size = "page", className, children, ...props }: PageTitleProps) => {
  return (
    <h1
      className={cn("font-display text-title text-foreground", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </h1>
  );
};
