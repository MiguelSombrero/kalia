// brewedDate is a LocalDate ("YYYY-MM-DD"); slicing avoids Date parsing
// pulling in a timezone the value never carried.
export const vintageYear = (brewedDate?: string): string | undefined => brewedDate?.slice(0, 4);
