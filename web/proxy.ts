import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveLocaleFromAcceptLanguage } from "@/i18n/resolveLocale";
import { locales } from "@/i18n/settings";
import { newTraceparent, TRACE_ID_HEADER, traceIdOf } from "@/lib/api/traceparent";
import { activeTraceId } from "@/lib/telemetry/span";

// Do not rename to middleware.ts: Next.js 16 renamed this file convention to
// `proxy` and the old name is deprecated (web/AGENTS.md).
export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) {
    // Special files get no route params from Next.js; this is how they
    // recover the locale (see resolveLocaleFromHeaders).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    // The one trace id the backend calls made while serving this request will
    // carry (ADR-0088); a valid one from the caller is kept.
    if (!traceIdOf(request.headers.get("traceparent"))) {
      requestHeaders.set("traceparent", newTraceparent().header);
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Tells an end-to-end test which trace its request is in (e2e/support/traceIds.ts).
    // Only the local stack: nothing deployed answers with it.
    if (process.env.KALIA_DEV_STACK === "true") {
      const traceId = activeTraceId() ?? traceIdOf(requestHeaders.get("traceparent"));
      if (traceId) response.headers.set(TRACE_ID_HEADER, traceId);
    }
    return response;
  }

  const locale = resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
};

export const config = {
  // Everything except Next internals, API routes, files with an extension
  // (icon.svg, etc.) and the generated icon, icon1 and apple-icon routes,
  // whose URLs have no extension — the same shape as Next's own negative-match
  // example. Any other generated route with no extension (opengraph-image,
  // say) has to be named here too.
  matcher: ["/((?!_next|api|(?:apple-)?icon\\d*$|.*\\..*).*)"],
};
