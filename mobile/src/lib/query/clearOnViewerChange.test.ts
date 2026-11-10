import { QueryClient } from "@tanstack/react-query";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { clearOnViewerChange } from "./clearOnViewerChange";

it.each([
  [{ status: "signedOut", expired: false }, { status: "signedIn" }],
  [{ status: "signedIn" }, { status: "signedOut", expired: false }],
] as const)("resets viewer data while retaining viewer-independent data", (initial, next) => {
  const store = fakeTokenStore(initial);
  const client = new QueryClient();
  client.setQueryData(["profile"], "previous viewer");
  client.setQueryDefaults(["app-config"], { meta: { viewerIndependent: true } });
  client.setQueryData(["app-config"], "configuration");
  const unsubscribe = clearOnViewerChange(store, client);

  store.set(next);

  expect(client.getQueryData(["profile"])).toBeUndefined();
  expect(client.getQueryData(["app-config"])).toBe("configuration");
  unsubscribe();
  client.clear();
});
