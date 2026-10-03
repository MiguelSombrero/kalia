import { kaliaMarkImage } from "@/lib/kaliaMarkImage";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const Icon = () => kaliaMarkImage(size.width);

export default Icon;
