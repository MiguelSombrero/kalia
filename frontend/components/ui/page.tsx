import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type PageWidth = "text" | "wide" | "narrow";

export const shellFrame = "mx-auto w-full max-w-5xl px-4 md:px-8";

const widthClasses: Record<PageWidth, string> = {
  text: "max-w-3xl",
  wide: "max-w-5xl",
  narrow: "max-w-md",
};

type PageProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  width?: PageWidth;
  children: React.ReactNode;
};

export const Page = ({ width = "text", className, children, ...props }: PageProps) => {
  // The skip link's target (WCAG technique SCR28): tabIndex={-1} makes <main>
  // focusable so the jump moves focus, not only the scroll position. scroll-mt
  // keeps it clear of the sticky header, which would otherwise cover it.
  return (
    <main
      {...props}
      id="main-content"
      tabIndex={-1}
      className={cn("flex-1 scroll-mt-14 py-6 md:py-12", shellFrame)}
    >
      <div className={cn("flex flex-col gap-6 md:gap-8", widthClasses[width], className)}>
        {children}
      </div>
    </main>
  );
};
