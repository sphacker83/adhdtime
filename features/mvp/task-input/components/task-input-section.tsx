"use client";

import { useRef, useState, type RefObject } from "react";
import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type Task
} from "@/features/mvp/types/domain";
import type { SttCapability } from "@/features/mvp/integrations";
import {
  formatDateTimeLocalInput,
  formatRelativeDateLabel,
  formatTimeOfDayLabel,
  parseDateTimeLocalInput
} from "@/features/mvp/shared";

type MvpDashboardStyles = Record<string, string>;

export interface TaskInputSectionProps {
  styles: MvpDashboardStyles;
  sttSupportState: "supported" | "unsupported";
  taskInput: string;
  onTaskInputChange: (value: string) => void;
  isSttListening: boolean;
  onStartStt: () => void;
  onStopStt: () => void;
  sttCapability: SttCapability;
  onGenerateManualChunk: () => void;
  isExecutionLocked: boolean;
  activeTask: Task | null;
  onGenerateTask: () => void;
  isGenerating: boolean;
  taskTotalMinutesInput: string;
  onSetTaskTotalMinutesFromScheduled: (value: number) => void;
  onAdjustTaskTotalMinutesFromScheduled: (deltaMinutes: -5 | -1 | 1 | 5) => void;
  taskScheduledForInput: string;
  onTaskScheduledForInputChange: (value: string) => void;
  taskDueAtInput: string;
  onTaskDueAtInputChange: (value: string) => void;
  taskMetaFeedback: string | null;
  sttTranscript: string;
  sttError: string | null;
}

interface DateButtonValue {
  dateLabel: string;
  timeLabel: string;
}

function formatDateButtonValue(rawValue: string): DateButtonValue {
  const parsedDate = parseDateTimeLocalInput(rawValue);
  if (!parsedDate) {
    return {
      dateLabel: "미정",
      timeLabel: "--:--"
    };
  }

  return {
    dateLabel: formatRelativeDateLabel(parsedDate),
    timeLabel: formatTimeOfDayLabel(parsedDate)
  };
}

function formatMinutesButtonValue(rawValue: string): string {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return "--분";
  }

  return `${Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, parsed))}분`;
}

