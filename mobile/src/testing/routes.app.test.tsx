import { readdirSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";

import type { AuthState } from "@/lib/auth/tokenStore";

import { type Beers, NOT_SCREENS, renderAppRoute, SCREENS, serveApi } from "./appRoutes.app";
import { inspectStructure } from "./expectAccessibleStructure";

const transport = jest.fn();

type Case = { name: string; file: string; auth?: AuthState; beers?: Beers; ready: () => Promise<unknown>; then?: () => Promise<void> };
const signedIn: AuthState = { status: "signedIn" };
const pickerOf = (field: RegExp, firstOption: RegExp): Pick<Case, "then"> => ({
  then: async () => {
    await fireEvent.press(screen.getByRole("button", { name: field }));
    await screen.findByRole("searchbox");
    await screen.findByText(firstOption);
  },
});
const CASES: Case[] = [
  { name: "the feed", file: "(tabs)/feed.tsx", ready: () => screen.findByRole("heading") },
  { name: "the catalog, with beers", file: "(tabs)/catalog.tsx", ready: () => screen.findByText("Stout") },
  { name: "the catalog, with none", file: "(tabs)/catalog.tsx", beers: "none", ready: () => screen.findByText(/added yet|ei ole vielä lisätty/) },
  { name: "the catalog, failed", file: "(tabs)/catalog.tsx", beers: "fail", ready: () => screen.findByText(/Reference|Viite/) },
  { name: "the cellar signed out", file: "(tabs)/cellar.tsx", ready: () => screen.findByRole("heading") },
  { name: "the cellar signed in", file: "(tabs)/cellar.tsx", auth: signedIn, ready: () => screen.findByRole("heading") },
  { name: "the profile signed out", file: "(tabs)/profile.tsx", ready: () => screen.findByRole("heading") },
  { name: "the profile signed in", file: "(tabs)/profile.tsx", auth: signedIn, ready: () => screen.findByText(/maku/) },
  { name: "the add sheet", file: "add-sheet.tsx", ready: () => screen.findByRole("heading") },
  { name: "the sign-in sheet", file: "sign-in-sheet.tsx", ready: () => screen.findByRole("heading") },
  { name: "the filters sheet", file: "filters-sheet.tsx", ready: () => screen.findByRole("button", { name: /^(Show|Näytä) / }) },
  { name: "the filters sheet's style picker", file: "filters-sheet.tsx", ready: () => screen.findByRole("button", { name: /^(Show|Näytä) / }), ...pickerOf(/^(Style|Tyyli): /, /^Gose$/) },
  { name: "the filters sheet's brewery picker", file: "filters-sheet.tsx", ready: () => screen.findByRole("button", { name: /^(Show|Näytä) / }), ...pickerOf(/^(Brewery|Panimo): /, /^Sinebrychoff$/) },
  { name: "the filters sheet's country picker", file: "filters-sheet.tsx", ready: () => screen.findByRole("button", { name: /^(Show|Näytä) / }), ...pickerOf(/^(Country|Maa): /, /^(Czechia|Tšekki)$/) },
  { name: "a beer's page", file: "beers/[id].tsx", ready: () => screen.findAllByText("Pale Ale") },
  { name: "a beer that is not found", file: "beers/[id].tsx", beers: "missing", ready: () => screen.findByRole("heading") },
];

beforeEach(() => {
  transport.mockReset();
});
afterEach(() => jest.restoreAllMocks());

describe("the app's routes", () => {
  it("are each either a screen this suite renders or a file it says is not one", () => {
    const found = (readdirSync(join(__dirname, "../app"), { recursive: true }) as string[]).filter((file) => /\.tsx?$/.test(file)).sort();

    expect(found).toEqual([...Object.keys(SCREENS), ...NOT_SCREENS].sort());
  });
});

describe.each(["ios", "android"] as const)("every screen under src/app on %s", (platform) => {
  describe.each(["en", "fi"] as const)("in %s", (locale) => {
    it.each(CASES)("has a role and a name on each pressable, none declared too small, and no iOS radio or checkbox: $name", async (case_) => {
      jest.replaceProperty(ReactNative.Platform, "OS", platform);
      serveApi(transport, case_.beers);

      await renderAppRoute(SCREENS[case_.file]!, { locale, auth: case_.auth });
      await case_.ready();
      await case_.then?.();

      const { offences, pressables } = inspectStructure();
      expect(offences).toEqual([]);
      expect(pressables).toBeGreaterThan(0);
    });
  });
});
