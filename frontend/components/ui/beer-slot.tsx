import type { HTMLAttributes } from "react";
import { beerStyleGroup } from "@/lib/beerStyle";
import { cn } from "@/lib/cn";

export type BeerSlotVariant = "band" | "strip";

type BeerSlotProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  variant: BeerSlotVariant;
  beerStyle?: string;
  abv?: number;
};

export const BeerSlot = ({ variant, beerStyle, abv, className, ...props }: BeerSlotProps) => {
  const group = beerStyleGroup(beerStyle ?? "");

  if (variant === "strip") {
    if (beerStyle === undefined) return null;
    return (
      <div
        aria-hidden="true"
        data-beer-style={group}
        className={cn("w-1.5 shrink-0 self-stretch rounded-control border border-border bg-style", className)}
        {...props}
      />
    );
  }

  if (abv === undefined) return null;
  return (
    <div
      aria-hidden="true"
      data-beer-style={group}
      className={cn(
        "@container aspect-[16/7] w-full overflow-hidden rounded-surface border border-border bg-style text-style-foreground",
        className,
      )}
      {...props}
    >
      <div className="flex h-full items-end gap-[2cqw] p-[4cqw]">
        <span className="font-display text-[26cqw] font-extrabold leading-[0.78]">{abv}</span>
        <span className="font-display text-[9cqw] font-extrabold leading-none">%</span>
      </div>
    </div>
  );
};
