import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { haptic } from "./haptics";

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

const notify = jest.mocked(Haptics.notificationAsync);

beforeEach(() => notify.mockReset().mockResolvedValue(undefined));

describe("haptic", () => {
  it.each(["success", "warning", "error"] as const)("taps the %s pattern where there is a motor", (outcome) => {
    haptic(outcome);

    expect(notify).toHaveBeenCalledWith(outcome);
  });

  it("does nothing and does not throw where the module has no engine to call", () => {
    notify.mockImplementation(() => {
      throw new Error("no haptic engine");
    });

    expect(() => haptic("success")).not.toThrow();
  });

  it("swallows a rejected request, so a device without a motor raises no unhandled rejection", async () => {
    notify.mockRejectedValue(new Error("no haptic engine"));
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);

    haptic("error");
    await new Promise((resolve) => setImmediate(resolve));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });

  it("does not reach the module at all on the web", () => {
    const original = Platform.OS;
    Platform.OS = "web";

    haptic("warning");
    Platform.OS = original;

    expect(notify).not.toHaveBeenCalled();
  });
});
