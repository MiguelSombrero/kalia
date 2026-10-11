import { ImageResponse } from "next/og";
import { markSvg } from "./kaliaMark";

export const kaliaMarkImage = (px: number) =>
  new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders through Satori, not the browser; next/image does not apply
      <img src={`data:image/svg+xml;base64,${btoa(markSvg())}`} width={px} height={px} alt="" />
    ),
    { width: px, height: px },
  );
