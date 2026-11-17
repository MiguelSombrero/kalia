import { routeTemplateOf } from "@kalia/api";
import type { Attributes, AttributeValue } from "@opentelemetry/api";
import type { ReadableSpan, TimedEvent } from "@opentelemetry/sdk-trace-base";

// Next.js records a request's whole target and the fetch instrumentation the
// whole URL (ADR-0013), so a span keeps only what is listed: an attribute a
// library adds later is dropped until it is decided to be safe.
const KEPT_ATTRIBUTES = new Set([
  "http.method",
  "http.request.method",
  "http.status_code",
  "http.response.status_code",
  "http.route",
  "http.host",
  "net.peer.name",
  "net.peer.port",
  "server.address",
  "server.port",
  "error.type",
  "operation.name",
  "next.span_name",
  "next.span_type",
  "next.route",
  "next.page",
  "next.rsc",
  "next.segment",
  "next.bailout",
]);

const URL_ATTRIBUTES = new Set(["http.url", "url.full"]);

const KEPT_EVENT_ATTRIBUTES = new Set(["exception.type"]);

const HTTP_METHODS = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|TRACE|CONNECT)\b/;

const UNMATCHED = "unmatched";

/** The URL with its query, fragment and credentials gone and its path as the route template the backend knows. */
export const redactUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return UNMATCHED;
  }
  if (!url.pathname.startsWith("/api/v1/")) {
    return url.origin;
  }
  const template = routeTemplateOf(url.pathname);
  return `${url.origin}${template.startsWith("/") ? template : `/${UNMATCHED}`}`;
};

const stringOf = (value: AttributeValue | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

const redactAttributes = (attributes: Attributes): Attributes => {
  const kept: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }
    if (URL_ATTRIBUTES.has(key)) {
      const url = stringOf(value);
      if (url !== undefined) {
        kept[key] = redactUrl(url);
      }
    } else if (KEPT_ATTRIBUTES.has(key) || key.startsWith("kalia.")) {
      kept[key] = value;
    }
  }
  // Next's `http.target` is the path and query as the browser sent them; its
  // route template says the same without either.
  const route = stringOf(attributes["next.route"]);
  if (route !== undefined) {
    kept["http.target"] = route;
  }
  return kept;
};

// A request's span is named `GET /en/cellars/ada` until Next has matched a
// route, and a fetch's `fetch GET http://backend:8080/api/v1/cellars/ada?x=1`.
// A name that already is a template, ours or Next's, is left alone.
const redactName = (name: string, attributes: Attributes): string => {
  const fetched = /^fetch (\S+) (\S+)/.exec(name);
  const [, fetchedMethod, fetchedUrl] = fetched ?? [];
  if (fetchedMethod !== undefined && fetchedUrl !== undefined) {
    return `${fetchedMethod} ${redactUrl(fetchedUrl)}`;
  }
  const method = HTTP_METHODS.exec(name)?.[1];
  const target = method ? name.slice(method.length).trim() : "";
  if (method && target.startsWith("/") && !isTemplate(target, attributes)) {
    return `${method} ${stringOf(attributes["next.route"]) ?? UNMATCHED}`;
  }
  return name;
};

const isTemplate = (target: string, attributes: Attributes): boolean =>
  target === attributes["next.route"] || routeTemplateOf(target) === target;

const redactEvent = (event: TimedEvent): TimedEvent => ({
  ...event,
  attributes: Object.fromEntries(
    Object.entries(event.attributes ?? {}).filter(([key]) => KEPT_EVENT_ATTRIBUTES.has(key)),
  ),
});

/**
 * A copy of the span as it may leave the process. Built field by field rather
 * than spread, because the SDK's span exposes `duration` and `ended` as
 * getters that a spread would lose.
 */
export const redactSpan = (span: ReadableSpan): ReadableSpan => ({
  name: redactName(span.name, span.attributes),
  kind: span.kind,
  spanContext: () => span.spanContext(),
  parentSpanContext: span.parentSpanContext,
  startTime: span.startTime,
  endTime: span.endTime,
  status: { code: span.status.code },
  attributes: redactAttributes(span.attributes),
  links: span.links.map((link) => ({ context: link.context })),
  events: span.events.map(redactEvent),
  duration: span.duration,
  ended: span.ended,
  resource: span.resource,
  instrumentationScope: span.instrumentationScope,
  droppedAttributesCount: span.droppedAttributesCount,
  droppedEventsCount: span.droppedEventsCount,
  droppedLinksCount: span.droppedLinksCount,
});
