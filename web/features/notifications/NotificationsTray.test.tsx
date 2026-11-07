import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactElement } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/en" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const actions = vi.hoisted(() => ({
  readUnreadCountAction: vi.fn(),
  readNotificationsAction: vi.fn(),
  acknowledgeNotificationAction: vi.fn(),
}));
vi.mock("./actions", () => actions);

import { NotificationsTray } from "./NotificationsTray";
import type { Notification, NotificationPage } from "./types";

const decidedAt = new Date(Date.now() - 2 * 3600e3).toISOString();
const notification = (overrides: Partial<Notification>): Notification => ({
  id: "n-0",
  beerId: "b-0",
  beerName: "Öö",
  decidedAt,
  edited: false,
  outcome: "APPROVED",
  ...overrides,
});

const approved = notification({ id: "n-approved", beerId: "b-approved", beerName: "Öö" });
const renamed = notification({
  id: "n-renamed",
  beerId: "b-renamed",
  beerName: "Lucky Jack",
  suggestedName: "lervig lucky jack ipa",
  edited: true,
});
const editedSameName = notification({ id: "n-same", beerId: "b-same", beerName: "Hazy Jane", edited: true });
const rejected = notification({
  id: "n-rejected",
  beerId: "b-rejected",
  beerName: "Asdf Lager",
  outcome: "REJECTED",
  reason: "NOT_A_REAL_BEER",
});

const pageOf = (...content: Notification[]): NotificationPage => ({
  content,
  page: 0,
  totalElements: content.length,
  totalPages: 1,
});

