export const markTile = "#005b57"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markBeer = "#ffd84a"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markStreak = "#f2b900"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markBottle = "#ff7a59"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markFoam = "#ffffff"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css

type FillPaint = "tile" | "beer" | "foam";
type LinePaint = "streak" | "bottle";
export type MarkPaint = FillPaint | LinePaint;

export const markPaints: Record<MarkPaint, string> = {
  tile: markTile,
  beer: markBeer,
  streak: markStreak,
  bottle: markBottle,
  foam: markFoam,
};

export type MarkShape =
  | { kind: "rect"; paint: FillPaint; x: number; y: number; width: number; height: number }
  | { kind: "circle"; paint: FillPaint; cx: number; cy: number; r: number }
  | { kind: "fill"; paint: FillPaint; d: string; transform?: string; opacity?: number }
  | { kind: "line"; paint: LinePaint; d: string; width: number; transform?: string };

const bottle = "M0 -7 H22 C 26 -7, 27 -2.6, 30 -2.6 H38 V-3.3 H40.5 V3.3 H38 V2.6 H30 C 27 2.6, 26 7, 22 7 H0 Z";
// Do not change `tipped` alone: the air above the beer and the stream's first two points are computed from it.
const tipped = "translate(4.5 7.6) rotate(24)";
const airAboveTheBeer = "M7.35 1.2 L25.98 9.5 L3.65 9.5 Z";

const foam = (cx: number, cy: number, r: number): MarkShape => ({ kind: "circle", paint: "foam", cx, cy, r });

export const markShapes: readonly MarkShape[] = [
  { kind: "rect", paint: "tile", x: 0, y: 0, width: 64, height: 64 },
  { kind: "fill", paint: "beer", d: bottle, transform: tipped },
  { kind: "fill", paint: "tile", d: airAboveTheBeer },
  { kind: "fill", paint: "foam", d: airAboveTheBeer, opacity: 0.18 },
  {
    kind: "fill",
    paint: "beer",
    d: "M42.84 21.06 C 47.84 22.06, 52.5 31.54, 52.5 51 L 39 51 C 39 40.24, 39.66 31.87, 40.16 27.09 Z",
  },
  { kind: "line", paint: "streak", d: "M43.5 27 C 44.1 34, 44.3 39, 44.3 49", width: 1.2 },
  { kind: "line", paint: "streak", d: "M48 26.5 C 48.6 33.5, 48.8 39, 48.8 49", width: 1.2 },
  { kind: "line", paint: "bottle", d: bottle, width: 2.4, transform: tipped },
  foam(45, 54.5, 11.5),
  foam(31, 58.5, 8.5),
  foam(57.5, 56.5, 9),
  foam(20, 62, 6.5),
  foam(64, 62, 6),
  { kind: "rect", paint: "foam", x: 20, y: 60, width: 44, height: 4 },
  foam(35, 46, 1.7),
  foam(58, 44.5, 1.5),
  foam(31.5, 50.5, 1.2),
  foam(55, 41, 1.1),
];

const svgOf = (shape: MarkShape): string => {
  const paint = markPaints[shape.paint];
  switch (shape.kind) {
    case "rect":
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${paint}"/>`;
    case "circle":
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${paint}"/>`;
    case "fill":
      return `<path d="${shape.d}"${shape.transform ? ` transform="${shape.transform}"` : ""}${shape.opacity === undefined ? "" : ` fill-opacity="${shape.opacity}"`} fill="${paint}"/>`;
    case "line":
      return `<path d="${shape.d}"${shape.transform ? ` transform="${shape.transform}"` : ""} fill="none" stroke="${paint}" stroke-width="${shape.width}" stroke-linejoin="round"/>`;
  }
};

export const markSvg = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${markShapes.map(svgOf).join("")}</svg>`;
