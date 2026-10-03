import { describe, expect, it } from "vitest";
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("takes the first letter of up to two parts, split on anything that is not a letter", () => {
    expect(initialsOf("mikko.virtanen")).toBe("MV");
    expect(initialsOf("olutharrastaja_88")).toBe("O");
    expect(initialsOf("j_k-lehto")).toBe("JK");
    expect(initialsOf("anna maria liisa")).toBe("AM");
  });

  it("is a single capital for a single-word name", () => {
    expect(initialsOf("kellarimestari")).toBe("K");
    expect(initialsOf("Aino")).toBe("A");
  });

  it("keeps non-ASCII letters whole", () => {
    expect(initialsOf("ösa.äijä")).toBe("ÖÄ");
  });

  it("does not split a name at a combining accent or widen a letter that uppercases to two", () => {
    expect(initialsOf("e\u0301lan")).toBe("E");
    expect(initialsOf("\u00dfeta")).toBe("S");
  });

  it("falls back to the first character when the name holds no letters", () => {
    expect(initialsOf("88")).toBe("8");
    expect(initialsOf("")).toBe("");
  });
});
