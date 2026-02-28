"use client";

import { useRef, useState, type RefObject } from "react";
import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES
} from "@/features/mvp/types/domain";
import type { SttCapability } from "@/features/mvp/integrations";
import {
  formatDateTimeLocalInput,
  formatRelativeDateLabel,
  formatTimeOfDayLabel,
  parseDateTimeLocalInput
} from "@/features/mvp/shared";

type MvpDashboardStyles = Record<string, string>;

export interface QuestSuggestion {
  id: string;
  title: string;
  rerankConfidence: number;
  routeConfidence: number;
}

export interface SubmitTaskResult {
  ok: boolean;
  reason: string;
  message: string;
}

export interface TaskInputSectionProps {
  styles: MvpDashboardStyles;
  isComposerOpen: boolean;
  composerMode: "create" | "edit";
  onCloseComposer: () => void;
  sttSupportState: "supported" | "unsupported";
  taskInput: string;
  onTaskInputChange: (value: string) => void;
  questSuggestions: QuestSuggestion[];
  selectedQuestSuggestionId: string | null;
  onSelectQuestSuggestion: (suggestionId: string, title: string) => void;
  isSttListening: boolean;
  onStartStt: () => void;
  onStopStt: () => void;
  sttCapability: SttCapability;
  onSubmitTask: () => Promise<SubmitTaskResult>;
  feedbackMessage: string;
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
    return "--";
  }

  return `${Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, parsed))}분`;
}

function formatConfidencePercent(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (safeValue === 1) {
    return "100%";
  }

  const percent = Math.min(99.9, safeValue * 100);
  return `${percent.toFixed(1)}%`;
}

export function TaskInputSection(props: TaskInputSectionProps) {
  const {
    styles,
    isComposerOpen,
    composerMode,
    onCloseComposer,
    sttSupportState,
    taskInput,
    onTaskInputChange,
    questSuggestions,
    selectedQuestSuggestionId,
    onSelectQuestSuggestion,
    isSttListening,
    onStartStt,
    onStopStt,
    sttCapability,
    onSubmitTask,
    feedbackMessage,
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
  } = props;
  const [submitFeedbackOverride, setSubmitFeedbackOverride] = useState<string | null>(null);
  const scheduledForPickerRef = useRef<HTMLInputElement | null>(null);
  const dueAtPickerRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = composerMode === "edit";
  const composerTitle = isEditMode ? "퀘스트 수정" : "AI 퀘스트 생성";
  const composerActionLabel = isEditMode
    ? (isGenerating ? "수정 중..." : "퀘스트 수정")
    : (isGenerating ? "생성 중..." : "AI 퀘스트 생성");
  const scheduledForButtonValue = formatDateButtonValue(taskScheduledForInput);
  const dueAtButtonValue = formatDateButtonValue(taskDueAtInput);
  const durationButtonValue = formatMinutesButtonValue(taskTotalMinutesInput);
  const shouldShowQuestSuggestions = taskInput.trim().length >= 2;
  const modalFeedbackMessage = submitFeedbackOverride ?? feedbackMessage;

  const handleCloseComposer = (): void => {
    setSubmitFeedbackOverride(null);
    onCloseComposer();
  };

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

  const handleSubmitClick = async (): Promise<void> => {
    setSubmitFeedbackOverride(null);
    try {
      const result = await onSubmitTask();
      if (result.ok) {
        handleCloseComposer();
        return;
      }

      const failedMessage = result.message?.trim()
        ? result.message
        : "요청 처리에 실패했습니다. 입력 내용을 확인하고 다시 시도해주세요.";
      setSubmitFeedbackOverride(failedMessage);
    } catch (error) {
      console.error("퀘스트 제출 처리 중 오류:", error);
      setSubmitFeedbackOverride("요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <>
      {isComposerOpen ? (
        <div
          className={styles.questModalBackdrop}
          onClick={handleCloseComposer}
          role="presentation"
        >
          <section
            className={styles.questModal}
            role="dialog"
            aria-modal="true"
            aria-label={composerTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.questModalHeader}>
              <div className={styles.questModalHeaderMain}>
                <h3>{composerTitle}</h3>
                <span className={`${styles.capabilityBadge} ${styles[`capability_${sttSupportState}`]}`}>
                  STT {sttSupportState}
                </span>
              </div>
              <button
                type="button"
                className={styles.subtleButton}
                onClick={handleCloseComposer}
                aria-label="퀘스트 모달 닫기"
              >
                ✕
              </button>
            </header>

            <label className={styles.metaField} htmlFor="task-modal-name">
              <span>퀘스트 이름</span>
              <div className={styles.inputWithStt}>
                <input
                  id="task-modal-name"
                  value={taskInput}
                  onChange={(event) => onTaskInputChange(event.target.value)}
                  placeholder="청소하기"
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
            </label>
            {shouldShowQuestSuggestions ? (
              questSuggestions.length > 0 ? (
                <div className={styles.questRecommendationList} role="list" aria-label="추천 퀘스트">
                  {questSuggestions.map((recommendation) => (
                    <button
                      key={recommendation.id}
                      type="button"
                      className={
                        recommendation.id === selectedQuestSuggestionId
                          ? `${styles.questRecommendationItem} ${styles.questRecommendationItemActive}`
                          : styles.questRecommendationItem
                      }
                      aria-pressed={recommendation.id === selectedQuestSuggestionId}
                      onClick={() => onSelectQuestSuggestion(recommendation.id, recommendation.title)}
                    >
                      <span className={styles.questRecommendationTitle}>{recommendation.title}</span>
                      <span className={styles.questRecommendationMeta}>
                        유사도 {formatConfidencePercent(recommendation.rerankConfidence)}
                        {" · "}
                        연관도 {formatConfidencePercent(recommendation.routeConfidence)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.questRecommendationEmpty}>
                  추천 퀘스트가 없어요. 2자 이상으로 조금 더 구체적으로 입력해보세요.
                </p>
              )
            ) : null}
            {sttTranscript ? <p className={styles.transcriptPreview}>미리보기: {sttTranscript}</p> : null}
            {sttError ? <p className={styles.errorText}>{sttError}</p> : null}
            {!sttCapability.canStartRecognition ? (
              <p className={styles.fallbackText}>STT를 지원하지 않는 환경입니다. 직접 텍스트 입력을 사용해주세요.</p>
            ) : null}

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
            {modalFeedbackMessage ? <p className={styles.questComposerFeedback}>{modalFeedbackMessage}</p> : null}

            <div className={styles.questModalFooter}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={isGenerating}
                onClick={() => {
                  void handleSubmitClick();
                }}
              >
                {composerActionLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
