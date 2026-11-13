import { countryNameData } from "./countryNames.data";

export const countryName = (code: string, language: string): string => {
  const names: Record<string, string> = language.startsWith("fi") ? countryNameData.fi : countryNameData.en;
  return names[code] ?? code;
};
