import { registerTransport, type Transport } from "@kalia/api";
import { act, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createTokenStore, type OAuthClient, type StoredTokens, type TokenStorage } from "@/lib/auth/tokenStore";
import { entryOf } from "@/testing/cellarEntries";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarScreen } from "./CellarScreen";

jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }) }));

const START = 1_700_000_000_000;
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

const signedInAs = (viewer: string): StoredTokens => ({ accessToken: `access-${viewer}`, refreshToken: `refresh-${viewer}`, expiresAt: START + 300_000 });
const grantFor = (viewer: string) => ({
  kind: "granted" as const,
  grant: { accessToken: `access-${viewer}`, refreshToken: `refresh-${viewer}`, expiresInSeconds: 300 },
});

const setup = (initial: StoredTokens | null) => {
  let persisted = initial;
  const storage: TokenStorage = {
    load: async () => persisted,
    save: async (tokens) => {
      persisted = tokens;
    },
    clear: async () => {
      persisted = null;
    },
  };
  const oauth = { authorize: jest.fn(), refresh: jest.fn(), revoke: jest.fn().mockResolvedValue(undefined) } satisfies OAuthClient;
  return { oauth, store: createTokenStore({ storage, oauth, now: () => START }) };
};

const cellarOf = (token: string | undefined) => ({
  data: token === "access-A" ? [entryOf({ id: "a", name: "A's Stout" })] : token === "access-B" ? [entryOf({ id: "b", name: "B's Gose" })] : [],
  status: 200,
  headers: new Headers(),
});

const transport = jest.fn();
const renderCellar = (store: ReturnType<typeof setup>["store"]) =>
  renderWithLocale(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CellarScreen />
    </SafeAreaProvider>,
    "en",
    store,
  );

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

describe("a change of viewer", () => {
  it("leaves the next viewer's cellar with none of the last viewer's beers", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    transport.mockImplementation(async () => cellarOf(await store.getAccessToken()));
    await renderCellar(store);
    expect(await screen.findByText("A's Stout")).toBeOnTheScreen();

    oauth.authorize.mockResolvedValue(grantFor("B"));
    await act(async () => {
      await store.signOut();
      await store.signIn("en");
    });

    expect(await screen.findByText("B's Gose")).toBeOnTheScreen();
    expect(screen.queryByText("A's Stout")).not.toBeOnTheScreen();
  });

  it("shows the signed-out invitation, not the last viewer's cellar, once the session ends", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    transport.mockImplementation(async () => cellarOf(await store.getAccessToken()));
    await renderCellar(store);
    expect(await screen.findByText("A's Stout")).toBeOnTheScreen();

    oauth.refresh.mockResolvedValue({ kind: "rejected" });
    await act(async () => {
      await store.refreshAccessToken("access-A");
    });

    await waitFor(() => expect(screen.queryByText("A's Stout")).not.toBeOnTheScreen());
    expect(screen.getByText("Keep track of the bottles you own.")).toBeOnTheScreen();
  });

  it("ignores an answer that arrives after the viewer changed", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    let answerA: (page: ReturnType<typeof cellarOf>) => void = () => undefined;
    transport.mockReturnValueOnce(new Promise((resolve) => (answerA = resolve)));
    transport.mockImplementation(async () => cellarOf(await store.getAccessToken()));
    await renderCellar(store);
    expect(await screen.findByText("Loading your cellar…")).toBeOnTheScreen();

    oauth.authorize.mockResolvedValue(grantFor("B"));
    await act(async () => {
      await store.signOut();
      await store.signIn("en");
    });
    expect(await screen.findByText("B's Gose")).toBeOnTheScreen();

    await act(async () => {
      answerA(cellarOf("access-A"));
    });

    expect(screen.getByText("B's Gose")).toBeOnTheScreen();
    expect(screen.queryByText("A's Stout")).not.toBeOnTheScreen();
  });
});