export function TaskInputSection({
  styles,
  sttSupportState,
  taskInput,
  onTaskInputChange,
  isSttListening,
  onStartStt,
  onStopStt,
  sttCapability,
  onGenerateManualChunk,
  isExecutionLocked,
  activeTask,
  onGenerateTask,
  isGenerating,
  taskTotalMinutesInput,
  onSetTaskTotalMinutesFromScheduled,
  onAdjustTaskTotalMinutesFromScheduled,
  taskScheduledForInput,
  onTaskScheduledForInputChange,
  taskDueAtInput,
  onTaskDueAtInputChange,
  taskMetaFeedback,
  sttTranscript,
  sttError
}: TaskInputSectionProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const scheduledForPickerRef = useRef<HTMLInputElement | null>(null);
  const dueAtPickerRef = useRef<HTMLInputElement | null>(null);
  const scheduledForButtonValue = formatDateButtonValue(taskScheduledForInput);
  const dueAtButtonValue = formatDateButtonValue(taskDueAtInput);
  const durationButtonValue = formatMinutesButtonValue(taskTotalMinutesInput);

  const getSafeTotalMinutes = (): number => {
    const parsed = Number.parseInt(taskTotalMinutesInput, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, parsed));
    }
    return 60;
  };

  const openDatePicker = (
    pickerRef: RefObject<HTMLInputElement | null>,
    fallbackValue: string,
    onConfirm: (nextValue: string) => void
  ): void => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!picker) {
      return;
    }

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const promptedValue = window.prompt(
      "날짜/시간을 선택하거나 YYYY-MM-DDTHH:mm 형식으로 입력하세요.",
      fallbackValue
    );
    if (promptedValue === null) {
      return;
    }

    const parsedDate = parseDateTimeLocalInput(promptedValue);
    if (!parsedDate) {
      return;
    }

    onConfirm(formatDateTimeLocalInput(parsedDate));
  };

  const handleDurationPrompt = (): void => {
    if (typeof window === "undefined") {
      return;
    }

    const promptedValue = window.prompt(
      `소요 시간을 입력하세요. (${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분)`,
      String(getSafeTotalMinutes())
    );
    if (promptedValue === null) {
      return;
    }

    const parsedMinutes = Number.parseInt(promptedValue, 10);
    if (!Number.isFinite(parsedMinutes)) {
      return;
    }

    onSetTaskTotalMinutesFromScheduled(parsedMinutes);
  };

  return (
    <section className={styles.inputCard}>
      <div className={styles.capabilityHeader}>
        <label className={styles.inputLabel} htmlFor="task-input">
          무지성 태스크 청킹 (AI TASK CHUNKING)
        </label>
        <div className={styles.inputHeaderActions}>
          <span className={`${styles.capabilityBadge} ${styles[`capability_${sttSupportState}`]}`}>
            STT {sttSupportState}
          </span>
          <button
            type="button"
            className={styles.subtleButton}
            onClick={() => setIsComposerOpen(true)}
          >
            퀘스트 추가
          </button>
        </div>
      </div>
      <div className={styles.inputRow}>
        <div className={styles.inputWithStt}>
          <input
            id="task-input"
            value={taskInput}
            onChange={(event) => onTaskInputChange(event.target.value)}
            placeholder="오늘 무엇을 쪼개볼까요? (예: 거실 청소)"
            className={`${styles.input} ${styles.inputWithSttPadding}`}
          />
          <button
            type="button"
            className={isSttListening ? `${styles.sttIconButton} ${styles.sttIconButtonActive}` : styles.sttIconButton}
            onClick={isSttListening ? onStopStt : onStartStt}
            disabled={!sttCapability.canStartRecognition && !isSttListening}
            aria-label={isSttListening ? "음성 입력 중지" : "음성 입력 시작"}
            title={isSttListening ? "음성 입력 중지" : "음성 입력 시작"}
          >
            <span aria-hidden="true">{isSttListening ? "■" : "🎙"}</span>
          </button>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={isGenerating}
          onClick={onGenerateTask}
        >
          {isGenerating ? "생성 중..." : "AI가 쪼개기"}
        </button>
      </div>
      <div className={styles.inputActionRow}>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={onGenerateManualChunk}
          disabled={isExecutionLocked || !activeTask}
        >
          청크 생성
        </button>
      </div>
      {sttTranscript ? <p className={styles.transcriptPreview}>미리보기: {sttTranscript}</p> : null}
      {sttError ? <p className={styles.errorText}>{sttError}</p> : null}
      {!sttCapability.canStartRecognition ? (
        <p className={styles.fallbackText}>STT를 지원하지 않는 환경입니다. 직접 텍스트 입력을 사용해주세요.</p>
      ) : null}

      {isComposerOpen ? (
        <div
          className={styles.questModalBackdrop}
          onClick={() => setIsComposerOpen(false)}
          role="presentation"
        >
          <section
            className={styles.questModal}
            role="dialog"
            aria-modal="true"
            aria-label="퀘스트 추가 또는 편집"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.questModalHeader}>
              <h3>퀘스트 추가/편집</h3>
              <button
                type="button"
                className={styles.subtleButton}
                onClick={() => setIsComposerOpen(false)}
                aria-label="퀘스트 모달 닫기"
              >
                ✕
              </button>
            </header>

            <label className={styles.metaField} htmlFor="task-modal-name">
              <span>퀘스트 이름</span>
              <input
                id="task-modal-name"
                value={taskInput}
                onChange={(event) => onTaskInputChange(event.target.value)}
                placeholder="청소하기"
                className={styles.input}
              />
            </label>

            <div className={styles.taskMetaGrid}>
              <div className={`${styles.metaField} ${styles.questTimeCard}`}>
                <button
                  type="button"
                  className={styles.questTimeButton}
                  onClick={() =>
                    openDatePicker(
                      scheduledForPickerRef,
                      taskScheduledForInput || formatDateTimeLocalInput(new Date()),
                      onTaskScheduledForInputChange
                    )
                  }
                >
                  <span className={styles.questTimeLabelRow}>
                    <span className={styles.questTimeIcon} aria-hidden="true">🕒</span>
                    <span className={styles.questTimeTitle}>시작 예정</span>
                    <span className={styles.questTimeSubLabel}>(StartAt)</span>
                  </span>
                  <strong className={styles.questTimeValue}>
                    <span className={styles.questTimeValuePrimary}>{scheduledForButtonValue.dateLabel}</span>
                    <span className={styles.questTimeValueSecondary}>{scheduledForButtonValue.timeLabel}</span>
                  </strong>
                </button>
                <input
                  ref={scheduledForPickerRef}
                  type="datetime-local"
                  value={taskScheduledForInput}
                  onChange={(event) => onTaskScheduledForInputChange(event.target.value)}
                  className={styles.questHiddenDateInput}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <div className={`${styles.metaField} ${styles.questTimeCard}`}>
                <button
                  type="button"
                  className={styles.questTimeButton}
                  onClick={() =>
                    openDatePicker(
                      dueAtPickerRef,
                      taskDueAtInput || formatDateTimeLocalInput(new Date()),
                      onTaskDueAtInputChange
                    )
                  }
                >
                  <span className={styles.questTimeLabelRow}>
                    <span className={styles.questTimeIcon} aria-hidden="true">📅</span>
                    <span className={styles.questTimeTitle}>마감 기한</span>
                    <span className={styles.questTimeSubLabel}>(DueAt)</span>
                  </span>
                  <strong className={styles.questTimeValue}>
                    <span className={styles.questTimeValuePrimary}>{dueAtButtonValue.dateLabel}</span>
                    <span className={styles.questTimeValueSecondary}>{dueAtButtonValue.timeLabel}</span>
                  </strong>
                </button>
                <input
                  ref={dueAtPickerRef}
                  type="datetime-local"
                  value={taskDueAtInput}
                  onChange={(event) => onTaskDueAtInputChange(event.target.value)}
                  className={styles.questHiddenDateInput}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <div className={`${styles.metaField} ${styles.questTimeCard}`}>
                <button
                  type="button"
                  className={styles.questTimeButton}
                  onClick={handleDurationPrompt}
                >
                  <span className={styles.questTimeLabelRow}>
                    <span className={styles.questTimeIcon} aria-hidden="true">⏳</span>
                    <span className={styles.questTimeTitle}>소요 시간</span>
                    <span className={styles.questTimeSubLabel}>(EstimateMin)</span>
                  </span>
                  <strong className={`${styles.questTimeValue} ${styles.questTimeValueSingle}`}>
                    <span className={styles.questTimeValuePrimary}>{durationButtonValue}</span>
                  </strong>
                </button>
              </div>
            </div>

            <div className={styles.questPresetRow}>
              <button type="button" className={styles.taskChip} onClick={() => onAdjustTaskTotalMinutesFromScheduled(-5)}>-5분</button>
              <button type="button" className={styles.taskChip} onClick={() => onAdjustTaskTotalMinutesFromScheduled(-1)}>-1분</button>
              <button type="button" className={styles.taskChip} onClick={() => onAdjustTaskTotalMinutesFromScheduled(1)}>+1분</button>
              <button type="button" className={styles.taskChip} onClick={() => onAdjustTaskTotalMinutesFromScheduled(5)}>+5분</button>
            </div>

            {taskMetaFeedback ? <p className={styles.errorText}>{taskMetaFeedback}</p> : null}

            <div className={styles.questModalFooter}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={isGenerating}
                onClick={() => {
                  onGenerateTask();
                  setIsComposerOpen(false);
                }}
              >
                {isGenerating ? "생성 중..." : "퀘스트 생성!"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
