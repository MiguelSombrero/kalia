import { showCatalogWith, takeCatalogLink, useCatalogLink } from "./store";

beforeEach(() => useCatalogLink.setState({ pending: null }));

describe("showCatalogWith", () => {
  it("holds the one filter until the Catalog takes it, and only once", () => {
    showCatalogWith({ style: "IPA" });

    expect(takeCatalogLink()).toEqual({ style: "IPA" });
    expect(takeCatalogLink()).toBeNull();
  });

  it("keeps only the latest of two asks", () => {
    showCatalogWith({ country: "FI" });
    showCatalogWith({ brewery: { id: "b-1", name: "Koskipanimo" } });

    expect(takeCatalogLink()).toEqual({ brewery: { id: "b-1", name: "Koskipanimo" } });
  });
});
