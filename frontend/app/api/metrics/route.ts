import { hasMetricsToken } from "@/lib/metrics/metricsToken";
import { metrics } from "@/lib/metrics/metrics";

export const runtime = "nodejs";

// ADR-0088. Off unless METRICS_TOKEN is set, and then only for a caller that
// presents it: the counters name routes and failure modes, which is more than
// an anonymous visitor needs to know.
export const GET = async (request: Request): Promise<Response> => {
  const token = process.env.METRICS_TOKEN?.trim();
  if (!token) {
    return new Response(null, { status: 404 });
  }
  if (!hasMetricsToken(request.headers.get("authorization"), token)) {
    return new Response(null, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  return new Response(await metrics.registry.metrics(), {
    headers: { "Content-Type": metrics.registry.contentType },
  });
};
