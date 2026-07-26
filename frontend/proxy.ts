import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales } from "@/i18n/settings";
import { resolveLocaleFromAcceptLanguage } from "@/i18n/resolveLocale";

// Do not rename to middleware.ts: Next.js 16 renamed this file convention to
// `proxy` and the old name is deprecated (frontend/AGENTS.md).
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
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const locale = resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
};

export const config = {
  // Everything except Next internals, API routes and files with an extension
  // (favicon.ico, etc.) — the same shape as Next's own negative-match example.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
