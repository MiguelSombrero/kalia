import type { SVGProps } from "react";
import { cn } from "@/lib/cn";
import { markCells } from "@/lib/kaliaMark";

type KaliaMarkProps = Omit<SVGProps<SVGSVGElement>, "children"> & { label?: string };

export const KaliaMark = ({ label, className, ...props }: KaliaMarkProps) => {
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: false } as const);

  return (
    <svg viewBox="0 0 64 64" className={cn("size-8 shrink-0", className)} {...accessibility} {...props}>
      {markCells.map(({ x, y, size, accent }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={size}
          height={size}
          className={accent ? "fill-primary" : "fill-foreground"}
        />
      ))}
    </svg>
  );
};
