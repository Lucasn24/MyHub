"use client";

import { useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import type { ScheduleBlock, Tag } from "./types";
import { TAG_OTHER_COLOR, getTagColor } from "./constants";
import { getWeekRange, isDateInRange, timeToMinutes } from "./time";
import styles from "./HoursChart.module.css";

const MAX_SLICES = 6;

type TagHours = { tagId: string; label: string; hours: number; color: string };

function computeTagHours(scope: "day" | "week", todayISO: string, tags: Tag[], blocks: ScheduleBlock[]): TagHours[] {
  const range = scope === "day" ? { start: todayISO, end: todayISO } : getWeekRange(todayISO);
  const totalsByTagId = new Map<string, number>();

  for (const block of blocks) {
    if (!block.tagId || !isDateInRange(block.date, range)) continue;
    const hours = (timeToMinutes(block.endTime) - timeToMinutes(block.startTime)) / 60;
    totalsByTagId.set(block.tagId, (totalsByTagId.get(block.tagId) ?? 0) + hours);
  }

  const entries = tags
    .map((tag, index) => ({
      tagId: tag.id,
      label: tag.label,
      hours: totalsByTagId.get(tag.id) ?? 0,
      color: getTagColor(index),
    }))
    .filter((e) => e.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  if (entries.length <= MAX_SLICES) return entries;

  const head = entries.slice(0, MAX_SLICES);
  const tailHours = entries.slice(MAX_SLICES).reduce((sum, e) => sum + e.hours, 0);
  return [...head, { tagId: "__other__", label: "Other", hours: tailHours, color: TAG_OTHER_COLOR }];
}

type DonutSegment = TagHours & { dasharray: string; dashoffset: number };

// Plain helper (outside component render) so the running `cumulative` mutation
// doesn't trip the no-mutation-during-render lint rule.
function buildDonutSegments(entries: TagHours[], total: number, circumference: number, gap: number): DonutSegment[] {
  let cumulative = 0;
  return entries.map((e) => {
    const fraction = total > 0 ? e.hours / total : 0;
    const length = Math.max(fraction * circumference - gap, 0);
    const dashoffset = -cumulative;
    cumulative += fraction * circumference;
    return { ...e, dasharray: `${length} ${circumference - length}`, dashoffset };
  });
}

function Donut({ entries, total }: { entries: TagHours[]; total: number }) {
  const size = 108;
  const strokeWidth = 16;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const segments = buildDonutSegments(entries, total, circumference, 3);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donut}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => (
          <circle
            key={s.tagId}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            tabIndex={0}
          >
            <title>{`${s.label}: ${s.hours.toFixed(1)}h`}</title>
          </circle>
        ))}
      </g>
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className={styles.donutTotal}>
        {total.toFixed(1)}h
      </text>
    </svg>
  );
}

export default function HoursChart({
  tags,
  blocks,
  todayISO,
}: {
  tags: Tag[];
  blocks: ScheduleBlock[];
  todayISO: string;
}) {
  const [scope, setScope] = useState<"day" | "week">("day");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const entries = computeTagHours(scope, todayISO, tags, blocks);
  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  const maxHours = Math.max(...entries.map((e) => e.hours), 0.001);

  return (
    <div className={styles.wrap}>
      <div className={styles.controlsRow}>
        <div className={styles.scopeRow}>
          <button
            type="button"
            className={`${styles.scopeButton} ${scope === "day" ? styles.scopeButtonActive : ""}`}
            onClick={() => setScope("day")}
          >
            Day
          </button>
          <button
            type="button"
            className={`${styles.scopeButton} ${scope === "week" ? styles.scopeButtonActive : ""}`}
            onClick={() => setScope("week")}
          >
            Week
          </button>
        </div>

        <div className={styles.chartTypeRow}>
          <button
            type="button"
            className={`${styles.chartTypeButton} ${chartType === "bar" ? styles.chartTypeButtonActive : ""}`}
            onClick={() => setChartType("bar")}
            aria-label="Bar chart"
            title="Bar chart"
          >
            <BarChart3 size={14} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className={`${styles.chartTypeButton} ${chartType === "pie" ? styles.chartTypeButtonActive : ""}`}
            onClick={() => setChartType("pie")}
            aria-label="Pie chart"
            title="Pie chart"
          >
            <PieChart size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>No scheduled hours logged toward a tag yet.</p>
      ) : chartType === "bar" ? (
        <div className={styles.body}>
          <div className={styles.barList}>
            {entries.map((e) => (
              <div key={e.tagId} className={styles.barRow} tabIndex={0}>
                <span className={styles.barLabel} title={e.label}>
                  {e.label}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(e.hours / maxHours) * 100}%`, backgroundColor: e.color }}
                  />
                </div>
                <span className={styles.barValue}>{e.hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.pieRow}>
            <Donut entries={entries} total={total} />
            <ul className={styles.legend}>
              {entries.map((e) => (
                <li key={e.tagId} className={styles.legendRow}>
                  <span className={styles.swatch} style={{ backgroundColor: e.color }} />
                  <span className={styles.legendLabel}>{e.label}</span>
                  <span className={styles.legendValue}>{Math.round((e.hours / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
