# Common failures

An append-only log of the unexpected failures agents hit while working here,
one row per occurrence. It exists so that recurrence, which one session
cannot see, survives into the evidence `/quality-sweep`'s `process-quality`
dimension reads ([ADR-0084](adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
Nothing here is a fix: once a failure is understood, its fix goes to its own
home and a row names that home.

**Log a failure** when a tool call or command fails, and the cause is
tooling, the environment, or a wrong assumption on your part, and it cost a
retry. **Don't log** a product bug that a test caught, a test that is red on
purpose, or a failure that is normal operation (`grep` finding no match).

**How to write a row:**

- Append it to the end of the table, on the branch you are working on. Never
  edit or remove an earlier row. If you understand an old row better, write a
  new one.
- **Signature** is the stable part of the error, normalized: the error code
  or message with paths, line numbers, ports and ids removed. Keep it
  verbatim enough to grep. Never paste secrets, tokens or personal data.
- **Why** is your best explanation at the time. `unknown` is a valid answer.
  If the fix already has a home, link it.
- Don't count, group or deduplicate rows. The sweep does that.

| Date | Where | Signature | Why |
|---|---|---|---|
