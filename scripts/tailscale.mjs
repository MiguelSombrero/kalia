// What the scripts need from the Tailscale CLI (ADR-0097): where it is, which
// version, whether it is signed in and running, and the names it gives this
// Mac. The parsers take text so they are tested without a tailnet.

import { spawnSync } from "node:child_process";

// The macOS app ships its CLI inside the bundle and puts nothing on PATH.
export const APP_CLI = "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.error ? undefined : result;
};

// The command that starts the CLI, or undefined when there is none.
export const findTailscale = () => ["tailscale", APP_CLI].find((command) => run(command, ["version"])?.status === 0);

export const parseVersion = (output) => output.match(/^\s*(\d+\.\d+\.\d+)/)?.[1];

// A running Tailscale, and the two names this Mac answers to on the tailnet: its MagicDNS name and that name's first label. `Self.HostName` is the machine's display name ("Someone's MacBook") and is no DNS name.
// `Self.DNSName` ends in a dot, which no URL takes.
export const parseStatus = (json) => {
  let status;
  try {
    status = JSON.parse(json);
  } catch {
    return { running: false, names: [] };
  }
  const dnsName = status.Self?.DNSName?.replace(/\.$/, "");
  const names = [dnsName, dnsName?.split(".")[0]].filter(Boolean).map((name) => name.toLowerCase());
  return { running: status.BackendState === "Running", names };
};

// The pin is a floor within one major line: a later 1.x is the same tool.
export const meetsPin = (have, pin) => {
  const [haveMajor, ...haveRest] = have.split(".").map(Number);
  const [pinMajor, ...pinRest] = pin.split(".").map(Number);
  if (haveMajor !== pinMajor) return false;
  for (let i = 0; i < pinRest.length; i++) {
    if (haveRest[i] !== pinRest[i]) return haveRest[i] > pinRest[i];
  }
  return true;
};

export const tailscaleFacts = () => {
  const command = findTailscale();
  if (!command) return { installed: false };
  const version = parseVersion(run(command, ["version"])?.stdout ?? "");
  const status = parseStatus(run(command, ["status", "--json"])?.stdout ?? "");
  return { installed: true, command, version, ...status };
};
