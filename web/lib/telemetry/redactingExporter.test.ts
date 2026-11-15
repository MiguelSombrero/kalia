// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { SpanKind, trace } from "@opentelemetry/api";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { registerTelemetry } from "./registerTelemetry";

// A collector that keeps the bytes it was sent, so what is asserted is what
// would have left the machine, through the real SDK and the real exporter.
const received: Buffer[] = [];
let collector: Server;
let endpoint: string;

beforeAll(async () => {
  collector = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push(Buffer.concat(chunks));
      response.writeHead(200, { "Content-Type": "application/x-protobuf" }).end();
    });
  });
  await new Promise<void>((resolve) => collector.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(collector.address() as AddressInfo).port}`;
});

afterAll(() => {
  collector.close();
});

describe("what the web sends a collector", () => {
  it("holds no query string, session id, token or user name of the request it traced, and names its route", async () => {
    // The SDK reads this variable for itself as well, which is what the default
    // exporter it adds beside ours would send to.
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint);
    registerTelemetry(process.env);
    const tracer = trace.getTracer("test");

    const request = tracer.startSpan("GET /en/cellars/ada-lovelace", {
      kind: SpanKind.SERVER,
      attributes: {
        "http.method": "GET",
        "http.target": "/en/cellars/ada-lovelace?search=westvleteren&sid=sid-9f3c1a77",
        "http.url": "http://localhost:3000/en/cellars/ada-lovelace?search=westvleteren&sid=sid-9f3c1a77",
        "http.request.header.cookie": "authjs.session-token=sid-9f3c1a77",
        "next.route": "/[locale]/cellars/[username]",
      },
    });
    request.recordException(new Error("Bearer abc.def.ghi"));
    request.end();
    const proxy = trace.getTracerProvider() as unknown as { getDelegate: () => { forceFlush: () => Promise<void> } };
    await proxy.getDelegate().forceFlush();

    const sent = Buffer.concat(received).toString("latin1");
    expect(sent).toContain("/[locale]/cellars/[username]");
    for (const secret of ["ada-lovelace", "westvleteren", "sid-9f3c1a77", "abc.def.ghi"]) {
      expect(sent).not.toContain(secret);
    }
  });
});
