import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Skeleton = ({
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  "aria-hidden": _ariaHidden,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-border/60", className)}
      {...props}
    />
  );
};
