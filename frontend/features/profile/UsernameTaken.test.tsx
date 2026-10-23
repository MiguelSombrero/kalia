import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { UsernameTaken } from "./UsernameTaken";

describe("UsernameTaken", () => {
  it("tells the newcomer their username is taken and offers a way out", async () => {
    const { container } = render(
      await UsernameTaken({ locale: "en", username: "ada", signOut: <button type="button">Sign out</button> }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "This username is taken" })).toBeInTheDocument();
    expect(screen.getByText("The username ada already belongs to another Kalia account.")).toBeInTheDocument();
    expect(screen.getByText("Sign out if you want to use Kalia with a different account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in Finnish with no a11y violations", async () => {
    const { container } = render(
      await UsernameTaken({ locale: "fi", username: "ada", signOut: <button type="button">Kirjaudu ulos</button> }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "Käyttäjänimi on varattu" })).toBeInTheDocument();
    expect(screen.getByText("Käyttäjänimi ada kuuluu jo toiselle Kalia-tilille.")).toBeInTheDocument();
    expect(screen.getByText("Kirjaudu ulos, jos haluat käyttää Kaliaa toisella tilillä.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirjaudu ulos" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