const renderTray = (count: number, locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({ ...getOptions(locale), resources: { en: { common: enCommon }, fi: { common: fiCommon } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const tree = (n: number): ReactElement => (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <NotificationsTray locale={locale} count={n} />
      </I18nextProvider>
    </QueryClientProvider>
  );
  const rendered = render(tree(count));
  return { ...rendered, rerenderWith: (n: number) => rendered.rerender(tree(n)) };
};

const open = async (name: RegExp | string = /unread notification/) => {
  fireEvent.click(screen.getByRole("button", { name }));
  return { dialog: await screen.findByRole("dialog") };
};

beforeEach(() => {
  pathname.current = "/en";
  Object.values(actions).forEach((action) => action.mockReset());
  actions.readNotificationsAction.mockResolvedValue(pageOf(approved));
  actions.readUnreadCountAction.mockResolvedValue(0);
});

describe("the unread signal", () => {
  it("is announced to assistive technology with how many are unread", () => {
    renderTray(3);

    expect(screen.getByRole("button", { name: "3 unread notifications" })).toBeInTheDocument();
  });

  it("is announced in the singular for one, and in Finnish for a Finnish reader", () => {
    const { unmount } = renderTray(1);
    expect(screen.getByRole("button", { name: "1 unread notification" })).toBeInTheDocument();
    unmount();

    renderTray(2, "fi");
    expect(screen.getByRole("button", { name: "2 lukematonta ilmoitusta" })).toBeInTheDocument();
  });

  it("is not drawn for a user with nothing unread", () => {
    const { container } = renderTray(0);

    expect(container).toBeEmptyDOMElement();
  });

  it("makes no call for the count it was handed", () => {
    renderTray(3);

    expect(actions.readUnreadCountAction).not.toHaveBeenCalled();
    expect(actions.readNotificationsAction).not.toHaveBeenCalled();
  });

  it("is read again when the viewer navigates, so a decision made meanwhile shows on the next page", async () => {
    const { rerenderWith } = renderTray(0);
    actions.readUnreadCountAction.mockResolvedValue(1);

    pathname.current = "/en/beers";
    rerenderWith(0);

    expect(await screen.findByRole("button", { name: "1 unread notification" })).toBeInTheDocument();
  });
});

describe("the count after the panel has been opened", () => {
  it("follows the latest read, not the list that was cached when the panel closed", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(approved));
    const { rerenderWith } = renderTray(1);
    const { dialog } = await open();
    await within(dialog).findByText("Öö");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    actions.readUnreadCountAction.mockResolvedValue(3);
    pathname.current = "/en/beers";
    rerenderWith(1);

    expect(await screen.findByRole("button", { name: "3 unread notifications" })).toBeInTheDocument();
  });
});

describe("the panel", () => {
  it("reads the list only when it is opened, and opening acknowledges nothing", async () => {
    renderTray(1);
    expect(actions.readNotificationsAction).not.toHaveBeenCalled();

    const { dialog } = await open();

    expect(await within(dialog).findByText("Öö")).toBeInTheDocument();
    expect(actions.readNotificationsAction).toHaveBeenCalledTimes(1);
    expect(actions.acknowledgeNotificationAction).not.toHaveBeenCalled();
  });

  it("links an approval to the beer's page and a rejection to nothing", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(approved, rejected));
    renderTray(2);

    const { dialog } = await open();

    const link = await within(dialog).findByRole("link", { name: "View beer" });
    expect(link).toHaveAttribute("href", "/en/beers/b-approved");
    expect(within(dialog).getAllByRole("link")).toHaveLength(1);
  });

  it("states a rejection's reason in the reader's language", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(rejected));
    const english = renderTray(1);
    let { dialog } = await open();
    expect(await within(dialog).findByText("This is not a real beer.")).toBeInTheDocument();
    english.unmount();

    renderTray(1, "fi");
    ({ dialog } = await open("1 lukematon ilmoitus"));
    expect(await within(dialog).findByText("Tämä ei ole oikea olut.")).toBeInTheDocument();
  });

  it("states a rejection reason this build does not list with the generic word", async () => {
    actions.readNotificationsAction.mockResolvedValue(
      pageOf(notification({ ...rejected, reason: "TOO_STRONG" as Notification["reason"] })),
    );
    renderTray(1);

    const { dialog } = await open();

    expect(await within(dialog).findByText("Other", { selector: "p", exact: false })).toHaveTextContent("Reason Other");
    expect(within(dialog).queryByText(/notifications\.reason/)).not.toBeInTheDocument();
  });

  it("shows an edited approval's name as suggested and as decided", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(renamed));
    renderTray(1);

    const { dialog } = await open();

    expect(await within(dialog).findByText("lervig lucky jack ipa", { selector: "s" })).toBeInTheDocument();
    expect(within(dialog).getByText("You suggested lervig lucky jack ipa.", { exact: false })).toHaveTextContent(
      "It was approved as Lucky Jack.",
    );
    expect(within(dialog).getByText("Edited")).toBeInTheDocument();
  });

  it("marks an edit that left the name alone as edited, with the link to the beer and no rename", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(editedSameName));
    renderTray(1);

    const { dialog } = await open();

    expect(await within(dialog).findByText("Edited")).toBeInTheDocument();
    expect(within(dialog).queryByText(/You suggested/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Hazy Jane", { selector: "s" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/An admin corrected its details/)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "View beer" })).toHaveAttribute("href", "/en/beers/b-same");
  });

  it("treats a suggested name equal to the decided one as an edit that left the name alone", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf({ ...editedSameName, suggestedName: "Hazy Jane" }));
    renderTray(1);

    const { dialog } = await open();

    expect(await within(dialog).findByText(/An admin corrected its details/)).toBeInTheDocument();
    expect(within(dialog).queryByText("Hazy Jane", { selector: "s" })).not.toBeInTheDocument();
  });

  it("acknowledges one notification and takes only it out of the panel, counting one fewer", async () => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(approved, rejected));
    actions.acknowledgeNotificationAction.mockResolvedValue("acknowledged");
    renderTray(2);
    const { dialog } = await open();
    await within(dialog).findByText("Asdf Lager");
    fireEvent.click(await within(dialog).findByRole("button", { name: /Got it, Öö/ }));

    await waitFor(() => expect(within(dialog).queryByText("Öö")).not.toBeInTheDocument());
    expect(actions.acknowledgeNotificationAction).toHaveBeenCalledExactlyOnceWith("n-approved");
    expect(within(dialog).getByText("Asdf Lager")).toBeInTheDocument();
    expect(screen.getByText("1 unread notification")).toBeInTheDocument();
  });

  it("treats a notification already gone as acknowledged: it leaves the list and the list is read again, with no error", async () => {
    actions.readNotificationsAction.mockResolvedValueOnce(pageOf(approved, rejected)).mockResolvedValue(pageOf(rejected));
    actions.acknowledgeNotificationAction.mockResolvedValue("gone");
    renderTray(2);
    const { dialog } = await open();

    fireEvent.click(await within(dialog).findByRole("button", { name: /Got it, Öö/ }));

    await waitFor(() => expect(actions.readNotificationsAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(dialog).queryByText("Öö")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Asdf Lager")).toBeInTheDocument();
  });

  it("says nothing is new once the last one is acknowledged, and the signal goes when the panel closes", async () => {
    actions.acknowledgeNotificationAction.mockResolvedValue("acknowledged");
    renderTray(1);
    const { dialog } = await open();

    fireEvent.click(await within(dialog).findByRole("button", { name: /Got it/ }));

    expect(await within(dialog).findByText("Nothing new")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
  });

  it("says a failed acknowledgement failed, on that notification, and keeps it", async () => {
    actions.acknowledgeNotificationAction.mockRejectedValue(new Error("boom"));
    renderTray(1);
    const { dialog } = await open();

    fireEvent.click(await within(dialog).findByRole("button", { name: /Got it/ }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be marked as read");
    expect(within(dialog).getByText("Öö")).toBeInTheDocument();
  });

  it("says the list could not be loaded, and tries again on request", async () => {
    actions.readNotificationsAction.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(pageOf(approved));
    renderTray(1);
    const { dialog } = await open();

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be loaded");
    fireEvent.click(within(dialog).getByRole("button", { name: "Try again" }));

    expect(await within(dialog).findByText("Öö")).toBeInTheDocument();
  });

  it.each(["en", "fi"] as const)("passes axe closed, loading and with every kind of notification, in %s", async (locale) => {
    actions.readNotificationsAction.mockResolvedValue(pageOf(approved, renamed, editedSameName, rejected));
    const { container } = renderTray(4, locale);
    expect(await axe(container)).toHaveNoViolations();

    const { dialog } = await open(locale === "en" ? /unread/ : /lukematon/);
    await within(dialog).findByText("Asdf Lager");
    await act(async () => {});

    expect(await axe(dialog)).toHaveNoViolations();
  });
});
