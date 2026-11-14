import { showCatalogWith, useCatalogLink } from "./store";

beforeEach(() => useCatalogLink.setState({ pending: null }));

describe("showCatalogWith", () => {
  it("holds the one filter until the Catalog takes it, and only once", () => {
    showCatalogWith({ style: "IPA" });

    expect(useCatalogLink.getState().take()).toEqual({ style: "IPA" });
    expect(useCatalogLink.getState().take()).toBeNull();
  });

  it("keeps only the latest of two asks", () => {
    showCatalogWith({ country: "FI" });
    showCatalogWith({ brewery: { id: "b-1", name: "Koskipanimo" } });

    expect(useCatalogLink.getState().take()).toEqual({ brewery: { id: "b-1", name: "Koskipanimo" } });
  });
});
