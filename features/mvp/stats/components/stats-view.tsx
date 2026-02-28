"use client";

import type { MvpKpiSummary } from "@/features/mvp/lib/kpi";
import {
  formatEventMeta,
  formatPercentValue,
  formatTimeToStart
} from "@/features/mvp/shared";
import type { AppEvent, StatsState } from "@/features/mvp/types/domain";

type MvpDashboardStyles = Record<string, string>;

export interface StatsViewProps {
  styles: MvpDashboardStyles;
  stats: StatsState;
  completionRate: number;
  kpis: MvpKpiSummary;
  events: AppEvent[];
}

export function StatsView({
  styles,
  stats,
  completionRate,
  kpis,
  events
}: StatsViewProps) {
  return (
    <section className={styles.listCard}>
      <header className={styles.listHeader}>
        <h3>오늘 리포트</h3>
        <p>5초 안에 확인하는 요약</p>
      </header>

      <div className={styles.reportGrid}>
        <article>
          <p>완료 미션</p>
          <strong>{stats.todayCompleted}</strong>
        </article>
        <article>
          <p>완료율</p>
          <strong>{completionRate}%</strong>
        </article>
        <article>
          <p>획득 XP</p>
          <strong>+{stats.todayXpGain}</strong>
        </article>
        <article>
          <p>다시 시작 점수</p>
          <strong>+{stats.todayStatGain.recovery}</strong>
        </article>
      </div>

      <div className={styles.kpiBlock}>
        <h4>MVP KPI 스냅샷</h4>
        <div className={styles.kpiGrid}>
          <article>
            <p>Activation</p>
            <strong>{formatPercentValue(kpis.activationRate.value)}</strong>
            <span>
              {kpis.activationRate.numerator}/{kpis.activationRate.denominator}
            </span>
          </article>
          <article>
            <p>Time to Start</p>
            <strong>{formatTimeToStart(kpis.averageTimeToStartSeconds)}</strong>
            <span>{kpis.samples.tasksStarted}개 과업 기준</span>
          </article>
          <article>
            <p>Completion Rate</p>
            <strong>{formatPercentValue(kpis.missionCompletionRate.value)}</strong>
            <span>
              {kpis.samples.completedMissions}/{kpis.samples.generatedMissions} missions
            </span>
          </article>
          <article>
            <p>Recovery Rate</p>
            <strong>{formatPercentValue(kpis.recoveryRate.value)}</strong>
            <span>
              {kpis.recoveryRate.numerator}/{kpis.recoveryRate.denominator}
            </span>
          </article>
          <article>
            <p>D1 Retention</p>
            <strong>{formatPercentValue(kpis.d1Retention.value)}</strong>
            <span>사용자 타임라인 기준</span>
          </article>
          <article>
            <p>D7 Retention</p>
            <strong>{formatPercentValue(kpis.d7Retention.value)}</strong>
            <span>사용자 타임라인 기준</span>
          </article>
        </div>
        <p className={styles.helperText}>
          이벤트 샘플: 세션 {kpis.samples.sessions}개 · 과업 {kpis.samples.tasksCreated}개 · 중단 과업 {kpis.samples.tasksAbandoned}개
        </p>
      </div>

      <div className={styles.eventBlock}>
        <h4>최근 이벤트</h4>
        <ul>
          {events.slice(0, 8).map((event) => {
            const metaText = formatEventMeta(event.meta);
            return (
              <li key={event.id}>
                <div className={styles.eventInfo}>
                  <strong>{event.eventName}</strong>
                  <span className={styles.eventMeta}>
                    [{event.source}]
                    {metaText ? ` ${metaText}` : ""}
                  </span>
                </div>
                <time suppressHydrationWarning>{new Date(event.timestamp).toLocaleTimeString("ko-KR")}</time>
              </li>
            );
          })}
          {events.length === 0 ? <li className={styles.emptyRow}>아직 이벤트가 없습니다.</li> : null}
        </ul>
      </div>
    </section>
  );
}
