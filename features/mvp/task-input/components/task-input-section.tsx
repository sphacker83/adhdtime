"use client";

import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type Task
} from "@/features/mvp/types/domain";
import type { SttCapability } from "@/features/mvp/integrations";

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
  onTaskTotalMinutesInputChange: (value: string) => void;
  taskScheduledForInput: string;
  onTaskScheduledForInputChange: (value: string) => void;
  taskDueAtInput: string;
  onTaskDueAtInputChange: (value: string) => void;
  taskMetaFeedback: string | null;
  sttTranscript: string;
  sttError: string | null;
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
  onTaskTotalMinutesInputChange,
  taskScheduledForInput,
  onTaskScheduledForInputChange,
  taskDueAtInput,
  onTaskDueAtInputChange,
  taskMetaFeedback,
  sttTranscript,
  sttError
}: TaskInputSectionProps) {
  return (
    <section className={styles.inputCard}>
      <div className={styles.capabilityHeader}>
        <label className={styles.inputLabel} htmlFor="task-input">
          무지성 태스크 청킹
        </label>
        <span className={`${styles.capabilityBadge} ${styles[`capability_${sttSupportState}`]}`}>
          STT {sttSupportState}
        </span>
      </div>
      <div className={styles.inputRow}>
        <div className={styles.inputWithStt}>
          <input
            id="task-input"
            value={taskInput}
            onChange={(event) => onTaskInputChange(event.target.value)}
            placeholder="예: 방 청소, 제안서 마무리, 메일 답장"
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
          className={styles.ghostButton}
          onClick={onGenerateManualChunk}
          disabled={isExecutionLocked || !activeTask}
        >
          청크 생성
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={isGenerating}
          onClick={onGenerateTask}
        >
          {isGenerating ? "생성 중..." : "AI가 쪼개기"}
        </button>
      </div>
      <div className={styles.taskMetaGrid}>
        <label className={styles.metaField} htmlFor="task-total-minutes">
          <span>총 소요 시간(필수)</span>
          <input
            id="task-total-minutes"
            type="number"
            min={MIN_TASK_TOTAL_MINUTES}
            max={MAX_TASK_TOTAL_MINUTES}
            value={taskTotalMinutesInput}
            onChange={(event) => onTaskTotalMinutesInputChange(event.target.value)}
            className={styles.input}
            inputMode="numeric"
            required
          />
        </label>
        <label className={styles.metaField} htmlFor="task-scheduled-for">
          <span>시작 예정(선택)</span>
          <input
            id="task-scheduled-for"
            type="datetime-local"
            value={taskScheduledForInput}
            onChange={(event) => onTaskScheduledForInputChange(event.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.metaField} htmlFor="task-due-at">
          <span>마감(선택)</span>
          <input
            id="task-due-at"
            type="datetime-local"
            value={taskDueAtInput}
            onChange={(event) => onTaskDueAtInputChange(event.target.value)}
            className={styles.input}
          />
        </label>
      </div>
      <p className={styles.helperText}>
        총 시간은 {MIN_TASK_TOTAL_MINUTES}~{MAX_TASK_TOTAL_MINUTES}분 범위이며, 시작 예정 시간은 마감보다 늦을 수 없습니다.
      </p>
      {taskMetaFeedback ? <p className={styles.errorText}>{taskMetaFeedback}</p> : null}
      <p className={styles.helperText}>로컬 패턴 우선, 필요 시 AI 폴백으로 청킹합니다. STT 엔진: {sttCapability.engine}</p>
      {sttTranscript ? <p className={styles.transcriptPreview}>미리보기: {sttTranscript}</p> : null}
      {sttError ? <p className={styles.errorText}>{sttError}</p> : null}
      {!sttCapability.canStartRecognition ? (
        <p className={styles.fallbackText}>STT를 지원하지 않는 환경입니다. 직접 텍스트 입력을 사용해주세요.</p>
      ) : null}
    </section>
  );
}
