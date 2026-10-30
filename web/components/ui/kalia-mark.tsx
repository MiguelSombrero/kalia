import type { SVGProps } from "react";
import { cn } from "@/lib/cn";
import { type MarkPaint, type MarkShape, markShapes } from "@/lib/kaliaMark";

type KaliaMarkProps = Omit<SVGProps<SVGSVGElement>, "children"> & { label?: string };

const fills: Record<Exclude<MarkPaint, "streak" | "bottle">, string> = {
  tile: "fill-mark-tile",
  beer: "fill-mark-beer",
  foam: "fill-mark-foam",
};

const strokes: Record<Extract<MarkPaint, "streak" | "bottle">, string> = {
  streak: "stroke-mark-streak",
  bottle: "stroke-mark-bottle",
};

const Shape = ({ shape }: { shape: MarkShape }) => {
  switch (shape.kind) {
    case "rect":
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} className={fills[shape.paint]} />;
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} className={fills[shape.paint]} />;
    case "fill":
      return (
        <path d={shape.d} transform={shape.transform} fillOpacity={shape.opacity} className={fills[shape.paint]} />
      );
    case "line":
      return (
        <path
          d={shape.d}
          transform={shape.transform}
          fill="none"
          strokeWidth={shape.width}
          strokeLinejoin="round"
          className={strokes[shape.paint]}
        />
      );
  }
};

export const KaliaMark = ({ label, className, ...props }: KaliaMarkProps) => {
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: false } as const);

  return (
    <svg viewBox="0 0 64 64" className={cn("size-8 shrink-0", className)} {...accessibility} {...props}>
      {markShapes.map((shape, index) => (
        <Shape key={index} shape={shape} />
      ))}
    </svg>
  );
};
