import { routeTemplates } from "../generated/route-templates";

export const UNMATCHED_ROUTE = "unmatched";

export const pathOf = (url: string): string => url.split("?", 1)[0];

const isParameter = (segment: string): boolean => segment.startsWith("{");

// Most fixed segments first, so `/notifications/unread-count` wins over `/notifications/{id}`.
const compiled = routeTemplates
  .map((template) => {
    const segments = template.split("/");
    const pattern = new RegExp(
      `^${segments.map((s) => (isParameter(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`,
    );
    return { template, pattern, fixed: segments.filter((s) => !isParameter(s)).length };
  })
  .sort((a, b) => b.fixed - a.fixed);

/**
 * The path template of the operation a URL calls, for anything that writes
 * the call down: a path carries user names and ids (ADR-0013).
 */
export const routeTemplateOf = (url: string): string => {
  const path = pathOf(url);
  return compiled.find(({ pattern }) => pattern.test(path))?.template ?? UNMATCHED_ROUTE;
};
