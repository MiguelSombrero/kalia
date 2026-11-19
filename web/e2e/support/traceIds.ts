import { type BrowserContext, test as base } from "@playwright/test";

import { WEB_ORIGIN } from "./origins";

export type TracedRequest = {
  traceId: string;
  method: string;
  path: string;
  status: number;
};

export const TRACE_IDS_ATTACHMENT = "trace-ids";

// proxy.ts's TRACE_ID_HEADER, spelled out: e2e/ sits outside every layer
// eslint.config.mjs knows (ADR-0012). The web server sets it only in the
// local stack, on the pages, RSC fetches and Server Actions it traces.
const TRACE_ID_HEADER = "x-kalia-trace-id";

const SUMMARY_LENGTH = 3;

const wentWrong = ({ status }: TracedRequest): boolean => status >= 400;

const describe = ({ traceId, method, path, status }: TracedRequest): string => `${traceId} ${method} ${path} ${status}`;

/** The attachment's text: one line per request, in the order the page was answered. */
export const formatTracedRequests = (requests: TracedRequest[]): string =>
  [
    "Trace ids of the requests this test's pages made, oldest first: <trace id> <method> <path> <status>.",
    "Read one from a running profile with: make trace ID=<trace id>",
    ...requests.map(describe),
  ].join("\n");

/** One line for the failure output: the requests that went wrong, else the last ones made. */
export const summaryLine = (requests: TracedRequest[]): string => {
  const wrong = requests.filter(wentWrong);
  const named = (wrong.length > 0 ? wrong : requests).slice(-SUMMARY_LENGTH);
  const which = wrong.length > 0 ? "that went wrong" : "answered last";
  const of = requests.length > named.length ? ` of ${requests.length}` : "";
  return `Trace ids behind this failure: ${named.length}${of} request${named.length === 1 ? "" : "s"} ${which}: ${named
    .map(describe)
    .join("; ")}. All of them are in the report's ${TRACE_IDS_ATTACHMENT} attachment; read one with: make trace ID=<trace id>`;
};

const noteTraceIds = (context: BrowserContext, requests: TracedRequest[]): void => {
  context.on("response", async (response) => {
    const url = new URL(response.url());
    // A prefetch is Next.js looking ahead, not a request the page's test made.
    if (url.origin !== WEB_ORIGIN || response.request().headers()["next-router-prefetch"]) return;
    // Rejects when the page closes while the answer is still being read.
    const headers: Record<string, string> = await response.allHeaders().catch(() => ({}));
    const traceId = headers[TRACE_ID_HEADER];
    if (!traceId) return;
    requests.push({ traceId, method: response.request().method(), path: url.pathname, status: response.status() });
  });
};

// `auto`, so no spec has to remember. Every context a test opens is noted, the
// fixture's own and the ones a spec makes with `browser.newContext()`, by
// wrapping that method for the length of the test: tests run one at a time in
// a worker. Do not add the header to the requests from here with `route()`:
// interception switches the browser's HTTP cache off, and then a page is
// read before its stylesheet arrives, which failed 39 specs on `signIn`'s
// two "Profile" links.
export const test = base.extend<{ tracedRequests: TracedRequest[] }>({
  tracedRequests: [
    async ({ browser }, use, testInfo) => {
      const requests: TracedRequest[] = [];
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (options) => {
        const context = await newContext(options);
        noteTraceIds(context, requests);
        return context;
      };
      await use(requests);
      browser.newContext = newContext;
      if (testInfo.status === testInfo.expectedStatus || requests.length === 0) return;
      await testInfo.attach(TRACE_IDS_ATTACHMENT, {
        body: formatTracedRequests(requests),
        contentType: "text/plain",
      });
      // An error of its own, so the line is in the failure output of every
      // reporter, the CI log's included, and not only in the report.
      const named = new Error(summaryLine(requests));
      named.stack = named.message;
      throw named;
    },
    { auto: true },
  ],
});
