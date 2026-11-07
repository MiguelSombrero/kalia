type Size = "sm" | "lg";

const classes: Record<Size, string> = { sm: "p-1", lg: "p-4" };

export const probe = (size: Size) => classes[size];
