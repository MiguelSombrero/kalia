// ADR-0016. No-nonce: 'unsafe-inline' keeps static rendering; 'unsafe-eval' is dev-only, React's own.
export const buildCspHeader = (nodeEnv: string | undefined): string => {
  const isDev = nodeEnv === "development";

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();
};
