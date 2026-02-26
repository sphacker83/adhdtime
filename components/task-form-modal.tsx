"use client";

import { useEffect, useMemo, useState } from "react";
import type { Importance, TaskItem } from "@/types/task";

interface TaskFormValues {
  title: string;
  description: string;
  importance: Importance;
  dueAt: string;
}

interface TaskFormModalProps {
  open: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
}

function toInputDateTime(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function defaultDueAtLocal(): string {
  const date = new Date();
  date.setHours(date.getHours() + 2);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

export function TaskFormModal({ open, task, onClose, onSave }: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("MEDIUM");
  const [dueAt, setDueAt] = useState(defaultDueAtLocal());
  const [error, setError] = useState<string | null>(null);

  const modeLabel = useMemo(() => (task ? "일정 수정" : "새 일정"), [task]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setImportance(task.importance);
      setDueAt(toInputDateTime(task.dueAt));
      setError(null);
      return;
    }

    setTitle("");
    setDescription("");
    setImportance("MEDIUM");
    setDueAt(defaultDueAtLocal());
    setError(null);
  }, [open, task]);

  if (!open) {
    return null;
  }

  const submit = () => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      setError("제목을 입력해주세요.");
      return;
    }

    const dueDate = new Date(dueAt);
    if (Number.isNaN(dueDate.getTime())) {
      setError("마감 시간을 정확히 선택해주세요.");
      return;
    }

    if (dueDate.getTime() <= Date.now()) {
      setError("마감 시간은 현재보다 이후여야 합니다.");
      return;
    }

    onSave({
      title: safeTitle,
      description: description.trim(),
      importance,
      dueAt: dueDate.toISOString()
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={modeLabel}>
      <div className="modal">
        <header className="modal-header">
          <h3>{modeLabel}</h3>
          <button type="button" className="ghost-btn" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>제목</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 제안서 제출" />
          </label>

          <label className="field">
            <span>설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="선택 입력"
              rows={3}
            />
          </label>

          <label className="field">
            <span>마감</span>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>

          <div className="field">
            <span>중요도</span>
            <div className="inline-options">
              {(["HIGH", "MEDIUM", "LOW"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={importance === item ? "chip active" : "chip"}
                  onClick={() => setImportance(item)}
                >
                  {item === "HIGH" ? "긴급" : item === "MEDIUM" ? "보통" : "낮음"}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="ghost-btn" onClick={onClose}>
            취소
          </button>
          <button type="button" className="solid-btn" onClick={submit}>
            저장
          </button>
        </footer>
      </div>
    </div>
  );
}
