// Reads messages back out of the mailpit container (docker-compose.yml) over
// its HTTP API on :8025 — its SMTP port is in-network only.
import { expect, type APIRequestContext } from "@playwright/test";

const MAILPIT_URL = "http://localhost:8025";

type MailpitMessage = { ID: string; From: { Address: string; Name: string }; Subject: string };
type MailpitMessageDetail = { ID: string; Text: string; HTML: string; From: { Address: string; Name: string } };

// Polls: Keycloak's admin endpoint returns before the SMTP send completes, so
// the message is not in mailpit the instant the trigger call resolves. The
// `to:` filter keeps this to the caller's own message, so a shared mailpit
// and parallel specs don't need clearing between runs.
export const waitForMessageTo = async (
  request: APIRequestContext,
  recipient: string,
): Promise<MailpitMessageDetail> => {
  let summary: MailpitMessage | undefined;
  await expect(async () => {
    const response = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:${recipient}` },
    });
    expect(response.ok(), "could not search mailpit").toBeTruthy();
    const { messages } = (await response.json()) as { messages: MailpitMessage[] };
    summary = messages[0];
    expect(summary, `no message to ${recipient} in mailpit yet`).toBeTruthy();
  }).toPass({ timeout: 15_000 });

  const detail = await request.get(`${MAILPIT_URL}/api/v1/message/${summary!.ID}`);
  expect(detail.ok(), "could not read the caught message").toBeTruthy();
  return (await detail.json()) as MailpitMessageDetail;
};

// Keycloak's action emails carry a single http link, to its login-actions
// endpoint. Read it from the plain-text part — the HTML part escapes URL
// ampersands as &amp;.
export const linkFromMessage = (message: MailpitMessageDetail): string => {
  const body = message.Text || message.HTML;
  const match = body.match(/https?:\/\/[^\s"'<>)]+/);
  expect(match, "the caught message carries no link").toBeTruthy();
  return match![0];
};
