import type {
  ExternalSyncConflict,
  ExternalSyncDirection,
  ExternalSyncJob,
  ExternalSyncProvider
} from "@/features/p1/types/sync-domain";

const DEFAULT_ACCOUNT_ID = "mock-user";
const DEFAULT_DIRECTION: ExternalSyncDirection = "BIDIRECTIONAL";
const DEFAULT_STEP_DELAY_MS = 600;

export type SyncMockOutcome = "SUCCESS" | "FAILED" | "CONFLICT";

export interface SyncMockTransition {
  job: ExternalSyncJob;
  conflict: ExternalSyncConflict | null;
}

export interface SyncMockOptions {
  accountId?: string;
  direction?: ExternalSyncDirection;
  outcome?: SyncMockOutcome;
  stepDelayMs?: number;
  onTransition?: (transition: SyncMockTransition) => void;
}

export interface SyncMockAdapter {
  provider: ExternalSyncProvider;
  simulateSync: (options?: SyncMockOptions) => Promise<SyncMockTransition>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

function emitTransition(
  onTransition: SyncMockOptions["onTransition"],
  transition: SyncMockTransition
): SyncMockTransition {
  onTransition?.(transition);
  return transition;
}

function createInitialJob(params: {
  provider: ExternalSyncProvider;
  accountId: string;
  direction: ExternalSyncDirection;
  enqueuedAt: string;
}): ExternalSyncJob {
  return {
    id: crypto.randomUUID(),
    provider: params.provider,
    accountId: params.accountId,
    direction: params.direction,
    status: "QUEUED",
    enqueuedAt: params.enqueuedAt,
    startedAt: null,
    finishedAt: null,
    retryCount: 0
  };
}

function createConflict(params: {
  provider: ExternalSyncProvider;
  accountId: string;
  jobId: string;
  detectedAt: string;
}): ExternalSyncConflict {
  const key = params.jobId.slice(0, 8);
  return {
    id: crypto.randomUUID(),
    provider: params.provider,
    sourceEventId: `remote-${key}`,
    localEntityId: `local-${params.accountId}`,
    detectedAt: params.detectedAt,
    resolution: "PENDING"
  };
}

export function createSyncMockAdapter(provider: ExternalSyncProvider): SyncMockAdapter {
  return {
    provider,
    async simulateSync(options) {
      const accountId = options?.accountId ?? DEFAULT_ACCOUNT_ID;
      const direction = options?.direction ?? DEFAULT_DIRECTION;
      const outcome = options?.outcome ?? "SUCCESS";
      const stepDelayMs = options?.stepDelayMs ?? DEFAULT_STEP_DELAY_MS;
      const onTransition = options?.onTransition;

      const enqueuedAt = new Date().toISOString();
      const queuedJob = createInitialJob({
        provider,
        accountId,
        direction,
        enqueuedAt
      });
      emitTransition(onTransition, { job: queuedJob, conflict: null });

      await sleep(stepDelayMs);

      const runningJob: ExternalSyncJob = {
        ...queuedJob,
        status: "RUNNING",
        startedAt: new Date().toISOString()
      };
      emitTransition(onTransition, { job: runningJob, conflict: null });

      await sleep(stepDelayMs);

      const finishedAt = new Date().toISOString();
      let finalJob: ExternalSyncJob = {
        ...runningJob,
        status: "SUCCESS",
        finishedAt
      };
      let conflict: ExternalSyncConflict | null = null;

      if (outcome === "FAILED") {
        finalJob = {
          ...runningJob,
          status: "FAILED",
          finishedAt,
          retryCount: 1,
          errorCode: "MOCK_NETWORK_ERROR",
          errorMessage: "Mock adapter simulated a network failure."
        };
      }

      if (outcome === "CONFLICT") {
        finalJob = {
          ...runningJob,
          status: "CONFLICT",
          finishedAt,
          errorCode: "MOCK_CONFLICT",
          errorMessage: "Mock adapter detected a data conflict."
        };
        conflict = createConflict({
          provider,
          accountId,
          jobId: finalJob.id,
          detectedAt: finishedAt
        });
      }

      return emitTransition(onTransition, { job: finalJob, conflict });
    }
  };
}
