import { apiError } from "@kalia/api";
import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { EmptyState } from "./EmptyState";
import { ErrorAlert } from "./ErrorAlert";
import { LoadingState } from "./LoadingState";

afterEach(() => jest.restoreAllMocks());

describe("LoadingState", () => {
  it.each(MODES)("says what is loading, quietly, in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<LoadingState label="Ladataan oluita…" />, "fi");

    expect(screen.getByText("Ladataan oluita…")).toHaveStyle({ color: theme.colors[mode]["muted-foreground"] });
  });

  it("draws as many placeholders as it is asked for, and none by default", async () => {
    await renderWithLocale(<LoadingState label="Loading beers…" placeholders={3} />);
    expect(screen.getByTestId("loading-placeholders").children).toHaveLength(3);

    await renderWithLocale(<LoadingState label="Loading your profile…" />);
    expect(screen.getByText("Loading your profile…")).toBeOnTheScreen();
    expect(screen.queryByTestId("loading-placeholders")).not.toBeOnTheScreen();
  });
});

describe("ErrorAlert", () => {
  it.each(MODES)("says what failed, names the request and offers a retry in %s", async (mode) => {
    systemIs(mode);
    const onRetry = jest.fn();
    const error = apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" });
    await renderWithLocale(<ErrorAlert message="Oluiden lataus ei onnistunut." error={error} onRetry={onRetry} />, "fi");

    expect(screen.getByText("Oluiden lataus ei onnistunut.")).toHaveStyle({ color: theme.colors[mode].destructive });
    expect(screen.getByText("Viite: 0af7651916cd43dd8448eb211c80319c")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Yritä uudelleen" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("writes no reference when the error has none, and holds its retry while retrying", async () => {
    const onRetry = jest.fn();
    await renderWithLocale(<ErrorAlert message="Couldn't load your profile." error={new Error("x")} onRetry={onRetry} retrying />);

    expect(screen.queryByText(/Reference/)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  });

  it("keeps its message and retry at the largest text size", async () => {
    await withLargestFont(async () => {
      await renderWithLocale(<ErrorAlert message="Oluiden lataus ei onnistunut." error={new Error("x")} onRetry={() => undefined} />, "fi");

      expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeOnTheScreen();
      expectScalesWithText();
    });
  });
});

describe("EmptyState", () => {
  it.each(MODES)("says there is nothing, quietly, in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<EmptyState message="Oluita ei ole vielä lisätty." />, "fi");

    expect(screen.getByText("Oluita ei ole vielä lisätty.")).toHaveStyle({ color: theme.colors[mode]["muted-foreground"] });
  });

  it("carries a way forward when it is given one", async () => {
    await renderWithLocale(
      <EmptyState message="No beers yet.">
        <Text>add one</Text>
      </EmptyState>,
    );

    expect(screen.getByText("add one")).toBeOnTheScreen();
  });
});
