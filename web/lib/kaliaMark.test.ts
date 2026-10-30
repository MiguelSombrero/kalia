import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markBeer, markBottle, markFoam, markShapes, markStreak, markSvg, markTile } from "./kaliaMark";

const read = (file: string): string => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("the mark's raw values", () => {
  it("are the primitives globals.css gives the mark's own tokens", () => {
    const css = read("app/globals.css");

    expect(css).toContain(`--teal-800: ${markTile};`);
    expect(css).toContain(`--sun-300: ${markBeer};`);
    expect(css).toContain(`--sun-500: ${markStreak};`);
    expect(css).toContain(`--coral-400: ${markBottle};`);
    expect(css).toContain(`--white: ${markFoam};`);
    expect(css).toContain("--mark-tile: var(--teal-800);");
    expect(css).toContain("--mark-beer: var(--sun-300);");
    expect(css).toContain("--mark-streak: var(--sun-500);");
    expect(css).toContain("--mark-bottle: var(--coral-400);");
    expect(css).toContain("--mark-foam: var(--white);");
  });

  it("are the drawing app/icon.svg holds, shape for shape", () => {
    expect(read("app/icon.svg").trim()).toBe(markSvg());
  });
});

describe("the drawing", () => {
  it("fills the whole square with the tile, so it is its own compact form", () => {
    expect(markShapes[0]).toEqual({ kind: "rect", paint: "tile", x: 0, y: 0, width: 64, height: 64 });
  });

  it("outlines the bottle over the beer it holds and under the foam it pours into", () => {
    const order = markShapes.map((shape) => `${shape.kind}:${shape.paint}`);
    const outline = order.indexOf("line:bottle");

    expect(order.indexOf("fill:beer")).toBeLessThan(outline);
    expect(order.indexOf("circle:foam")).toBeGreaterThan(outline);
  });
});
