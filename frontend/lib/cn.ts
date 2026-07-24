type ClassValue = string | false | null | undefined;

export const cn = (...classes: ClassValue[]): string => {
  return classes.filter((value): value is string => Boolean(value)).join(" ");
};
