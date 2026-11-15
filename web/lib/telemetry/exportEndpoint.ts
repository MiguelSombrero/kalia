// Compose sets the variable to an empty string without the profile (ADR-0114).
export const exportEndpoint = (env: Readonly<Record<string, string | undefined>>): string | undefined =>
  env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || undefined;
