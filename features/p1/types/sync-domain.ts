export type ExternalSyncProvider = "GOOGLE_CALENDAR" | "APPLE_CALENDAR" | "NOTION";
export type ExternalSyncDirection = "PULL" | "PUSH" | "BIDIRECTIONAL";
export type ExternalSyncJobStatus = "IDLE" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CONFLICT";
export type ExternalSyncConflictResolution = "PENDING" | "LOCAL_WINS" | "REMOTE_WINS" | "MERGED";

export interface ExternalSyncConnection {
  provider: ExternalSyncProvider;
  accountId: string;
  connectedAt: string;
  enabled: boolean;
  scopes: string[];
  lastSyncedAt: string | null;
}

export interface ExternalSyncCursor {
  provider: ExternalSyncProvider;
  accountId: string;
  cursor: string | null;
  updatedAt: string;
}

export interface ExternalSyncJob {
  id: string;
  provider: ExternalSyncProvider;
  accountId: string;
  direction: ExternalSyncDirection;
  status: ExternalSyncJobStatus;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface ExternalSyncConflict {
  id: string;
  provider: ExternalSyncProvider;
  sourceEventId: string;
  localEntityId: string;
  detectedAt: string;
  resolution: ExternalSyncConflictResolution;
}

export interface ExternalSyncStateSnapshot {
  connections: ExternalSyncConnection[];
  cursors: ExternalSyncCursor[];
  jobs: ExternalSyncJob[];
  conflicts: ExternalSyncConflict[];
}
