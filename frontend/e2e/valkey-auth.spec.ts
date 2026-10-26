// The session store keys each session by its cookie value, so what it answers
// to an unauthenticated client is what an attacker on the network gets (ADR-0089).
import net from "node:net";
import { expect, test } from "./support/keycloakAccount";
import { VALKEY_URL } from "./support/valkey";

// Raw RESP over a socket: a client library would handle the NOAUTH reply as it
// sees fit, and this spec is about the bytes the server returns.
const askWithoutAuthenticating = (command: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const { hostname, port } = new URL(VALKEY_URL);
    const socket = net.connect({ host: hostname, port: Number(port) });
    socket.setTimeout(5000, () => socket.destroy(new Error("Valkey did not answer")));
    socket.once("error", reject);
    socket.once("data", (reply) => {
      socket.end();
      resolve(reply.toString());
    });
    const encoded = command.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("");
    socket.write(`*${command.length}\r\n${encoded}`);
  });

test("Valkey refuses to list or read sessions for a client that has not authenticated", async ({ valkey }) => {
  expect(await askWithoutAuthenticating(["KEYS", "auth:session:*"])).toMatch(/^-NOAUTH/);
  expect(await askWithoutAuthenticating(["GET", "auth:session:anything"])).toMatch(/^-NOAUTH/);

  // The fixture's connection carries the password, so the store itself is up.
  await expect(valkey.ping()).resolves.toBe("PONG");
});

test("Valkey refuses a wrong password", async () => {
  const reply = await askWithoutAuthenticating(["AUTH", "not-the-password"]);

  expect(reply).toMatch(/^-(WRONGPASS|ERR)/);
});
