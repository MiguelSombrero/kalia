import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

export type IconName = "menu" | "close" | "search" | "plus" | "arrow" | "back" | "check";

const shapes: Record<IconName, ReactNode> = {
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  search: (
    <>
      <rect x="4" y="4" width="12" height="12" />
      <path d="M16 16l5 5" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  arrow: <path d="M4 12h16M13 5l7 7-7 7" />,
  back: <path d="M20 12H4M11 5l-7 7 7 7" />,
  check: <path d="M4 12l5 5L20 6" />,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "name"> & {
  name: IconName;
  label?: string;
};

export const Icon = ({ name, label, className, ...props }: IconProps) => {
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: false } as const);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      className={cn("size-5 shrink-0", className)}
      {...accessibility}
      {...props}
    >
      {shapes[name]}
    </svg>
  );
};
