import { registerTransport, type Transport } from "@kalia/api";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithLocale } from "@/testing/renderWithLocale";

import { emptyFilters, type Filters } from "../filters/model";
import { beersQuery, useBeers } from "./useBeers";

const transport = jest.fn();

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

type ProbeProps = { filters: Filters; onClient: (client: QueryClient) => void };

const Probe = ({ filters, onClient }: ProbeProps) => {
  onClient(useQueryClient());
  const { beers } = useBeers(filters);
  return <Text>{beers ? `${beers.length} beers` : "loading"}</Text>;
};

describe("the catalog's beer query", () => {
  it("is read from the cache through its factory, under the key the filters make", async () => {
    transport.mockResolvedValue({
      data: { content: [{ id: "1", name: "Pale Ale", abv: 5.2, style: "IPA", brewery: { id: "b1", name: "Koskipanimo", countryCode: "FI" } }], page: 0, totalElements: 1, totalPages: 1 },
      status: 200,
      headers: new Headers(),
    });
    const filters = { ...emptyFilters(), style: "IPA" };
    let client: QueryClient | undefined;

    await renderWithLocale(<Probe filters={filters} onClient={(found) => (client = found)} />);
    await screen.findByText("1 beers");

    expect(client?.getQueryData(beersQuery(filters).queryKey)?.pages[0]?.content[0]?.name).toBe("Pale Ale");
    expect(client?.getQueryData(beersQuery(emptyFilters()).queryKey)).toBeUndefined();
    expect(beersQuery(filters).queryKey).toEqual(["catalog", "beers", expect.objectContaining({ style: "IPA" })]);
  });
});
