import test from "node:test";
import assert from "node:assert/strict";
import { driftOf, pinnedImage, revertEdits, versionOf } from "./check-keycloak-templates.mjs";

const upstream = ["<head>", "    <title>${title!}</title>", "</head>", ""].join("\n");
const copy = [
  "<head>",
  "    <#-- kalia:begin <title>${title!}</title> -->",
  "    <title>${kaliaTitle}</title>",
  "    <#-- kalia:end -->",
  "</head>",
  "",
].join("\n");

test("a copy whose only differences are declared matches the upstream", () => {
  assert.equal(revertEdits(copy), upstream);
  assert.equal(driftOf("template.ftl", copy, upstream), null);
});

test("an edit outside a declared block is drift, and the line is named", () => {
  const edited = copy.replace("<head>", "<head class=\"kalia\">");
  assert.match(driftOf("template.ftl", edited, upstream), /line 1 outside its kalia blocks/);
});

test("a changed upstream template is drift", () => {
  const bumped = upstream.replace("</head>", "<meta charset=\"utf-8\">\n</head>");
  assert.match(driftOf("template.ftl", copy, bumped), /differs from keycloak\.v2's/);
});

test("a block that does not restore what it replaced is drift", () => {
  const wrong = copy.replace("<#-- kalia:begin <title>${title!}</title> -->", "<#-- kalia:begin <title>${page}</title> -->");
  assert.match(driftOf("template.ftl", wrong, upstream), /line 2/);
});

test("an unclosed or stray marker is reported", () => {
  assert.match(driftOf("template.ftl", copy.replace("    <#-- kalia:end -->\n", ""), upstream), /no partner/);
  assert.match(driftOf("template.ftl", `${copy}<#-- kalia:end -->\n`, upstream), /no partner/);
});

test("an unclosed block does not hide the edit between it and the next block", () => {
  const two = `${copy}<p>${"x"}</p>\n${copy.replace("<head>\n", "<head2>\n")}`;
  assert.match(driftOf("template.ftl", two.replace("    <#-- kalia:end -->\n", ""), `${upstream}<p>x</p>\n${upstream.replace("<head>", "<head2>")}`), /no partner|differs/);
});

test("the pinned Keycloak version is read from the Dockerfile's FROM line", () => {
  const image = pinnedImage("FROM quay.io/keycloak/keycloak:26.8.2-0\n\nENV KC_DB=postgres\n");
  assert.equal(image, "quay.io/keycloak/keycloak:26.8.2-0");
  assert.equal(versionOf(image), "26.8.2");
  assert.equal(versionOf("quay.io/keycloak/keycloak:latest"), undefined);
});
