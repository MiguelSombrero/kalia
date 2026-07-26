import type { NextConfig } from "next";

// ADR-0016. No-nonce CSP: the app has no inline scripts of its own, no
// third-party scripts, and no user-generated content, so 'unsafe-inline'
// costs little today and keeps every page (including the statically
// prerendered locale root) on static rendering. next/font self-hosts fonts
// at build time (confirmed in node_modules/next/dist/docs) - no external
// font-src needed. The backend is never reached directly by the browser
// (BFF pattern, docs/architecture.md §2), so connect-src is 'self' only.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime image
  output: "standalone",

  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // Duplicates CSP's frame-ancestors for browsers that predate it
          // (CSP2, 2014) or ignore it; frame-ancestors is authoritative.
          { key: "X-Frame-Options", value: "DENY" },
          // Never send the full URL to a cross-origin destination, only the
          // origin - full same-origin referrers still work, so in-app
          // analytics or logging that depends on the referring path is
          // unaffected.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Inert until a real HTTPS deployment exists - browsers only
          // honor HSTS when it arrives over HTTPS in the first place - but
          // set now so it's active from day one of that deployment rather
          // than a step someone has to remember. No preload: submission to
          // the browser preload list is a one-way commitment, and this
          // project has no production domain decided yet (ADR-0006).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Denies the sensitive device/data APIs this app has no use for,
          // rather than relying on the browser's own (looser) defaults.
          // Not an exhaustive feature list - benign UX features (fullscreen,
          // autoplay) are left to the browser's defaults rather than denied
          // pre-emptively for a feature that might reasonably be used later.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
