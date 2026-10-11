import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-control bg-divider", className)}
    />
  );
};
