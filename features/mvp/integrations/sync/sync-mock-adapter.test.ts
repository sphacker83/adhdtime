import { describe, expect, it } from "vitest";
import { createSyncMockAdapter } from "./sync-mock-adapter";

describe("sync-mock-adapter", () => {
  it("emits queued -> running -> success transitions", async () => {
    const adapter = createSyncMockAdapter("GOOGLE_CALENDAR");
    const statuses: string[] = [];

    const transition = await adapter.simulateSync({
      outcome: "SUCCESS",
      stepDelayMs: 0,
      onTransition: ({ job }) => {
        statuses.push(job.status);
      }
    });

    expect(statuses).toEqual(["QUEUED", "RUNNING", "SUCCESS"]);
    expect(transition.job.status).toBe("SUCCESS");
    expect(transition.conflict).toBeNull();
  });

  it("returns failed job metadata", async () => {
    const adapter = createSyncMockAdapter("GOOGLE_CALENDAR");
    const transition = await adapter.simulateSync({
      outcome: "FAILED",
      stepDelayMs: 0
    });

    expect(transition.job.status).toBe("FAILED");
    expect(transition.job.retryCount).toBe(1);
    expect(transition.job.errorCode).toBe("MOCK_NETWORK_ERROR");
    expect(transition.conflict).toBeNull();
  });

  it("returns conflict metadata when conflict occurs", async () => {
    const adapter = createSyncMockAdapter("GOOGLE_CALENDAR");
    const transition = await adapter.simulateSync({
      outcome: "CONFLICT",
      stepDelayMs: 0
    });

    expect(transition.job.status).toBe("CONFLICT");
    expect(transition.job.errorCode).toBe("MOCK_CONFLICT");
    expect(transition.conflict?.resolution).toBe("PENDING");
    expect(transition.conflict?.sourceEventId.startsWith("remote-")).toBe(true);
  });
});
