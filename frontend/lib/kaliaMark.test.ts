import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markAccent, markCells, markInk, markPaper } from "./kaliaMark";

const read = (file: string): string => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("the mark's raw values", () => {
  it("are the ink and cobalt primitives in globals.css", () => {
    const css = read("app/globals.css");

    expect(css).toContain(`--ink-950: ${markInk};`);
    expect(css).toContain(`--cobalt-700: ${markAccent};`);
    expect(css).toContain(`--white: ${markPaper};`);
  });

  it("are the rack app/icon.svg draws, cell for cell", () => {
    const drawn = [...read("app/icon.svg").matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="\d+" fill="(#\w+)"\/>/g)].map(
      ([, x, y, size, fill]) => ({ x: +x, y: +y, size: +size, fill }),
    );

    expect(drawn).toEqual(
      markCells.map(({ x, y, size, accent }) => ({ x, y, size, fill: accent ? markAccent : markInk })),
    );
  });

  it("are nine cells with exactly one accent", () => {
    expect(markCells).toHaveLength(9);
    expect(markCells.filter((cell) => cell.accent)).toHaveLength(1);
  });
});
