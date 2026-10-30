import { execFileSync } from "node:child_process";
import path from "node:path";

// Do not stop calling this from a spec that adds beers. The worker accounts
// outlive a run, so their waiting entries add up across local runs until the
// backend's cap on them answers 429 (ADR-0091) — an unexplained failure in
// the add-a-beer dialog.
export const approveContributionsOf = (username: string): void => {
  try {
    execFileSync("make", ["-C", path.resolve(process.cwd(), ".."), "moderate", "ACTION=approve", `WHO=${username}`], {
      stdio: "pipe",
    });
  } catch (failure) {
    // An account that has never signed in has no profile yet, so nothing to approve.
    if (!String((failure as { stderr?: Buffer }).stderr).includes("no user named")) {
      throw failure;
    }
  }
};
