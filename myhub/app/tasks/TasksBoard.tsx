"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import styles from "./page.module.css";
import TimetableGrid from "./TimetableGrid";
import TodoList from "./TodoList";
import TagCards from "./TagCards";
import TagDetailModal from "./TagDetailModal";
import HoursChart from "./HoursChart";
import TaskCreatorModal from "./TaskCreatorModal";
import EventEditorModal from "./EventEditorModal";
import { blockToRow, blockUpdatesToRow, tagToRow, taskToRow, taskUpdatesToRow } from "./serialization";
import { minutesToTime, timeToMinutes, toISODate } from "./time";
import type { CalendarEvent, ScheduleBlock, Tag, Task } from "./types";

function apiJSON(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  return fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Resyncs local state whenever the server hands back a fresh array (e.g. after
// router.refresh()), while still letting local handlers update it optimistically
// in between. Mirrors the prevProps-comparison pattern in app/emails/EmailPanel.tsx.
function useResyncedState<T>(fromServer: T) {
  const [state, setState] = useState(fromServer);
  const [prev, setPrev] = useState(fromServer);
  if (prev !== fromServer) {
    setPrev(fromServer);
    setState(fromServer);
  }
  return [state, setState] as const;
}

export default function TasksBoard({
  initialTasks,
  initialBlocks,
  initialTags,
  calendarEvents,
}: {
  initialTasks: Task[];
  initialBlocks: ScheduleBlock[];
  initialTags: Tag[];
  calendarEvents: CalendarEvent[];
}) {
  const router = useRouter();
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const [tasks, setTasks] = useResyncedState(initialTasks);
  const [blocks, setBlocks] = useResyncedState(initialBlocks);
  const [tags, setTags] = useResyncedState(initialTags);

  const [creatorOpen, setCreatorOpen] = useState<null | true | { startTime: string; endTime: string }>(null);
  const [openTagId, setOpenTagId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const todaysBlocks = blocks.filter((b) => b.date === todayISO);
  const openTag = tags.find((t) => t.id === openTagId) ?? null;
  const editingBlock = blocks.find((b) => b.id === editingBlockId) ?? null;

  const handleCreate = async ({ task, block }: { task?: Task; block?: ScheduleBlock }) => {
    if (task) setTasks((prev) => [...prev, task]);
    if (block) setBlocks((prev) => [...prev, block]);
    setCreatorOpen(null);
    try {
      await Promise.all([
        task && apiJSON("/api/planner/tasks", "POST", taskToRow(task)),
        block && apiJSON("/api/planner/blocks", "POST", blockToRow(block)),
      ]);
    } catch (err) {
      console.error("Failed to save:", err);
    }
    router.refresh();
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<ScheduleBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
    setEditingBlockId(null);
    try {
      await apiJSON(`/api/planner/blocks/${blockId}`, "PATCH", blockUpdatesToRow(updates));
    } catch (err) {
      console.error("Failed to save event:", err);
    }
    router.refresh();
  };

  const handleCreateTag = async (tag: Tag) => {
    setTags((prev) => [...prev, tag]);
    try {
      await apiJSON("/api/planner/tags", "POST", tagToRow(tag));
    } catch (err) {
      console.error("Failed to save tag:", err);
    }
    router.refresh();
  };

  const handleUpdateTag = async (tagId: string, label: string) => {
    setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, label } : t)));
    setOpenTagId(null);
    try {
      await apiJSON(`/api/planner/tags/${tagId}`, "PATCH", { label });
    } catch (err) {
      console.error("Failed to save tag:", err);
    }
    router.refresh();
  };

  const handleDeleteTag = async (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setTasks((prev) => prev.map((t) => (t.tagId === tagId ? { ...t, tagId: undefined } : t)));
    setBlocks((prev) => prev.map((b) => (b.tagId === tagId ? { ...b, tagId: undefined } : b)));
    setOpenTagId(null);
    try {
      await apiJSON(`/api/planner/tags/${tagId}`, "DELETE");
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
    router.refresh();
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const alreadyDone = task.completedDates.includes(todayISO);
    const completedDates = alreadyDone
      ? task.completedDates.filter((d) => d !== todayISO)
      : [...task.completedDates, todayISO];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completedDates } : t)));
    try {
      await apiJSON(`/api/planner/tasks/${taskId}`, "PATCH", taskUpdatesToRow({ completedDates }));
    } catch (err) {
      console.error("Failed to save task:", err);
    }
    router.refresh();
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await apiJSON(`/api/planner/tasks/${taskId}`, "DELETE");
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
    router.refresh();
  };

  const handleCreateRange = (range: { startTime: string; endTime: string }) => setCreatorOpen(range);

  // Like handleUpdateBlock, but doesn't touch the edit-modal state — used by the
  // drag-to-move/resize handlers, which commit directly without opening the modal.
  const handleUpdateBlockSilently = async (blockId: string, updates: Partial<ScheduleBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
    try {
      await apiJSON(`/api/planner/blocks/${blockId}`, "PATCH", blockUpdatesToRow(updates));
    } catch (err) {
      console.error("Failed to save block:", err);
    }
    router.refresh();
  };

  const handleMoveBlock = async (blockId: string, startTime: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    const endTime = minutesToTime(timeToMinutes(startTime) + duration);
    await handleUpdateBlockSilently(blockId, { startTime, endTime });
  };

  const handleResizeBlock = async (blockId: string, endTime: string) => {
    await handleUpdateBlockSilently(blockId, { endTime });
  };

  const handleDeleteBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setTasks((prev) => prev.map((t) => (t.eventId === blockId ? { ...t, eventId: undefined } : t)));
    try {
      await apiJSON(`/api/planner/blocks/${blockId}`, "DELETE");
    } catch (err) {
      console.error("Failed to delete block:", err);
    }
    router.refresh();
  };

  const handlePushToGoogle = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    try {
      const res = await apiJSON(`/api/planner/blocks/${blockId}/push`, "POST", {
        title: block.title,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Push failed" }));
        window.alert(error ?? "Couldn't push this event to Google Calendar.");
        return;
      }
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, pushedToGoogle: true } : b)));
      router.refresh();
    } catch (err) {
      console.error("Failed to push to Google Calendar:", err);
      window.alert("Couldn't push this event to Google Calendar.");
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>TODAY</span>
          <h1 className={styles.heading}>Tasks</h1>
        </div>
        <button type="button" className={styles.newTaskButton} onClick={() => setCreatorOpen(true)}>
          <Plus size={16} strokeWidth={2.5} />
          New task
        </button>
      </div>

      <TagCards tags={tags} tasks={tasks} onOpenTag={setOpenTagId} onCreateTag={handleCreateTag} />

      <div className={styles.content}>
        <div className={styles.timetableColumn}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>TIMETABLE</span>
            <span className={styles.runningCount}>Drag to create a block</span>
          </div>
          <TimetableGrid
            blocks={todaysBlocks}
            tags={tags}
            calendarEvents={calendarEvents}
            onCreateRange={handleCreateRange}
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
            onDeleteBlock={handleDeleteBlock}
            onPushToGoogle={handlePushToGoogle}
            onEditBlock={setEditingBlockId}
          />
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.sideHalf}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>TO-DO</span>
              <span className={styles.runningCount}>{tasks.length} total</span>
            </div>
            <TodoList
              tasks={tasks}
              tags={tags}
              blocks={blocks}
              todayISO={todayISO}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
            />
          </div>

          <div className={styles.sideHalf}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>DISTRIBUTION</span>
            </div>
            <HoursChart tags={tags} blocks={blocks} todayISO={todayISO} />
          </div>
        </div>
      </div>

      {creatorOpen !== null && (
        <TaskCreatorModal
          tags={tags}
          todaysEvents={todaysBlocks}
          todayISO={todayISO}
          initialRange={creatorOpen === true ? null : creatorOpen}
          onClose={() => setCreatorOpen(null)}
          onCreateTag={handleCreateTag}
          onCreate={handleCreate}
        />
      )}

      {openTag && (
        <TagDetailModal
          tag={openTag}
          tasks={tasks}
          onClose={() => setOpenTagId(null)}
          onSave={handleUpdateTag}
          onDelete={handleDeleteTag}
        />
      )}

      {editingBlock && (
        <EventEditorModal
          block={editingBlock}
          tags={tags}
          onClose={() => setEditingBlockId(null)}
          onCreateTag={handleCreateTag}
          onSave={handleUpdateBlock}
        />
      )}
    </div>
  );
}
