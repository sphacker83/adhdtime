"use client";

import type { UserSettings } from "@/features/mvp/types/domain";
import type {
  ExternalSyncConflict,
  NotificationCapability,
  NotificationPermissionState,
  SyncMockOutcome
} from "@/features/mvp/integrations";

type MvpDashboardStyles = Record<string, string>;

export interface SettingsViewProps {
  styles: MvpDashboardStyles;
  notificationState: NotificationPermissionState;
  notificationFallbackText: string | null;
  notificationCapability: NotificationCapability;
  isRequestingNotificationPermission: boolean;
  onRequestNotification: () => void | Promise<void>;
  settings: UserSettings;
  onHapticEnabledChange: (enabled: boolean) => void;
  syncStatusLabel: string;
  syncMessage: string;
  syncLastJobId: string | null;
  syncConflict: ExternalSyncConflict | null;
  isSyncBusy: boolean;
  onRunSyncMock: (outcome: SyncMockOutcome) => void | Promise<void>;
  onResetAll: () => void;
}

export function SettingsView({
  styles,
  notificationState,
  notificationFallbackText,
  notificationCapability,
  isRequestingNotificationPermission,
  onRequestNotification,
  settings,
  onHapticEnabledChange,
  syncStatusLabel,
  syncMessage,
  syncLastJobId,
  syncConflict,
  isSyncBusy,
  onRunSyncMock,
  onResetAll
}: SettingsViewProps) {
  return (
    <section className={styles.listCard}>
      <header className={styles.listHeader}>
        <h3>설정</h3>
        <p>실행 흐름에 필요한 최소 옵션</p>
      </header>

      <div className={styles.settingsRow}>
        <div className={styles.settingsBody}>
          <strong>브라우저 알림</strong>
          <p>
            상태{" "}
            <span className={`${styles.capabilityBadge} ${styles[`capability_${notificationState}`]}`}>
              {notificationState}
            </span>
          </p>
          {notificationFallbackText ? (
            <p className={styles.fallbackText}>{notificationFallbackText}</p>
          ) : (
            <p className={styles.helperText}>
              mission_started/mission_completed/task_rescheduled 이벤트 시 1회 알림을 보냅니다.
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.smallButton}
          onClick={() => void onRequestNotification()}
          disabled={!notificationCapability.canRequestPermission || isRequestingNotificationPermission}
        >
          {isRequestingNotificationPermission ? "요청 중..." : "권한 요청"}
        </button>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsBody}>
          <strong>5분 미세 햅틱</strong>
          <p>진행 중 5분마다 짧게 진동합니다.</p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.hapticEnabled}
            onChange={(event) => {
              onHapticEnabledChange(event.target.checked);
            }}
          />
          <span>{settings.hapticEnabled ? "ON" : "OFF"}</span>
        </label>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsBody}>
          <strong>외부 동기화 Mock</strong>
          <p>
            상태{" "}
            <span className={`${styles.capabilityBadge} ${styles[`syncStatus_${syncStatusLabel}`]}`}>
              {syncStatusLabel}
            </span>
            {syncLastJobId ? ` · job ${syncLastJobId.slice(0, 8)}` : ""}
          </p>
          <p>{syncMessage}</p>
          {syncConflict ? (
            <p className={styles.conflictText}>
              conflict: {syncConflict.localEntityId} ↔ {syncConflict.sourceEventId}
            </p>
          ) : null}
        </div>
        <div className={styles.syncButtonRow}>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => void onRunSyncMock("SUCCESS")}
            disabled={isSyncBusy}
          >
            성공
          </button>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => void onRunSyncMock("FAILED")}
            disabled={isSyncBusy}
          >
            실패
          </button>
          <button
            type="button"
            className={styles.smallButtonDanger}
            onClick={() => void onRunSyncMock("CONFLICT")}
            disabled={isSyncBusy}
          >
            충돌
          </button>
        </div>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsBody}>
          <strong>데이터 초기화</strong>
          <p>로컬에 저장된 과업/미션/스탯을 모두 삭제합니다.</p>
        </div>
        <button type="button" className={styles.smallButtonDanger} onClick={onResetAll}>
          초기화
        </button>
      </div>

      <p className={styles.helperText}>원문 입력 텍스트는 로컬 저장을 최소화하도록 과업 제목만 유지합니다.</p>
    </section>
  );
}
