"use client";

import { useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from "react";
import type { MockCalendarEvent, ScheduleBlock, Tag } from "./types";
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
import { TASK_DRAG_MIME } from "./TodoList";
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

export default function TimetableGrid({
  blocks,
  tags,
  mockEvents,
  onCreateRange,
  onDropTask,
  onMoveBlock,
  onResizeBlock,
  onDeleteBlock,
  onPushToGoogle,
}: {
  blocks: ScheduleBlock[];
  tags: Tag[];
  mockEvents: MockCalendarEvent[];
  onCreateRange: (range: { startTime: string; endTime: string }) => void;
  onDropTask: (taskId: string, startTime: string) => void;
  onMoveBlock: (blockId: string, startTime: string) => void;
  onResizeBlock: (blockId: string, endTime: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onPushToGoogle: (blockId: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Mirrors `drag` into a ref so mouseup handlers can read the latest live
  // value synchronously without calling a parent setState from inside a
  // setState updater (which React flags as an update during render).
  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const tagColor = (tagIds: string[]): string => {
    const tag = tags.find((t) => tagIds.includes(t.id));
    return tag?.color ?? "#6b7280";
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

  // ---- drop a to-do dragged in from the list ----
  const handleDragOver = (e: ReactDragEvent) => {
    if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) e.preventDefault();
  };
  const handleDrop = (e: ReactDragEvent) => {
    const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!taskId) return;
    e.preventDefault();
    onDropTask(taskId, minutesToTime(clientYToMinutes(e.clientY)));
  };

  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

  return (
    <div className={styles.scroll}>
      <div className={styles.gutter} style={{ height: TOTAL_HEIGHT }}>
        {hours.map((h) => (
          <div key={h} className={styles.hourLabel} style={{ top: minutesToY(h * 60) }}>
            {formatTimeLabel(`${String(h).padStart(2, "0")}:00`)}
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        className={styles.gridBody}
        style={{ height: TOTAL_HEIGHT }}
        onMouseDown={handleGridMouseDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {hours.map((h) => (
          <div key={h} className={styles.hourLine} style={{ top: minutesToY(h * 60) }} />
        ))}

        {mockEvents.map((ev) => {
          const top = minutesToY(timeToMinutes(ev.startTime));
          const height = Math.max(minutesToY(timeToMinutes(ev.endTime)) - top, PX_PER_SLOT);
          return (
            <div key={ev.id} className={styles.calendarEvent} style={{ top, height }}>
              <span className={styles.calendarEventLabel}>Calendar</span>
              <span className={styles.blockTitle}>{ev.title}</span>
              <span className={styles.blockTime}>
                {formatTimeLabel(ev.startTime)} – {formatTimeLabel(ev.endTime)}
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
          const color = tagColor(block.tagIds);

          return (
            <div
              key={block.id}
              className={styles.block}
              style={{ top, height, backgroundColor: `${color}22`, borderColor: color }}
              onMouseDown={(e) => startMove(block, e)}
            >
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>{block.title}</span>
                <button
                  type="button"
                  className={styles.blockDelete}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onDeleteBlock(block.id)}
                  aria-label={`Remove "${block.title}" from timetable`}
                >
                  ×
                </button>
              </div>
              <span className={styles.blockTime}>
                {formatTimeLabel(minutesToTime(start))} – {formatTimeLabel(minutesToTime(end))}
              </span>
              <button
                type="button"
                className={`${styles.pushButton} ${block.pushedToGoogle ? styles.pushButtonDone : ""}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onPushToGoogle(block.id)}
                disabled={block.pushedToGoogle}
              >
                {block.pushedToGoogle ? "✓ On Google Calendar" : "Push to Google Calendar"}
              </button>
              <div className={styles.resizeHandle} onMouseDown={(e) => startResize(block, e)} />
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
      </div>
    </div>
  );
}
