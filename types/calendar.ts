export type CalendarProvider = "GOOGLE" | "APPLE";
export type CalendarSyncStatus = "SUCCESS" | "FAILED" | "CONFLICT";

export interface CalendarConnection {
  provider: CalendarProvider;
  connected: boolean;
  lastSyncedAt: string | null;
  nextSyncStatus: CalendarSyncStatus;
}

export interface CalendarSyncLog {
  id: string;
  provider: CalendarProvider;
  status: CalendarSyncStatus;
  message: string;
  syncedAt: string;
}
