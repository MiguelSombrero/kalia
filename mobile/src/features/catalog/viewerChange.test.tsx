import { registerTransport, type Transport } from "@kalia/api";
import { act, screen, waitFor } from "@testing-library/react-native";
import { createTokenStore, type OAuthClient, type StoredTokens, type TokenStorage } from "@/lib/auth/tokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CatalogScreen } from "./CatalogScreen";

const START = 1_700_000_000_000;

const beer = (id: string, name: string) => ({
  id,
  name,
  abv: 5,
  style: "IPA",
  brewery: { id: `brewery-${id}`, name: `Brewery ${id}`, countryCode: "FI" },
});
const pageOf = (names: string[]) => ({
  data: { content: names.map((name, i) => beer(`${name}-${i}`, name)), page: 0, totalElements: names.length, totalPages: 1 },
  status: 200,
  headers: new Headers(),
});

const signedInAs = (viewer: string): StoredTokens => ({
  accessToken: `access-${viewer}`,
  refreshToken: `refresh-${viewer}`,
  expiresAt: START + 300_000,
});

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
  const oauth = {
    authorize: jest.fn(),
    refresh: jest.fn(),
    revoke: jest.fn().mockResolvedValue(undefined),
  } satisfies OAuthClient;
  return { oauth, store: createTokenStore({ storage, oauth, now: () => START }) };
};

// The backend adds the caller's own pending beers to the first page (ADR-0091).
const catalogOf = (token: string | undefined) =>
  pageOf(token === "access-A" ? ["Public Lager", "A's pending Stout"] : token === "access-B" ? ["Public Lager", "B's pending Gose"] : ["Public Lager"]);

const transport = jest.fn();

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

const answerAsTheCaller = (store: ReturnType<typeof setup>["store"]) =>
  transport.mockImplementation(async () => catalogOf(await store.getAccessToken()));

describe("a change of viewer", () => {
  it("leaves the next viewer's catalog with none of the last viewer's pending beers", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    answerAsTheCaller(store);
    await renderWithLocale(<CatalogScreen />, "en", store);
    expect(await screen.findByText("A's pending Stout")).toBeOnTheScreen();

    oauth.authorize.mockResolvedValue(grantFor("B"));
    await act(async () => {
      await store.signOut();
      await store.signIn("en");
    });

    expect(await screen.findByText("B's pending Gose")).toBeOnTheScreen();
    expect(screen.queryByText("A's pending Stout")).not.toBeOnTheScreen();
  });

  it("shows a user who has just signed in their own pending beer, not the signed-out page", async () => {
    const { store, oauth } = setup(null);
    answerAsTheCaller(store);
    await renderWithLocale(<CatalogScreen />, "en", store);
    expect(await screen.findByText("Public Lager")).toBeOnTheScreen();
    expect(screen.queryByText("B's pending Gose")).not.toBeOnTheScreen();

    oauth.authorize.mockResolvedValue(grantFor("B"));
    await act(async () => {
      await store.signIn("en");
    });

    expect(await screen.findByText("B's pending Gose")).toBeOnTheScreen();
  });

  it("clears what the last viewer saw when the server refuses a refresh and the session ends", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    answerAsTheCaller(store);
    await renderWithLocale(<CatalogScreen />, "en", store);
    expect(await screen.findByText("A's pending Stout")).toBeOnTheScreen();

    oauth.refresh.mockResolvedValue({ kind: "rejected" });
    await act(async () => {
      await store.refreshAccessToken("access-A");
    });

    await waitFor(() => expect(screen.queryByText("A's pending Stout")).not.toBeOnTheScreen());
    expect(screen.getByText("Public Lager")).toBeOnTheScreen();
  });

  it("ignores an answer that arrives after the viewer changed", async () => {
    const { store, oauth } = setup(signedInAs("A"));
    let answerA: (page: ReturnType<typeof pageOf>) => void = () => undefined;
    transport.mockReturnValueOnce(new Promise((resolve) => (answerA = resolve)));
    transport.mockImplementation(async () => catalogOf(await store.getAccessToken()));
    await renderWithLocale(<CatalogScreen />, "en", store);
    expect(await screen.findByText("Loading beers…")).toBeOnTheScreen();

    oauth.authorize.mockResolvedValue(grantFor("B"));
    await act(async () => {
      await store.signOut();
      await store.signIn("en");
    });
    expect(await screen.findByText("B's pending Gose")).toBeOnTheScreen();

    await act(async () => {
      answerA(catalogOf("access-A"));
    });

    expect(screen.getByText("B's pending Gose")).toBeOnTheScreen();
    expect(screen.queryByText("A's pending Stout")).not.toBeOnTheScreen();
  });

  it("does not discard what the screens fetched while the app was reading the stored sign-in at launch", async () => {
    const { store } = setup(signedInAs("A"));
    answerAsTheCaller(store);

    await renderWithLocale(<CatalogScreen />, "en", store);
    expect(await screen.findByText("A's pending Stout")).toBeOnTheScreen();

    expect(transport).toHaveBeenCalledTimes(1);
  });
});
