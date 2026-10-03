import { ImageResponse } from "next/og";
import { markAccent, markCells, markInk, markPaper } from "./kaliaMark";

export const kaliaMarkImage = (px: number) =>
  new ImageResponse(
    (
      <svg width={px} height={px} viewBox="0 0 64 64">
        <rect width="64" height="64" fill={markPaper} />
        {markCells.map(({ x, y, size, accent }) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={size} height={size} fill={accent ? markAccent : markInk} />
        ))}
      </svg>
    ),
    { width: px, height: px },
  );
