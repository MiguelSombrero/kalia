import { render } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useAnnounce } from "./useAnnounce";

const Probe = ({ message }: { message: string }) => {
  useAnnounce(message);
  return null;
};

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => undefined);
beforeEach(() => announce.mockClear());

describe("useAnnounce", () => {
  it("has the screen reader say a message once when it appears, and again only when it changes", async () => {
    const { rerender } = await render(<Probe message="No beers match your search." />);
    expect(announce.mock.calls).toEqual([["No beers match your search."]]);

    await rerender(<Probe message="No beers match your search." />);
    expect(announce).toHaveBeenCalledTimes(1);

    await rerender(<Probe message="Couldn't load beers." />);
    expect(announce.mock.calls).toEqual([["No beers match your search."], ["Couldn't load beers."]]);
  });

  it("says nothing for an empty message", async () => {
    await render(<Probe message="" />);

    expect(announce).not.toHaveBeenCalled();
  });
});
