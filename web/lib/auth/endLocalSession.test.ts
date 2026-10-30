import { describe, expect, it, vi } from "vitest";
import { endLocalSession } from "./endLocalSession";
import { valkeyAdapter } from "./valkeyAdapter";

vi.mock("./valkeyAdapter", () => ({ valkeyAdapter: { deleteSession: vi.fn() } }));

describe("endLocalSession", () => {
  it("deletes the named session's record", async () => {
    await endLocalSession("session-abc");

    expect(valkeyAdapter.deleteSession).toHaveBeenCalledWith("session-abc");
  });
});
