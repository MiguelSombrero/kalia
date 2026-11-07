import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routeTemplateOf, UNMATCHED_ROUTE } from "./route-template";
import { routeTemplates } from "../generated/route-templates";

describe("routeTemplateOf", () => {
  it("names the operation's path template, not the path with a user's name in it", () => {
    expect(routeTemplateOf("/api/v1/cellars/jouni")).toBe("/api/v1/cellars/{username}");
  });

  it("drops the query string", () => {
    expect(routeTemplateOf("/api/v1/cellars/jouni?page=0&secret=1")).toBe("/api/v1/cellars/{username}");
    expect(routeTemplateOf("/api/v1/beers?query=westvleteren")).toBe("/api/v1/beers");
  });

  it("prefers the template with more fixed segments when two match", () => {
    expect(routeTemplateOf("/api/v1/notifications/unread-count")).toBe("/api/v1/notifications/unread-count");
    expect(routeTemplateOf("/api/v1/notifications/7")).toBe("/api/v1/notifications/{id}");
  });

  it("does not let a parameter span a slash", () => {
    expect(routeTemplateOf("/api/v1/cellars/jouni/extra")).toBe(UNMATCHED_ROUTE);
  });

  it("names a path no operation owns as unmatched, never as itself", () => {
    expect(routeTemplateOf("/api/v1/nonesuch/jouni")).toBe(UNMATCHED_ROUTE);
  });

  it("knows every path the committed API spec declares", () => {
    const spec = JSON.parse(readFileSync(new URL("../../../../backend/openapi.json", import.meta.url), "utf8")) as {
      paths: Record<string, unknown>;
    };

    expect([...routeTemplates].sort()).toEqual(Object.keys(spec.paths).sort());
  });
});
