export const markInk = "#121212";
export const markAccent = "#2b37c9";
export const markPaper = "#ffffff";

export const markCells = [4, 24, 44].flatMap((y, row) =>
  [4, 24, 44].map((x, column) => ({ x, y, size: 16, accent: row === 0 && column === 2 })),
);
