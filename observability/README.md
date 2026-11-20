# Reading the observability profile as an agent

How an agent queries the local profile ([ADR-0114](../docs/adr/0114-an-opt-in-profile-stores-traces-logs-and-metrics-in-one-local-grafana-container-an-agent-reads-through-a-bounded-interface.md)),
beside `make trace`, which prints one request's trace and logs
([README](../README.md#run-locally)).

## The MCP server

`.mcp.json` declares `kalia-telemetry`: Grafana's own MCP server, run as a
pinned container behind `scripts/mcp-grafana.mjs`. Claude Code offers it to an
agent that opens this repository, and **the product owner approves it once**;
allowing `mcp__kalia-telemetry` in one's own settings stops the prompt on each
call.

- **Needs** Docker and the profile on (`make observability-up`). The wrapper
  reads this worktree's `GRAFANA_PORT` and signs in to Grafana as a Viewer
  service account it creates. Run `node scripts/mcp-grafana.mjs --pull` once
  first: the image is about 290 MB, and a first connect that waits on the
  download times out.
- **Reads only**: traces (Tempo), logs (Loki) and metrics (Prometheus); no
  dashboard, alert or data-source write, no raw API, nothing fetched from the
  network and no usage report to Grafana. `scripts/check-mcp-config.mjs` fails
  a remote server, a host other than this machine or an unpinned version.
- **Bounded**: an answer is cut at 12,000 characters with a line saying so,
  so narrow the query (a shorter range, a more selective label) rather than
  ask for more.
- **Stopped**: with the profile off, a tool call answers that it is not running
  and names `make observability-up`.

## Following one request

A web request's whole trace is about 30,000 characters, so `get_tempo_trace`
is cut before the web's own spans. List them instead with
`search_tempo_traces`:

```text
{ trace:id = "<id>" } | select(name, span:parentID)
```

then read the log lines of every tier with `query_loki_logs` on
`{service_name=~".+"} |= "<id>"`.

## After a red CI run

A red end-to-end job uploads the stack's telemetry; loading it gives the same
profile, and so the same queries, as a local run
([how](../docs/ci-playbook.md#a-red-runs-telemetry)).
