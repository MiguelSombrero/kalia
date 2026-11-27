import { apiError, registerTransport, type Transport } from "@kalia/api";
import type { Locale } from "@kalia/locales";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import TabsLayout, { unstable_settings } from "@/app/(tabs)/_layout";
import AddRoute from "@/app/(tabs)/add";
import CatalogRoute from "@/app/(tabs)/catalog";
import CellarLayout, { unstable_settings as cellarSettings } from "@/app/(tabs)/cellar/_layout";
import CellarEntryRoute from "@/app/(tabs)/cellar/[id]";
import CellarRoute from "@/app/(tabs)/cellar/index";
import FeedRoute from "@/app/(tabs)/feed";
import TabsIndex from "@/app/(tabs)/index";
import ProfileRoute from "@/app/(tabs)/profile";
import AddSheet from "@/app/add-sheet";
import BeerPage from "@/app/beers/[id]";
import FiltersSheetRoute from "@/app/filters-sheet";
import SignInSheetRoute from "@/app/sign-in-sheet";
import type { AuthState } from "@/lib/auth/tokenStore";
import { AppProviders } from "@/lib/providers/AppProviders";

import { entryOf } from "./cellarEntries";
import { fakeTokenStore } from "./fakeTokenStore";

export const BEER_ID = "6f1c2f6e-8f1e-4a0e-9a54-0f4a7e0b1c11";

export const SCREENS: Record<string, string> = {
  "(tabs)/feed.tsx": "/feed",
  "(tabs)/catalog.tsx": "/catalog",
  "(tabs)/cellar/index.tsx": "/cellar",
  "(tabs)/cellar/[id].tsx": "/cellar/1",
  "(tabs)/profile.tsx": "/profile",
  "add-sheet.tsx": "/add-sheet",
  "filters-sheet.tsx": "/filters-sheet",
  "sign-in-sheet.tsx": "/sign-in-sheet",
  "beers/[id].tsx": `/beers/${BEER_ID}`,
};
export const NOT_SCREENS = ["_layout.tsx", "(tabs)/_layout.tsx", "(tabs)/cellar/_layout.tsx", "(tabs)/index.tsx", "(tabs)/add.tsx", "+native-intent.ts"];

const reply = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
export const beer = (id: string, name: string, over: Record<string, unknown> = {}) => ({ id, name, abv: 5.2, style: "IPA", status: "APPROVED", brewery: { id: "b1", name: "Sinebrychoff", countryCode: "FI", city: "Helsinki" }, ...over });
const page = (content: unknown[]) => ({ content, page: 0, totalElements: content.length, totalPages: 1 });

export type Beers = "some" | "none" | "fail" | "missing";

export const serveApi = (transport: jest.Mock, beers: Beers = "some") => {
  transport.mockImplementation(async (url: string) => {
    if (url.includes("/api/v1/styles")) return reply(200, ["Gose", "IPA", "Stout"]);
    if (url.includes("/api/v1/breweries/countries")) return reply(200, ["CZ", "FI"]);
    if (url.includes("/api/v1/breweries")) return reply(200, page([{ id: "b1", name: "Sinebrychoff", countryCode: "FI", city: "Helsinki" }]));
    if (url.includes("/api/v1/profile")) return reply(200, { username: "maku", cellarPublic: false });
    if (url.includes("/api/v1/cellar")) return reply(200, [entryOf({ id: "1", name: "Aamunkoi Hefeweizen" })]);
    if (beers === "fail") throw apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" });
    if (beers === "missing" && url.includes(BEER_ID)) return reply(404, { title: "Not found" });
    if (url.includes(`/api/v1/beers/${BEER_ID}`)) return reply(200, beer(BEER_ID, "Pale Ale"));
    if (beers === "none") return reply(200, page([]));
    return reply(200, page([beer("1", "Pale Ale"), beer("2", "Stout", { status: "PENDING" })]));
  });
  registerTransport(transport as unknown as Transport);
};

export const renderAppRoute = async (url: string, { locale = "en", auth = { status: "signedOut", expired: false } }: { locale?: Locale; auth?: AuthState } = {}) => {
  const store = fakeTokenStore(auth);
  const Layout = () => (
    <AppProviders locale={locale} tokenStore={store}>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
  return renderRouter(
    {
      _layout: Layout,
      "(tabs)/_layout": { default: TabsLayout, unstable_settings },
      "(tabs)/index": TabsIndex,
      "(tabs)/add": AddRoute,
      "(tabs)/feed": FeedRoute,
      "(tabs)/catalog": CatalogRoute,
      "(tabs)/cellar/_layout": { default: CellarLayout, unstable_settings: cellarSettings },
      "(tabs)/cellar/index": CellarRoute,
      "(tabs)/cellar/[id]": CellarEntryRoute,
      "(tabs)/profile": ProfileRoute,
      "add-sheet": AddSheet,
      "filters-sheet": FiltersSheetRoute,
      "sign-in-sheet": SignInSheetRoute,
      "beers/[id]": BeerPage,
    },
    { initialUrl: url },
  );
};
