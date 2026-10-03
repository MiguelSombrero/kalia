import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/initials";

export type PersonSlotSize = "sm" | "md" | "lg";

const sizeClasses: Record<PersonSlotSize, string> = {
  sm: "size-9 text-label",
  md: "size-12 text-base",
  lg: "size-24 text-title",
};

type PersonSlotProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  username: string;
  size?: PersonSlotSize;
};

export const PersonSlot = ({ username, size = "md", className, ...props }: PersonSlotProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-surface border border-border bg-surface font-display font-bold text-foreground",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {initialsOf(username)}
    </div>
  );
};
