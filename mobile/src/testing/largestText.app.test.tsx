import { fireEvent, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { CatalogScreen } from "@/features/catalog";
import { tabLabelScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { BEER_ID, beer, renderAppRoute, serveApi } from "./appRoutes.app";
import { atLargestFontScale, LARGEST_FONT_SCALE } from "./atLargestFontScale";
import { expectScalesWithText } from "./expectScalesWithText";
import { renderWithLocale } from "./renderWithLocale";

jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }) }));

const LONG_BEER = "Kesäyön erikoisvahva portteri-vehnäolut";
const LONG_BREWERY = "Oluttehtaiden ja panimoiden yhteisomistuksessa toimiva erikoisolutpanimo";
const LONG_STYLE = "Belgian Strong Golden Ale";

type Node = { props: Record<string, unknown>; children: (Node | string)[] | null };
const findNode = (root: unknown, matches: (node: Node) => boolean): Node | undefined => {
  const nodes = Array.isArray(root) ? root : [root];
  for (const node of nodes as (Node | string | null)[]) {
    if (node === null || typeof node === "string") continue;
    if (matches(node)) return node;
    const inside = findNode(node.children ?? [], matches);
    if (inside) return inside;
  }
  return undefined;
};

const transport = jest.fn();

const serveLongNames = () => {
  serveApi(transport);
  const usual = transport.getMockImplementation()!;
  const page = (content: unknown[]) => ({ status: 200, headers: new Headers(), data: { content, page: 0, totalElements: content.length, totalPages: 1 } });
  const long = (id: string, name: string, status = "APPROVED") => beer(id, name, { style: LONG_STYLE, status, brewery: { id: `b${id}`, name: LONG_BREWERY, city: "Jyväskylä", countryCode: "FI" } });
  transport.mockImplementation(async (url: string) => {
    if (url.includes("/api/v1/styles")) return { status: 200, headers: new Headers(), data: ["Gose", LONG_STYLE] };
    if (url.includes("/api/v1/breweries/countries")) return { status: 200, headers: new Headers(), data: ["FI", "GB"] };
    if (url.includes("/api/v1/breweries")) return page([{ id: "b1", name: LONG_BREWERY, city: "Jyväskylä", countryCode: "FI" }]);
    if (url.includes(`/api/v1/beers/${BEER_ID}`)) return { status: 200, headers: new Headers(), data: long(BEER_ID, LONG_BEER) };
    if (url.startsWith("/api/v1/beers")) return page([long("1", LONG_BEER, "PENDING"), long("2", "Gose")]);
    return usual(url);
  });
};

beforeEach(() => {
  transport.mockReset();
  serveLongNames();
  atLargestFontScale();
});
afterEach(() => jest.restoreAllMocks());

describe("at the largest text size, a jest font scale of 3.1", () => {
  it("is the one the phones' accessibility settings reach", () => {
    expect(LARGEST_FONT_SCALE).toBe(3.1);
  });

  it.each(["en", "fi"] as const)("lets the catalog's list and its controls grow, long Finnish names whole, clipping nothing, in %s", async (locale) => {
    await renderWithLocale(<CatalogScreen />, locale);
    await screen.findByText(LONG_BEER);

    expectScalesWithText();
  });

  it.each([
    ["style", /^Style: /, LONG_STYLE],
    ["brewery", /^Brewery: /, LONG_BREWERY],
    ["country", /^Country: /, "United Kingdom"],
  ] as const)("lets the filter sheet's %s picker open grow, clipping nothing", async (_picker, field, option) => {
    await renderAppRoute("/filters-sheet");
    await fireEvent.press(await screen.findByRole("button", { name: field }));
    await screen.findByText(option);

    expectScalesWithText();
  });

  it.each(["en", "fi"] as const)("lets a beer's page, its links and its similar beers grow, clipping nothing, in %s", async (locale) => {
    await renderAppRoute(`/beers/${BEER_ID}`, { locale });
    await screen.findAllByTestId("similar-beer");

    expectScalesWithText();
  });

  it("holds the tab bar's fixed height by capping its labels, which stay beside their pictures and reachable", async () => {
    await renderAppRoute("/catalog");
    await screen.findByText(LONG_BEER);

    const bar = findNode(screen.toJSON(), (node) => (node.children ?? []).some((child) => typeof child !== "string" && child.props.role === "tablist"))!;
    const labels = ["Feed", "Catalog", "Cellar", "Profile"].map((name) => within(screen.getByLabelText(name)).getByText(name));
    const picture = findNode(screen.toJSON(), (node) => node.props.testID === "tab-icon-feed")!;
    const height = (node: Node) => StyleSheet.flatten(node.props.style as never).height as number;
    const supporting = theme.typography.supporting.lineHeight;

    for (const label of labels) {
      expect(label.props.maxFontSizeMultiplier).toBe(tabLabelScale.maxFontSizeMultiplier);
      expect(label.props.allowFontScaling).not.toBe(false);
      expect(label.props.numberOfLines).toBeUndefined();
    }
    expect(height(picture) + supporting * tabLabelScale.maxFontSizeMultiplier).toBeLessThanOrEqual(height(bar));
    expect(height(picture) + supporting * LARGEST_FONT_SCALE).toBeGreaterThan(height(bar));
    for (const name of ["Feed", "Catalog", "Add a beer", "Cellar", "Profile"]) expect(screen.getByLabelText(name)).toBeOnTheScreen();
  });
});
