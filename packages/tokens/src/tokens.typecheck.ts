import type { Color, PrimitiveName } from "./tokens";

const correct: Color<PrimitiveName> = { name: "valid", light: "white", dark: "ink-950" };
// @ts-expect-error dark mode is mandatory
const missingMode: Color<PrimitiveName> = { name: "missing", light: "white" };
// @ts-expect-error aliases must name a primitive
const invalidAlias: Color<PrimitiveName> = { name: "invalid", light: "white", dark: "not-a-primitive" };

export { correct, missingMode, invalidAlias };
