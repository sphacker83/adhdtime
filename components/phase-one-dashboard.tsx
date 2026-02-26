"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { TaskFormModal } from "@/components/task-form-modal";
import { TimerCircle } from "@/components/timer-circle";
import { createInitialTimerState, timerReducer } from "@/lib/timer";
import type { Importance, TaskItem } from "@/types/task";

interface TaskFormValues {
  title: string;
  description: string;
  importance: Importance;
  priority: number;
  dueAt: string;
}

function createMockTasks(): TaskItem[] {
  const now = Date.now();
  return [
    {
      id: "task-1",
      title: "제안서 제출",
      description: "핵심 요구사항 섹션 최종 정리",
      importance: "HIGH",
      priority: 1,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      completed: false
    },
    {
      id: "task-2",
      title: "세금 신고 서류 점검",
      description: "증빙 누락 여부 확인",
      importance: "MEDIUM",
      priority: 2,
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(now + 7 * 60 * 60 * 1000).toISOString(),
      completed: false
    },
    {
      id: "task-3",
      title: "미팅 준비",
      importance: "LOW",
      priority: 4,
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(now + 20 * 60 * 60 * 1000).toISOString(),
      completed: true
    }
  ];
}

function findDefaultSelected(tasks: TaskItem[]): string | null {
  const firstOpen = tasks.find((item) => !item.completed);
  if (firstOpen) {
    return firstOpen.id;
  }
  return tasks[0]?.id ?? null;
}

export function PhaseOneDashboard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [timerState, dispatchTimer] = useReducer(timerReducer, undefined, createInitialTimerState);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }
    return tasks.find((item) => item.id === selectedTaskId) ?? null;
  }, [tasks, selectedTaskId]);

  const activeDuration =
    timerState.phase === "focus" ? timerState.focusSeconds : timerState.breakSeconds;

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [tasks]
  );

  useEffect(() => {
    const initial = createMockTasks();
    setTasks(initial);
    setSelectedTaskId(findDefaultSelected(initial));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timerState.status !== "running") {
      return;
    }

    const tickTimer = window.setInterval(() => {
      dispatchTimer({ type: "tick" });
    }, 1000);

    return () => window.clearInterval(tickTimer);
  }, [timerState.status]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const saveTask = (values: TaskFormValues) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: values.title,
                description: values.description,
                importance: values.importance,
                priority: values.priority,
                dueAt: values.dueAt
              }
            : task
        )
      );
      closeModal();
      return;
    }

    const newTask: TaskItem = {
      id: `task-${crypto.randomUUID()}`,
      title: values.title,
      description: values.description,
      importance: values.importance,
      priority: values.priority,
      createdAt: new Date().toISOString(),
      dueAt: values.dueAt,
      completed: false
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    closeModal();
  };

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed
            }
          : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (selectedTaskId === id) {
        setSelectedTaskId(findDefaultSelected(filtered));
      }
      return filtered;
    });
  };

  const onChangeFocus = (value: string) => {
    dispatchTimer({ type: "setDurations", focusMinutes: Number(value) || 1, breakMinutes: timerState.breakSeconds / 60 });
  };

  const onChangeBreak = (value: string) => {
    dispatchTimer({ type: "setDurations", focusMinutes: timerState.focusSeconds / 60, breakMinutes: Number(value) || 1 });
  };

  return (
    <main className="page-wrap">
      <section className="hero-panel">
        <div className="hero-header">
          <div>
            <p className="eyebrow">Phase 1 Demo</p>
            <h1>ADHD Time Focus Board</h1>
            <p className="subtext">지금 해야 할 작업을 선택하고 바로 타이머를 시작하세요.</p>
          </div>
          <button type="button" className="solid-btn" onClick={openCreateModal}>
            + 일정 추가
          </button>
        </div>

        <div className="timer-panel">
          <TimerCircle
            totalSeconds={activeDuration}
            remainingSeconds={timerState.remainingSeconds}
            phase={timerState.phase}
          />

          <div className="timer-actions">
            <p className="selected-task-label">
              연결 일정: <strong>{selectedTask?.title ?? "선택된 일정 없음"}</strong>
            </p>

            <div className="duration-inputs">
              <label>
                집중(분)
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={Math.floor(timerState.focusSeconds / 60)}
                  onChange={(e) => onChangeFocus(e.target.value)}
                />
              </label>
              <label>
                휴식(분)
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={Math.floor(timerState.breakSeconds / 60)}
                  onChange={(e) => onChangeBreak(e.target.value)}
                />
              </label>
            </div>

            <div className="timer-btn-group">
              {timerState.status === "running" ? (
                <button type="button" className="solid-btn" onClick={() => dispatchTimer({ type: "pause" })}>
                  일시정지
                </button>
              ) : timerState.status === "paused" ? (
                <button type="button" className="solid-btn" onClick={() => dispatchTimer({ type: "resume" })}>
                  재개
                </button>
              ) : (
                <button type="button" className="solid-btn" onClick={() => dispatchTimer({ type: "start" })}>
                  시작
                </button>
              )}

              <button type="button" className="ghost-btn" onClick={() => dispatchTimer({ type: "nextPhase" })}>
                다음 세션
              </button>
              <button type="button" className="ghost-btn" onClick={() => dispatchTimer({ type: "stop" })}>
                종료
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="tasks-panel">
        <header className="tasks-header">
          <h2>일정 목록</h2>
          <p suppressHydrationWarning>{currentTime.toLocaleString("ko-KR")}</p>
        </header>

        <div className="task-grid">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={currentTime}
              selected={task.id === selectedTaskId}
              onSelect={setSelectedTaskId}
              onToggleComplete={toggleComplete}
              onEdit={openEditModal}
              onDelete={deleteTask}
            />
          ))}
        </div>
      </section>

      <TaskFormModal open={modalOpen} task={editingTask} onClose={closeModal} onSave={saveTask} />
    </main>
  );
}
