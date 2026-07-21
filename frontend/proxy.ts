import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales } from "@/i18n/settings";
import { resolveLocaleFromAcceptLanguage } from "@/i18n/resolveLocale";

// Next.js 16 renamed the `middleware` file convention to `proxy` — this file
// intentionally does NOT use the deprecated middleware.ts name (see
// frontend/AGENTS.md).
export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) {
    // not-found.tsx receives no props (Next.js convention), so it can't read
    // the [locale] route param directly — this header lets it recover the
    // locale from the request path instead.
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
