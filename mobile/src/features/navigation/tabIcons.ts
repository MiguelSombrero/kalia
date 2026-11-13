/** The pill a selected tab's picture sits on, and so the box every tab's picture is laid out in. */
export const ICON_BOX = { width: 56, height: 32 } as const;

export type TabIconName = "feed" | "catalog" | "cellar" | "profile";

/** One drawing on a 24-unit grid: the outline of an unselected tab, and the filled picture of the selected one with what is cut out of it. */
export type TabIconDrawing = {
  outline: readonly string[];
  filled: { shapes: readonly string[]; stroked: boolean; cuts: readonly string[] };
};

const n = (value: number) => Math.round(value * 100) / 100;
const circle = (cx: number, cy: number, r: number) => `M${n(cx - r)} ${cy}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0z`;

const BOTTLE = "M10 3h4v4c0 1.2 3 2.4 3 5.5V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6.5C7 9.4 10 8.2 10 7z";
const BARREL = "M6.5 3h11c2.2 3 2.2 15 0 18h-11C4.3 18 4.3 6 6.5 3z";
const GLINT = "M5.9 13.9A3.3 3.3 0 0 1 7.9 11.9";

export const tabIcons: Record<TabIconName, TabIconDrawing> = {
  feed: {
    outline: [circle(9, 15, 6), GLINT, circle(18.2, 7, 3), circle(6.5, 3.8, 1.4)],
    filled: { shapes: [circle(9, 15, 7), circle(18.2, 7, 4), circle(6.5, 3.8, 2.4)], stroked: false, cuts: [GLINT] },
  },
  catalog: {
    outline: [BOTTLE, "M7 14h10"],
    filled: { shapes: [BOTTLE], stroked: true, cuts: ["M7 14h10"] },
  },
  cellar: {
    outline: [BARREL, "M4.8 8.5h14.4M4.8 15.5h14.4"],
    filled: { shapes: [BARREL], stroked: true, cuts: ["M6.8 8.5h10.4M6.8 15.5h10.4"] },
  },
  profile: {
    outline: [circle(12, 8, 4), "M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"],
    filled: { shapes: [circle(12, 8, 4), "M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5z"], stroked: true, cuts: [] },
  },
};

export const ADD_GLYPH = "M12 5v14M5 12h14";
