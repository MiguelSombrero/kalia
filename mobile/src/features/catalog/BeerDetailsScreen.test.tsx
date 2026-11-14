import { registerTransport, type Transport } from "@kalia/api";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack } from "expo-router";
import { Text } from "react-native";
import { AppProviders } from "@/lib/providers/AppProviders";
import { redirectAuthCallback } from "@/lib/auth/redirectAuthCallback";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { BeerDetailsScreen } from "./BeerDetailsScreen";

const ID = "6f1c2f6e-8f1e-4a0e-9a54-0f4a7e0b1c11";
const OTHER = "0a9c2f6e-8f1e-4a0e-9a54-0f4a7e0b1c22";

const transport = jest.fn();
const reply = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const beer = (id: string, name: string) => ({ id, name, abv: 5, style: "IPA", status: "APPROVED", brewery: { id: "b1", name: "Sinebrychoff", countryCode: "FI" } });

const signedOut = fakeTokenStore({ status: "signedOut", expired: false });
const Layout = () => (
  <AppProviders locale="en" tokenStore={signedOut}>
    <Stack screenOptions={{ headerShown: false }} />
  </AppProviders>
);

const renderApp = (initialUrl: string) =>
  renderRouter(
    {
      _layout: { default: Layout, unstable_settings: { anchor: "(tabs)" } },
      "(tabs)/_layout": { default: () => <Stack screenOptions={{ headerShown: false }} />, unstable_settings: { anchor: "catalog" } },
      "(tabs)/catalog": () => <Text role="heading">Catalog root</Text>,
      "(tabs)/profile": () => <Text role="heading">Profile root</Text>,
      "beers/[id]": BeerDetailsScreen,
    },
    { initialUrl },
  );

beforeEach(() => {
  transport.mockReset();
  transport.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/v1/beers/")) return reply(200, beer(url.split("/").pop()!, url.includes(OTHER) ? "Porter" : "Pale Ale"));
    return reply(200, { content: [{ ...beer(OTHER, "Porter"), abv: 6 }], page: 0, totalElements: 1, totalPages: 1 });
  });
  registerTransport(transport as unknown as Transport);
});

describe("a beer's deep link", () => {
  it("opens the beer for a signed-out visitor, with the Catalog root beneath it", async () => {
    await renderApp(`/beers/${ID}`);

    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(screen.queryByText("Sign in")).toBeNull();
  });

  it("returns to the Catalog root when the sheet is closed", async () => {
    await renderApp(`/beers/${ID}`);
    await screen.findByText("Pale Ale");

    await fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByRole("heading", { name: "Catalog root" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/catalog");
  });

  it("replaces the content with a tapped similar beer, and one closing still returns to the Catalog", async () => {
    await renderApp(`/beers/${ID}`);
    await fireEvent.press(await screen.findByRole("button", { name: /^Porter,/ }));

    expect(await screen.findByRole("heading", { name: "Beer" })).toBeOnTheScreen();
    expect(await screen.findByText("Porter")).toBeOnTheScreen();
    expect(screen).toHavePathname(`/beers/${OTHER}`);

    await fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByRole("heading", { name: "Catalog root" })).toBeOnTheScreen();
  });

  it("is not taken for the sign-in return, which still goes to the Profile tab", () => {
    expect(redirectAuthCallback(`kalia://beers/${ID}`)).toBe(`kalia://beers/${ID}`);
    expect(redirectAuthCallback("kalia://auth/callback?code=abc")).toBe("/profile");
  });
});
