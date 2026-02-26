"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DeadlineRing } from "@/components/deadline-ring";
import { TaskCard } from "@/components/task-card";
import { TaskFormModal } from "@/components/task-form-modal";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ImportanceHighIcon,
  ImportanceLowIcon,
  ImportanceMediumIcon,
  MenuIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon
} from "@/components/ui-icons";
import { formatDDayLabel, formatDueDateLabel, formatHMS } from "@/lib/deadline";
import {
  cycleTaskRunState,
  getTaskActionUi,
  getTaskProgressPercent,
  isTaskCompleted,
  type TaskActionIcon
} from "@/lib/task-state";
import { getVisibleTasks } from "@/lib/task-list";
import type { CalendarConnection, CalendarProvider, CalendarSyncLog, CalendarSyncStatus } from "@/types/calendar";
import type {
  Importance,
  TaskImportanceFilter,
  TaskItem,
  TaskRunState,
  TaskSortOption
} from "@/types/task";

interface TaskFormValues {
  title: string;
  description: string;
  importance: Importance;
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
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      dueAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      runState: "READY"
    },
    {
      id: "task-2",
      title: "팀 주간 리포트 작성",
      importance: "MEDIUM",
      createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      dueAt: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
      runState: "READY"
    },
    {
      id: "task-3",
      title: "병원 예약 정리",
      description: "다음 주 예약 시간 재확인",
      importance: "LOW",
      createdAt: new Date(now - 16 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      dueAt: new Date(now + (3 * 24 + 5) * 60 * 60 * 1000).toISOString(),
      runState: "READY"
    },
    {
      id: "task-4",
      title: "월간 가계부 마감",
      importance: "HIGH",
      createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      dueAt: new Date(now + (5 * 24 + 3) * 60 * 60 * 1000).toISOString(),
      runState: "READY"
    },
    {
      id: "task-5",
      title: "블로그 초안 검토",
      importance: "LOW",
      createdAt: new Date(now - 72 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      dueAt: new Date(now + (9 * 24 + 4) * 60 * 60 * 1000).toISOString(),
      runState: "READY"
    },
    {
      id: "task-6",
      title: "지난 일정 정리",
      importance: "MEDIUM",
      createdAt: new Date(now - 96 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(now - 70 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(now + 28 * 60 * 60 * 1000).toISOString(),
      runState: "COMPLETED"
    }
  ];
}

function findDefaultSelected(tasks: TaskItem[]): string | null {
  const firstOpen = tasks.find((item) => item.runState !== "COMPLETED");
  if (firstOpen) {
    return firstOpen.id;
  }
  return tasks[0]?.id ?? null;
}

const importanceRank: Record<Importance, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const runStateRank: Record<TaskRunState, number> = {
  RUNNING: 0,
  READY: 1,
  COMPLETED: 2
};

function pickPrimaryTask(tasks: TaskItem[]): TaskItem | null {
  const openTasks = tasks.filter((item) => !isTaskCompleted(item));
  if (openTasks.length === 0) {
    return null;
  }

  return [...openTasks].sort((a, b) => {
    const runStateGap = runStateRank[a.runState] - runStateRank[b.runState];
    if (runStateGap !== 0) {
      return runStateGap;
    }

    const importanceGap = importanceRank[a.importance] - importanceRank[b.importance];
    if (importanceGap !== 0) {
      return importanceGap;
    }

    const dueGap = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (dueGap !== 0) {
      return dueGap;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })[0];
}

function ImportanceIcon({ importance }: { importance: Importance }) {
  if (importance === "HIGH") {
    return <ImportanceHighIcon className="ui-icon" />;
  }
  if (importance === "MEDIUM") {
    return <ImportanceMediumIcon className="ui-icon" />;
  }
  return <ImportanceLowIcon className="ui-icon" />;
}

function TaskActionIconSvg({ icon }: { icon: TaskActionIcon }) {
  if (icon === "play") {
    return <PlayIcon className="task-action-icon" />;
  }
  if (icon === "check") {
    return <CheckIcon className="task-action-icon" />;
  }
  return <RotateCcwIcon className="task-action-icon" />;
}

const IMPORTANCE_FILTERS: Array<{ value: TaskImportanceFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "HIGH", label: "긴급" },
  { value: "MEDIUM", label: "보통" },
  { value: "LOW", label: "낮음" }
];

const SORT_OPTIONS: Array<{ value: TaskSortOption; label: string }> = [
  { value: "dueAt", label: "마감임박" },
  { value: "importance", label: "중요도" }
];

const SYNC_STATUS_OPTIONS: Array<{ value: CalendarSyncStatus; label: string }> = [
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "CONFLICT", label: "충돌" }
];

function createMockCalendarConnections(): CalendarConnection[] {
  return [
    {
      provider: "GOOGLE",
      connected: true,
      lastSyncedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      nextSyncStatus: "SUCCESS"
    },
    {
      provider: "APPLE",
      connected: false,
      lastSyncedAt: null,
      nextSyncStatus: "CONFLICT"
    }
  ];
}

function providerLabel(provider: CalendarProvider): string {
  if (provider === "GOOGLE") {
    return "Google Calendar";
  }
  return "Apple Calendar";
}

function syncStatusLabel(status: CalendarSyncStatus): string {
  if (status === "SUCCESS") {
    return "성공";
  }
  if (status === "FAILED") {
    return "실패";
  }
  return "충돌";
}

function buildSyncMessage(provider: CalendarProvider, status: CalendarSyncStatus): string {
  if (status === "SUCCESS") {
    return `${providerLabel(provider)} 동기화가 정상 완료되었습니다.`;
  }
  if (status === "FAILED") {
    return `${providerLabel(provider)} 동기화 중 네트워크 오류가 발생했습니다.`;
  }
  return `${providerLabel(provider)} 동기화 중 일정 충돌이 감지되었습니다.`;
}

function formatSyncDate(iso: string | null): string {
  if (!iso) {
    return "기록 없음";
  }
  return new Date(iso).toLocaleString("ko-KR");
}

function formatHomeDate(date: Date): string {
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour24 = date.getHours();
  const period = hour24 < 12 ? "오전" : "오후";
  const hour12 = String(hour24 % 12 === 0 ? 12 : hour24 % 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}년 ${month}월 ${day}일 ${weekdays[date.getDay()]} ${period} ${hour12}:${minute}:${second}`;
}

const CELEBRATION_COLORS = ["#2f7e55", "#22a86f", "#f0c24b", "#f28a4c", "#db5b4f", "#5ca0d3"];
const CELEBRATION_BURST_COUNT = 5;
const CELEBRATION_BURST_INTERVAL_SEC = 0.5;

function CelebrationOverlay({ burstKey }: { burstKey: number }) {
  const bursts = useMemo(
    () =>
      Array.from({ length: CELEBRATION_BURST_COUNT }, (_, burstIndex) => {
        const baseDelay = burstIndex * CELEBRATION_BURST_INTERVAL_SEC;
        const left = 12 + Math.random() * 76;
        const top = 16 + Math.random() * 62;

        const particles = Array.from({ length: 30 }, (_, index) => {
          const angle = (index / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.48;
          const distance = 100 + Math.random() * (180 + burstIndex * 24);
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance + 92;
          const rotate = (Math.random() - 0.5) * 820;
          const delay = baseDelay + Math.random() * 0.16;
          const size = 5 + Math.floor(Math.random() * 7);
          const color = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];

          return {
            id: `${burstKey}-${burstIndex}-${index}`,
            style: {
              "--dx": `${dx.toFixed(1)}px`,
              "--dy": `${dy.toFixed(1)}px`,
              "--rot": `${rotate.toFixed(0)}deg`,
              "--delay": `${delay.toFixed(2)}s`,
              "--piece": color,
              width: `${size}px`,
              height: `${size + 4}px`
            } as CSSProperties
          };
        });

        return {
          id: `${burstKey}-origin-${burstIndex}`,
          originStyle: {
            left: `${left.toFixed(2)}%`,
            top: `${top.toFixed(2)}%`
          } as CSSProperties,
          particles
        };
      }),
    [burstKey]
  );

  return (
    <div className="celebration-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <div key={burst.id} className="celebration-origin" style={burst.originStyle}>
          {burst.particles.map((particle) => (
            <span key={particle.id} className="confetti-piece" style={particle.style} />
          ))}
        </div>
      ))}
      <div className="celebration-banner">Complete! 잘 해냈어요</div>
    </div>
  );
}

export function PhaseOneDashboard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [importanceFilter, setImportanceFilter] = useState<TaskImportanceFilter>("ALL");
  const [sortOption, setSortOption] = useState<TaskSortOption>("dueAt");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationTick, setCelebrationTick] = useState(0);
  const previousRunStatesRef = useRef<Map<string, TaskRunState>>(new Map());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>(
    createMockCalendarConnections
  );
  const [calendarSyncLogs, setCalendarSyncLogs] = useState<CalendarSyncLog[]>([]);

  const primaryTask = useMemo(() => pickPrimaryTask(tasks), [tasks]);

  const visibleTasks = useMemo(
    () =>
      getVisibleTasks(tasks, {
        importanceFilter,
        sortOption
      }),
    [tasks, importanceFilter, sortOption]
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
    if (!celebrating) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCelebrating(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [celebrating, celebrationTick]);

  useEffect(() => {
    if (tasks.length === 0) {
      previousRunStatesRef.current = new Map();
      return;
    }

    let shouldCelebrate = false;
    const prevMap = previousRunStatesRef.current;

    if (prevMap.size > 0) {
      for (const task of tasks) {
        const prevState = prevMap.get(task.id);
        if (prevState === "RUNNING" && task.runState === "COMPLETED") {
          shouldCelebrate = true;
          break;
        }
      }
    }

    previousRunStatesRef.current = new Map(tasks.map((task) => [task.id, task.runState]));

    if (shouldCelebrate) {
      setCelebrationTick((prev) => prev + 1);
      setCelebrating(true);
    }
  }, [tasks]);

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
      createdAt: new Date().toISOString(),
      startedAt: null,
      dueAt: values.dueAt,
      runState: "READY"
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    closeModal();
  };

  const cycleRunState = (id: string) => {
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) {
          return task;
        }
        return cycleTaskRunState(task, nowIso);
      })
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

  const toggleCalendarConnection = (provider: CalendarProvider) => {
    setCalendarConnections((prev) =>
      prev.map((connection) =>
        connection.provider === provider
          ? {
              ...connection,
              connected: !connection.connected
            }
          : connection
      )
    );
  };

  const setCalendarMockStatus = (provider: CalendarProvider, nextStatus: CalendarSyncStatus) => {
    setCalendarConnections((prev) =>
      prev.map((connection) =>
        connection.provider === provider
          ? {
              ...connection,
              nextSyncStatus: nextStatus
            }
          : connection
      )
    );
  };

  const runMockSync = (provider: CalendarProvider) => {
    const target = calendarConnections.find((connection) => connection.provider === provider);
    if (!target || !target.connected) {
      return;
    }

    const syncedAt = new Date().toISOString();
    const status = target.nextSyncStatus;

    setCalendarConnections((prev) =>
      prev.map((connection) =>
        connection.provider === provider
          ? {
              ...connection,
              lastSyncedAt: syncedAt
            }
          : connection
      )
    );

    setCalendarSyncLogs((prev) => [
      {
        id: `sync-${crypto.randomUUID()}`,
        provider,
        status,
        message: buildSyncMessage(provider, status),
        syncedAt
      },
      ...prev
    ]);
  };

  const primaryDueAt = primaryTask ? new Date(primaryTask.dueAt) : null;
  const primaryProgress = primaryTask ? getTaskProgressPercent(primaryTask, currentTime) : 0;
  const primaryDiffMs =
    primaryTask && primaryDueAt ? Math.max(0, primaryDueAt.getTime() - currentTime.getTime()) : 0;
  const primaryCountdown = formatHMS(primaryDiffMs);
  const primaryDueLabel =
    primaryTask && primaryDueAt ? formatDueDateLabel(currentTime, primaryDueAt) : "";
  const primaryDDay =
    primaryTask && primaryDueAt ? formatDDayLabel(currentTime, primaryDueAt) : "";
  const primaryActionUi = primaryTask ? getTaskActionUi(primaryTask.runState) : null;

  return (
    <>
      {celebrating ? <CelebrationOverlay burstKey={celebrationTick} /> : null}
      <header className="app-titlebar">
        <div className="app-titlebar-inner">
          <div className="timebar-title-row">
            <h1>ADHD TimeBar</h1>
            <div className="timebar-actions">
              <button type="button" className="icon-btn" onClick={openCreateModal} aria-label="일정 추가">
                <PlusIcon className="ui-icon" />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCalendarOpen((prev) => !prev)}
                aria-label="메뉴"
              >
                <MenuIcon className="ui-icon" />
              </button>
            </div>
          </div>
          <p className="timebar-date" suppressHydrationWarning>
            {formatHomeDate(currentTime)}
          </p>
        </div>
      </header>

      <main className="page-wrap">
        <section className="hero-panel">
          {primaryTask && primaryActionUi ? (
            <div className="home-primary-card">
              <header className="home-primary-header">
                <h2 className="home-primary-title">
                  <span className={`task-importance-icon ${primaryTask.importance.toLowerCase()}`} aria-hidden="true">
                    <ImportanceIcon importance={primaryTask.importance} />
                  </span>
                  <span>{primaryTask.title}</span>
                </h2>
                <div className="primary-actions">
                  <button
                    type="button"
                    className={`task-complete-btn ${primaryActionUi.stateClass}`}
                    onClick={() => cycleRunState(primaryTask.id)}
                    aria-label={primaryActionUi.ariaLabel}
                    aria-pressed={primaryTask.runState === "RUNNING"}
                  >
                    <TaskActionIconSvg icon={primaryActionUi.icon} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn subtle edit"
                    onClick={() => openEditModal(primaryTask)}
                    aria-label="대표 일정 편집"
                  >
                    <PencilSquareIcon className="ui-icon" />
                  </button>
                </div>
              </header>
              <p className="primary-due-meta">
                {primaryDueLabel} · {primaryDDay}
              </p>
              <div className="home-primary-body">
                <DeadlineRing progress={primaryProgress} centerLabel={primaryCountdown} />
              </div>
            </div>
          ) : (
            <p className="empty-text">진행중인 일정이 없습니다. 새 일정을 추가해 주세요.</p>
          )}
        </section>

        <section className="tasks-panel">
        <div className="tasks-controls-wrap" role="group" aria-label="일정 목록 필터와 정렬">
          <label className="task-select-inline">
            <select
              aria-label="중요도 필터"
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value as TaskImportanceFilter)}
            >
              {IMPORTANCE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-select-inline">
            <select
              aria-label="정렬 기준"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as TaskSortOption)}
            >
              {SORT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {visibleTasks.length === 0 ? <p className="empty-text">조건에 맞는 일정이 없습니다.</p> : null}

        <div className="task-grid">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={currentTime}
              selected={task.id === selectedTaskId}
              onSelect={setSelectedTaskId}
              onCycleRunState={cycleRunState}
              onEdit={openEditModal}
              onDelete={deleteTask}
            />
          ))}
        </div>
        </section>

        <section className="calendar-panel">
        <button
          type="button"
          className="calendar-fold-btn"
          onClick={() => setCalendarOpen((prev) => !prev)}
          aria-expanded={calendarOpen}
        >
          <span>{calendarOpen ? "캘린더 연동 접기" : "캘린더 연동 펼치기"}</span>
          {calendarOpen ? <ChevronUpIcon className="ui-icon" /> : <ChevronDownIcon className="ui-icon" />}
        </button>

        {calendarOpen ? (
          <>
            <header className="calendar-header">
              <h2>캘린더 연동</h2>
              <p>연결 상태와 mock 동기화 로그를 확인하세요.</p>
            </header>

            <div className="calendar-provider-grid">
              {calendarConnections.map((connection) => (
                <article key={connection.provider} className="calendar-card">
                  <header className="calendar-card-header">
                    <strong>{providerLabel(connection.provider)}</strong>
                    <span className={connection.connected ? "status-badge connected" : "status-badge disconnected"}>
                      {connection.connected ? "연결됨" : "연결 안됨"}
                    </span>
                  </header>

                  <p className="calendar-meta">마지막 동기화: {formatSyncDate(connection.lastSyncedAt)}</p>

                  <div className="calendar-actions">
                    <button
                      type="button"
                      className={connection.connected ? "ghost-btn" : "solid-btn"}
                      onClick={() => toggleCalendarConnection(connection.provider)}
                    >
                      {connection.connected ? "연결 해제" : "연결"}
                    </button>

                    <label className="calendar-select">
                      결과
                      <select
                        value={connection.nextSyncStatus}
                        onChange={(e) =>
                          setCalendarMockStatus(connection.provider, e.target.value as CalendarSyncStatus)
                        }
                      >
                        {SYNC_STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="solid-btn"
                      onClick={() => runMockSync(connection.provider)}
                      disabled={!connection.connected}
                    >
                      동기화 실행
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="calendar-logs">
              <h3>동기화 로그</h3>
              {calendarSyncLogs.length === 0 ? (
                <p className="empty-text">아직 동기화 로그가 없습니다.</p>
              ) : (
                <ul className="sync-log-list">
                  {calendarSyncLogs.map((log) => (
                    <li key={log.id} className="sync-log-item">
                      <span className="sync-log-main">
                        <strong>{providerLabel(log.provider)}</strong>
                        <span className={`sync-result sync-${log.status.toLowerCase()}`}>
                          {syncStatusLabel(log.status)}
                        </span>
                        <span>{log.message}</span>
                      </span>
                      <time suppressHydrationWarning>{new Date(log.syncedAt).toLocaleString("ko-KR")}</time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
        </section>

        <TaskFormModal open={modalOpen} task={editingTask} onClose={closeModal} onSave={saveTask} />
      </main>
    </>
  );
}
