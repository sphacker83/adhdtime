"use client";

import { useState } from "react";
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

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const getSafeTotalMinutes = (): number => {
    const parsed = Number.parseInt(taskTotalMinutesInput, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, parsed));
    }
    return 60;
  };

  const applyTotalMinuteDelta = (deltaMinutes: number): void => {
    const nextMinutes = Math.min(
      MAX_TASK_TOTAL_MINUTES,
      Math.max(MIN_TASK_TOTAL_MINUTES, getSafeTotalMinutes() + deltaMinutes)
    );
    onTaskTotalMinutesInputChange(String(nextMinutes));
  };

  const handleApplyAfternoonPreset = (): void => {
    const scheduledDate = new Date();
    scheduledDate.setHours(16, 30, 0, 0);
    if (scheduledDate.getTime() < Date.now()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const dueAtDate = new Date(scheduledDate.getTime() + getSafeTotalMinutes() * 60 * 1000);
    onTaskScheduledForInputChange(toDateTimeLocalValue(scheduledDate));
    onTaskDueAtInputChange(toDateTimeLocalValue(dueAtDate));
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
            퀘스트 추가/편집
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
        <p className={styles.helperText}>Easy for thumb access</p>
      </div>
      <p className={styles.helperText}>
        총 시간은 {MIN_TASK_TOTAL_MINUTES}~{MAX_TASK_TOTAL_MINUTES}분 범위이며, 시작 예정 시간은 마감보다 늦을 수 없습니다.
      </p>
      <p className={styles.helperText}>로컬 패턴 우선, 필요 시 AI 폴백으로 청킹합니다. STT 엔진: {sttCapability.engine}</p>
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
              <label className={`${styles.metaField} ${styles.questTimeCard}`} htmlFor="task-scheduled-for">
                <span>시작 예정 (StartAt)</span>
                <input
                  id="task-scheduled-for"
                  type="datetime-local"
                  value={taskScheduledForInput}
                  onChange={(event) => onTaskScheduledForInputChange(event.target.value)}
                  className={styles.input}
                />
              </label>
              <label className={`${styles.metaField} ${styles.questTimeCard}`} htmlFor="task-due-at">
                <span>마감 기한 (DueAt)</span>
                <input
                  id="task-due-at"
                  type="datetime-local"
                  value={taskDueAtInput}
                  onChange={(event) => onTaskDueAtInputChange(event.target.value)}
                  className={styles.input}
                />
              </label>
              <label className={`${styles.metaField} ${styles.questTimeCard}`} htmlFor="task-total-minutes">
                <span>소요 시간 (EstimateMin)</span>
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
            </div>

            <div className={styles.questPresetRow}>
              <button type="button" className={styles.taskChip} onClick={() => applyTotalMinuteDelta(10)}>+10분</button>
              <button type="button" className={styles.taskChip} onClick={() => applyTotalMinuteDelta(1)}>+1분</button>
              <button type="button" className={styles.taskChip} onClick={handleApplyAfternoonPreset}>오후 중</button>
              <button type="button" className={styles.taskChip} onClick={() => applyTotalMinuteDelta(6)}>+6분</button>
            </div>

            {taskMetaFeedback ? <p className={styles.errorText}>{taskMetaFeedback}</p> : null}

            <div className={styles.questModalFooter}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setIsComposerOpen(false)}
              >
                닫기
              </button>
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
