import path from "node:path";
import type { NextConfig } from "next";
import { buildCspHeader } from "./lib/config/cspHeader";

const cspHeader = buildCspHeader(process.env.NODE_ENV);

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime image
  output: "standalone",

  // Tracing starts at the repository root, because the workspace packages
  // under packages/ sit outside web/ and would otherwise be left out of the
  // standalone output (ADR-0092).
  outputFileTracingRoot: path.join(__dirname, ".."),

  poweredByHeader: false,

  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Do not add `preload`: a one-way commitment to browser vendors,
          // and this project has no production domain yet (ADR-0016).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
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
