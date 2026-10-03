export const markInk = "#121212"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markAccent = "#2b37c9"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css
export const markPaper = "#ffffff"; // token-exception: ImageResponse cannot read CSS; kaliaMark.test.ts pins it to globals.css

export const markCells = [4, 24, 44].flatMap((y, row) =>
  [4, 24, 44].map((x, column) => ({ x, y, size: 16, accent: row === 0 && column === 2 })),
);
