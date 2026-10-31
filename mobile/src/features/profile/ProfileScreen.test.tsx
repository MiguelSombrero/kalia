import { apiError, registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ProfileScreen } from "./ProfileScreen";

const transport = jest.fn();
const answerWith = (username: string) =>
  transport.mockResolvedValue({ data: { username, cellarPublic: false }, status: 200, headers: new Headers() });

const signedIn = () => fakeTokenStore({ status: "signedIn" });
const signedOut = (expired = false) => fakeTokenStore({ status: "signedOut", expired });

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

describe("ProfileScreen signed out", () => {
  it.each([
    ["en", "Profile", "Sign in to see your profile", "Sign in"],
    ["fi", "Profiili", "Kirjaudu sisään nähdäksesi profiilisi", "Kirjaudu sisään"],
  ] as const)("invites the user to sign in, in %s", async (locale, heading, title, action) => {
    await renderWithLocale(<ProfileScreen />, locale, signedOut());

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: action })).toBeOnTheScreen();
    expect(screen.queryByText(/signed out|ulos\./i)).not.toBeOnTheScreen();
    expect(transport).not.toHaveBeenCalled();
  });

  it("starts the sign-in in the app's language", async () => {
    const store = signedOut();
    await renderWithLocale(<ProfileScreen />, "fi", store);

    await fireEvent.press(screen.getByRole("button", { name: "Kirjaudu sisään" }));

    expect(store.signIn).toHaveBeenCalledWith("fi");
  });

  it.each([
    ["en", "You were signed out. Sign in again to continue."],
    ["fi", "Sinut kirjattiin ulos. Kirjaudu uudelleen jatkaaksesi."],
  ] as const)("says so when a failed refresh signed the user out, in %s", async (locale, message) => {
    await renderWithLocale(<ProfileScreen />, locale, signedOut(true));

    expect(screen.getByText(message)).toBeOnTheScreen();
  });

  it.each([
    ["en", "Sign-in didn't work. Try again."],
    ["fi", "Kirjautuminen ei onnistunut. Yritä uudelleen."],
  ] as const)("shows the failure message and the sign-in action again when sign-in fails, in %s", async (locale, message) => {
    const store = signedOut();
    store.signIn.mockResolvedValue("failed");
    await renderWithLocale(<ProfileScreen />, locale, store);

    await fireEvent.press(screen.getByRole("button", { name: locale === "en" ? "Sign in" : "Kirjaudu sisään" }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: locale === "en" ? "Sign in" : "Kirjaudu sisään" })).toBeOnTheScreen();
  });

  it("returns quietly to signed out when the user cancels", async () => {
    const store = signedOut();
    store.signIn.mockResolvedValue("cancelled");
    await renderWithLocale(<ProfileScreen />, "en", store);

    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.queryByText("Sign-in didn't work. Try again.")).not.toBeOnTheScreen();
  });

  it("clears the failure message when the user tries again", async () => {
    const store = signedOut();
    store.signIn.mockResolvedValueOnce("failed").mockResolvedValueOnce("cancelled");
    await renderWithLocale(<ProfileScreen />, "en", store);

    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Sign-in didn't work. Try again.");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.queryByText("Sign-in didn't work. Try again.")).not.toBeOnTheScreen();
  });
});

describe("ProfileScreen while the stored session is being read", () => {
  it("shows the heading alone", async () => {
    await renderWithLocale(<ProfileScreen />, "en", fakeTokenStore({ status: "loading" }));

    expect(screen.getByRole("heading", { name: "Profile" })).toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });
});

describe("ProfileScreen signed in", () => {
  it.each([
    ["en", "Signed in as miika", "Sign out"],
    ["fi", "Kirjautuneena käyttäjänä miika", "Kirjaudu ulos"],
  ] as const)("shows the username the profile endpoint returns, in %s", async (locale, line, signOut) => {
    answerWith("miika");
    await renderWithLocale(<ProfileScreen />, locale, signedIn());

    expect(await screen.findByText(line)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: signOut })).toBeOnTheScreen();
    expect(transport.mock.calls[0][0]).toBe("/api/v1/profile");
  });

  it("signs out when the button is pressed", async () => {
    answerWith("miika");
    const store = signedIn();
    await renderWithLocale(<ProfileScreen />, "en", store);
    await screen.findByText("Signed in as miika");

    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

    expect(store.signOut).toHaveBeenCalledTimes(1);
  });

  it("shows the sign-in invitation, not the username, once the session ends", async () => {
    answerWith("miika");
    const store = signedIn();
    await renderWithLocale(<ProfileScreen />, "en", store);
    await screen.findByText("Signed in as miika");

    await act(async () => store.set({ status: "signedOut", expired: true }));

    expect(screen.queryByText("Signed in as miika")).not.toBeOnTheScreen();
    expect(screen.getByText("Sign in to see your profile")).toBeOnTheScreen();
    expect(screen.getByText("You were signed out. Sign in again to continue.")).toBeOnTheScreen();
  });

  it("does not show the previous user's name to the next one", async () => {
    answerWith("miika");
    const store = signedIn();
    await renderWithLocale(<ProfileScreen />, "en", store);
    await screen.findByText("Signed in as miika");
    await act(async () => store.set({ status: "signedOut", expired: false }));

    answerWith("sanna");
    await act(async () => store.set({ status: "signedIn" }));

    expect(await screen.findByText("Signed in as sanna")).toBeOnTheScreen();
  });

  it.each([
    ["en", "Couldn't load your profile.", "Try again"],
    ["fi", "Profiilin lataus ei onnistunut.", "Yritä uudelleen"],
  ] as const)("offers to try again when the profile cannot be loaded, in %s", async (locale, message, retry) => {
    transport.mockRejectedValue(apiError("network", "Could not reach the backend"));
    await renderWithLocale(<ProfileScreen />, locale, signedIn());

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: retry })).toBeOnTheScreen();
  });

  it("calls the profile endpoint again when the user presses Try again", async () => {
    transport.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));
    answerWith("miika");
    await renderWithLocale(<ProfileScreen />, "en", signedIn());
    await screen.findByText("Couldn't load your profile.");

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Signed in as miika")).toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("treats a non-200 answer as a failure to load", async () => {
    transport.mockResolvedValue({ data: null, status: 500, headers: new Headers() });
    await renderWithLocale(<ProfileScreen />, "en", signedIn());

    expect(await screen.findByText("Couldn't load your profile.")).toBeOnTheScreen();
  });

  it("keeps the sign-out action when the profile cannot be loaded", async () => {
    transport.mockRejectedValue(apiError("network", "Could not reach the backend"));
    await renderWithLocale(<ProfileScreen />, "en", signedIn());
    await screen.findByText("Couldn't load your profile.");

    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
  });
});
