const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function parseIsoDate(isoValue?: string): Date | null {
  if (!isoValue) {
    return null;
  }

  const timestamp = Date.parse(isoValue);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function normalizeTotalMinutes(totalMinutes: number): number {
  if (!Number.isFinite(totalMinutes)) {
    return 0;
  }

  return Math.max(0, Math.floor(totalMinutes));
}

export function parseDateTimeLocalInput(rawInput: string): Date | null {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  const match = DATE_TIME_LOCAL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || !Number.isInteger(hour)
    || !Number.isInteger(minute)
    || !Number.isInteger(second)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, second, 0);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
    || parsed.getHours() !== hour
    || parsed.getMinutes() !== minute
    || parsed.getSeconds() !== second
  ) {
    return null;
  }

  return parsed;
}

export function formatDateTimeLocalInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function getDiffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function parseOptionalDateTimeInput(rawInput: string): string | undefined {
  const parsed = parseDateTimeLocalInput(rawInput);
  if (!parsed) {
    return undefined;
  }

  return parsed.toISOString();
}

export interface NormalizedTaskSchedule {
  scheduledFor?: string;
  dueAt?: string;
  changed: boolean;
}

export interface NormalizeTaskScheduleIsoOptions {
  scheduledFor?: string;
  dueAt?: string;
  totalMinutes: number;
  fallbackStartAt?: Date;
}

export function normalizeTaskScheduleIso({
  scheduledFor,
  dueAt,
  totalMinutes,
  fallbackStartAt
}: NormalizeTaskScheduleIsoOptions): NormalizedTaskSchedule {
  const normalizedTotalMinutes = normalizeTotalMinutes(totalMinutes);
  let normalizedScheduledFor = parseIsoDate(scheduledFor);
  let normalizedDueAt = parseIsoDate(dueAt);

  if (!normalizedScheduledFor && !normalizedDueAt && fallbackStartAt) {
    normalizedScheduledFor = new Date(fallbackStartAt.getTime());
  }

  if (normalizedScheduledFor && !normalizedDueAt) {
    normalizedDueAt = addMinutesToDate(normalizedScheduledFor, normalizedTotalMinutes);
  }

  if (!normalizedScheduledFor && normalizedDueAt) {
    normalizedScheduledFor = addMinutesToDate(normalizedDueAt, -normalizedTotalMinutes);
  }

  if (normalizedScheduledFor && normalizedDueAt) {
    if (normalizedScheduledFor.getTime() > normalizedDueAt.getTime()) {
      normalizedDueAt = addMinutesToDate(normalizedScheduledFor, normalizedTotalMinutes);
    }

    if (getDiffMinutes(normalizedScheduledFor, normalizedDueAt) !== normalizedTotalMinutes) {
      normalizedDueAt = addMinutesToDate(normalizedScheduledFor, normalizedTotalMinutes);
    }
  }

  const nextScheduledFor = normalizedScheduledFor?.toISOString();
  const nextDueAt = normalizedDueAt?.toISOString();

  return {
    scheduledFor: nextScheduledFor,
    dueAt: nextDueAt,
    changed: nextScheduledFor !== scheduledFor || nextDueAt !== dueAt
  };
}

export interface NormalizeTaskScheduleFromLocalInputsOptions {
  scheduledForInput: string;
  dueAtInput: string;
  totalMinutes: number;
  fallbackStartAt?: Date;
}

export function normalizeTaskScheduleFromLocalInputs({
  scheduledForInput,
  dueAtInput,
  totalMinutes,
  fallbackStartAt
}: NormalizeTaskScheduleFromLocalInputsOptions): NormalizedTaskSchedule | null {
  const trimmedScheduledForInput = scheduledForInput.trim();
  const trimmedDueAtInput = dueAtInput.trim();
  const parsedScheduledFor = parseDateTimeLocalInput(trimmedScheduledForInput);
  const parsedDueAt = parseDateTimeLocalInput(trimmedDueAtInput);

  if ((trimmedScheduledForInput && !parsedScheduledFor) || (trimmedDueAtInput && !parsedDueAt)) {
    return null;
  }

  return normalizeTaskScheduleIso({
    scheduledFor: parsedScheduledFor?.toISOString(),
    dueAt: parsedDueAt?.toISOString(),
    totalMinutes,
    fallbackStartAt
  });
}

export function buildNextRescheduleDate(now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}
