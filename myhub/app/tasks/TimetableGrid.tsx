"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Calendar, CalendarCheck, Pencil, Repeat } from "lucide-react";
import type { CalendarEvent, ScheduleBlock, Tag } from "./types";
import { getTagColor } from "./constants";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  PX_PER_SLOT,
  SLOT_MINUTES,
  formatTimeLabel,
  minutesToTime,
  snapMinutes,
  timeToMinutes,
} from "./time";
import styles from "./TimetableGrid.module.css";

const TOTAL_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;
const TOTAL_HEIGHT = (TOTAL_MINUTES / SLOT_MINUTES) * PX_PER_SLOT;
const MIN_DURATION = SLOT_MINUTES;

function minutesToY(minutes: number): number {
  return ((minutes - GRID_START_HOUR * 60) / SLOT_MINUTES) * PX_PER_SLOT;
}

function yToMinutes(y: number): number {
  const raw = GRID_START_HOUR * 60 + (y / PX_PER_SLOT) * SLOT_MINUTES;
  return Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60, snapMinutes(raw)));
}

type DragState =
  | { kind: "create"; anchor: number; current: number }
  | { kind: "move"; blockId: string; duration: number; liveStart: number }
  | { kind: "resize"; blockId: string; liveEnd: number };

function nowToMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// Minutes-since-midnight for "now", refreshed every 30s so the current-time
// line drifts smoothly rather than jumping once a minute.
function useNowMinutes(): number {
  const [nowMinutes, setNowMinutes] = useState(nowToMinutes);

  useEffect(() => {
    const id = setInterval(() => setNowMinutes(nowToMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  return nowMinutes;
}

export default function TimetableGrid({
  blocks,
  tags,
  calendarEvents,
  isToday,
  selectedDate,
  onCreateRange,
  onMoveBlock,
  onResizeBlock,
  onDeleteBlock,
  onPushToGoogle,
  onEditBlock,
}: {
  blocks: ScheduleBlock[];
  tags: Tag[];
  calendarEvents: CalendarEvent[];
  isToday: boolean;
  selectedDate: string;
  onCreateRange: (range: { startTime: string; endTime: string }) => void;
  onMoveBlock: (blockId: string, startTime: string) => void;
  onResizeBlock: (blockId: string, endTime: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onPushToGoogle: (blockId: string) => void;
  onEditBlock: (blockId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const nowMinutes = useNowMinutes();
  const showNowLine = isToday && nowMinutes >= GRID_START_HOUR * 60 && nowMinutes <= GRID_END_HOUR * 60;

  // Center the current-time line in the viewport once per visit to "today" —
  // a ref guard keeps later nowMinutes ticks from fighting the user's scroll,
  // but re-arms whenever day navigation leaves and returns to today.
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (!isToday) {
      hasCenteredRef.current = false;
      return;
    }
    if (hasCenteredRef.current) return;
    const container = scrollRef.current;
    if (!container || !showNowLine) return;
    hasCenteredRef.current = true;
    container.scrollTop = Math.max(0, minutesToY(nowMinutes) - container.clientHeight / 2);
  }, [isToday, showNowLine, nowMinutes]);

  // Mirrors `drag` into a ref so mouseup handlers can read the latest live
  // value synchronously without calling a parent setState from inside a
  // setState updater (which React flags as an update during render).
  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const tagColor = (tagId?: string): string => {
    if (!tagId) return "#6b7280";
    const index = tags.findIndex((t) => t.id === tagId);
    return index === -1 ? "#6b7280" : getTagColor(index);
  };

  const clientYToMinutes = (clientY: number): number => {
    const rect = gridRef.current!.getBoundingClientRect();
    return yToMinutes(clientY - rect.top);
  };

  // ---- create a new block by dragging on empty grid space ----
  const handleGridMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    const anchor = clientYToMinutes(e.clientY);
    updateDrag({ kind: "create", anchor, current: anchor + SLOT_MINUTES });

    const onMove = (ev: MouseEvent) => {
      if (dragRef.current?.kind !== "create") return;
      const current = clientYToMinutes(ev.clientY);
      updateDrag({ ...dragRef.current, current });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const finalDrag = dragRef.current;
      updateDrag(null);
      if (finalDrag?.kind === "create") {
        const start = Math.min(finalDrag.anchor, finalDrag.current);
        const end = Math.max(finalDrag.anchor, finalDrag.current, start + MIN_DURATION);
        onCreateRange({ startTime: minutesToTime(start), endTime: minutesToTime(end) });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ---- move an existing block ----
  const startMove = (block: ScheduleBlock, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const originalStart = timeToMinutes(block.startTime);
    const duration = timeToMinutes(block.endTime) - originalStart;
    const startClientY = e.clientY;
    updateDrag({ kind: "move", blockId: block.id, duration, liveStart: originalStart });

    const onMove = (ev: MouseEvent) => {
      const deltaMinutes = snapMinutes(((ev.clientY - startClientY) / PX_PER_SLOT) * SLOT_MINUTES);
      const liveStart = Math.max(
        GRID_START_HOUR * 60,
        Math.min(GRID_END_HOUR * 60 - duration, originalStart + deltaMinutes)
      );
      if (dragRef.current?.kind !== "move") return;
      updateDrag({ ...dragRef.current, liveStart });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const finalDrag = dragRef.current;
      updateDrag(null);
      if (finalDrag?.kind === "move") onMoveBlock(finalDrag.blockId, minutesToTime(finalDrag.liveStart));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ---- resize an existing block from its bottom edge ----
  const startResize = (block: ScheduleBlock, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const start = timeToMinutes(block.startTime);
    const originalEnd = timeToMinutes(block.endTime);
    const startClientY = e.clientY;
    updateDrag({ kind: "resize", blockId: block.id, liveEnd: originalEnd });

    const onMove = (ev: MouseEvent) => {
      const deltaMinutes = snapMinutes(((ev.clientY - startClientY) / PX_PER_SLOT) * SLOT_MINUTES);
      const liveEnd = Math.max(start + MIN_DURATION, Math.min(GRID_END_HOUR * 60, originalEnd + deltaMinutes));
      if (dragRef.current?.kind !== "resize") return;
      updateDrag({ ...dragRef.current, liveEnd });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const finalDrag = dragRef.current;
      updateDrag(null);
      if (finalDrag?.kind === "resize") onResizeBlock(finalDrag.blockId, minutesToTime(finalDrag.liveEnd));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

  return (
    <div className={styles.scroll} ref={scrollRef}>
      <div className={styles.gutter} style={{ height: TOTAL_HEIGHT }}>
        {hours.map((h) => (
          <div key={h} className={styles.hourLabel} style={{ top: minutesToY(h * 60) }}>
            {formatTimeLabel(`${String(h).padStart(2, "0")}:00`)}
          </div>
        ))}
        {showNowLine && (
          <div className={styles.nowLabel} style={{ top: minutesToY(nowMinutes) }}>
            {formatTimeLabel(minutesToTime(nowMinutes))}
          </div>
        )}
      </div>

      <div
        ref={gridRef}
        className={styles.gridBody}
        style={{ height: TOTAL_HEIGHT }}
        onMouseDown={handleGridMouseDown}
      >
        {hours.map((h) => (
          <div key={h} className={styles.hourLine} style={{ top: minutesToY(h * 60) }} />
        ))}

        {calendarEvents.map((ev) => {
          const top = minutesToY(timeToMinutes(ev.startTime));
          const height = Math.max(minutesToY(timeToMinutes(ev.endTime)) - top, PX_PER_SLOT);
          return (
            <div key={ev.id} className={styles.calendarEvent} style={{ top, height }}>
              <span className={styles.calendarEventLabel}>Calendar</span>
              <span className={styles.blockTitle}>{ev.title}</span>
              <span className={styles.blockTime}>
                {formatTimeLabel(ev.startTime)} – {formatTimeLabel(ev.endTime)}
                {ev.location ? ` · ${ev.location}` : ""}
              </span>
            </div>
          );
        })}

        {blocks.map((block) => {
          const isMoving = drag?.kind === "move" && drag.blockId === block.id;
          const isResizing = drag?.kind === "resize" && drag.blockId === block.id;
          const start = isMoving ? drag.liveStart : timeToMinutes(block.startTime);
          const end = isResizing
            ? drag.liveEnd
            : isMoving
              ? drag.liveStart + drag.duration
              : timeToMinutes(block.endTime);
          const top = minutesToY(start);
          const height = Math.max(minutesToY(end) - top, PX_PER_SLOT);
          const color = tagColor(block.tagId);
          // Too short for the time to fit on its own line under the title —
          // show it inline instead of letting the two overlap.
          const timeLabel = `${formatTimeLabel(minutesToTime(start))} – ${formatTimeLabel(minutesToTime(end))}`;
          const showTimeInline = end - start <= 30;
          // A recurring block only has one underlying row — this is its literal
          // date vs. a projected occurrence on a day its repeat rule matches.
          // Moving/resizing/pushing only make sense from the literal date, since
          // they'd otherwise silently rewrite (or push the wrong day's copy of)
          // every occurrence at once; editing and deleting still apply anywhere,
          // since those already act on the whole series regardless.
          const isHomeDate = block.date === selectedDate;

          return (
            <div
              key={block.id}
              className={styles.block}
              style={{
                top,
                height,
                backgroundColor: `${color}22`,
                borderColor: color,
                cursor: isHomeDate ? undefined : "default",
              }}
              onMouseDown={isHomeDate ? (e) => startMove(block, e) : undefined}
            >
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>
                  {block.repeat && (
                    <Repeat
                      size={11}
                      strokeWidth={2.5}
                      className={styles.repeatIcon}
                      aria-label="Repeats"
                    />
                  )}
                  {block.title}
                  {showTimeInline && <span className={styles.blockTimeInline}>{timeLabel}</span>}
                </span>
                <div className={styles.blockHeaderActions}>
                  {isHomeDate && (
                    <button
                      type="button"
                      className={styles.blockIconButton}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onPushToGoogle(block.id)}
                      disabled={block.pushedToGoogle}
                      aria-label={block.pushedToGoogle ? "On Google Calendar" : "Push to Google Calendar"}
                      title={block.pushedToGoogle ? "On Google Calendar" : "Push to Google Calendar"}
                    >
                      {block.pushedToGoogle ? <CalendarCheck size={13} strokeWidth={2.25} /> : <Calendar size={13} strokeWidth={2.25} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.blockIconButton}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onEditBlock(block.id)}
                    aria-label={`Edit "${block.title}"`}
                    title="Edit event"
                  >
                    <Pencil size={12} strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    className={styles.blockDelete}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onDeleteBlock(block.id)}
                    aria-label={`Remove "${block.title}" from timetable`}
                    title={block.repeat ? "Removes every occurrence" : undefined}
                  >
                    ×
                  </button>
                </div>
              </div>
              {!showTimeInline && <span className={styles.blockTime}>{timeLabel}</span>}
              {isHomeDate && <div className={styles.resizeHandle} onMouseDown={(e) => startResize(block, e)} />}
            </div>
          );
        })}

        {drag?.kind === "create" &&
          (() => {
            const start = Math.min(drag.anchor, drag.current);
            const end = Math.max(drag.anchor, drag.current, start + MIN_DURATION);
            const top = minutesToY(start);
            const height = Math.max(minutesToY(end) - top, PX_PER_SLOT);
            return <div className={styles.draftBlock} style={{ top, height }} />;
          })()}

        {showNowLine && (
          <div className={styles.nowLine} style={{ top: minutesToY(nowMinutes) }}>
            <span className={styles.nowDot} />
          </div>
        )}
      </div>
    </div>
  );
}
