import { expect } from "@playwright/test";

export type Rgb = [number, number, number];

// A color-mix() computes to `color(srgb r g b)` with channels from 0 to 1.
export const rgbOf = (css: string): Rgb => {
  const hex = css.trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) return hex.slice(1).map((h) => parseInt(h, 16)) as Rgb;
  const channels = css.match(/[\d.]+/g);
  expect(channels, `cannot read colour ${css}`).not.toBeNull();
  const scale = css.startsWith("color(") ? 255 : 1;
  return channels!.slice(0, 3).map((c) => Number(c) * scale) as Rgb;
};

export const contrast = (a: Rgb, b: Rgb): number => {
  const luminance = (c: Rgb) => {
    const [r, g, b2] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
