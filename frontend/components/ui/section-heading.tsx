import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SectionHeadingLook = "heading" | "label";

const lookClasses: Record<SectionHeadingLook, string> = {
  heading: "font-display text-heading font-bold",
  label: "text-label font-semibold uppercase",
};

type SectionHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level: 2 | 3;
  look: SectionHeadingLook;
};

export const SectionHeading = ({ level, look, className, ...props }: SectionHeadingProps) => {
  const Heading = level === 3 ? "h3" : "h2";
  return <Heading className={cn(lookClasses[look], "text-foreground", className)} {...props} />;
};
