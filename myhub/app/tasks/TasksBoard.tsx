"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import styles from "./page.module.css";
import TimetableGrid from "./TimetableGrid";
import TodoList from "./TodoList";
import TagCards from "./TagCards";
import TagDetailModal from "./TagDetailModal";
import HoursChart from "./HoursChart";
import TaskCreatorModal from "./TaskCreatorModal";
import EventEditorModal from "./EventEditorModal";
import { blockOccursOn } from "./occurrences";
import { blockToRow, blockUpdatesToRow, tagToRow, taskToRow, taskUpdatesToRow } from "./serialization";
import { addDays, formatDayLabel, minutesToTime, timeToMinutes, toISODate } from "./time";
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
  selectedDate,
}: {
  initialTasks: Task[];
  initialBlocks: ScheduleBlock[];
  initialTags: Tag[];
  calendarEvents: CalendarEvent[];
  selectedDate: string;
}) {
  const router = useRouter();
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const isToday = selectedDate === todayISO;

  const [tasks, setTasks] = useResyncedState(initialTasks);
  const [blocks, setBlocks] = useResyncedState(initialBlocks);
  const [tags, setTags] = useResyncedState(initialTags);

  const [creatorOpen, setCreatorOpen] = useState<null | true | { startTime: string; endTime: string }>(null);
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  const [openTagId, setOpenTagId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const visibleBlocks = blocks.filter((b) => blockOccursOn(b, selectedDate));
  const openTag = tags.find((t) => t.id === openTagId) ?? null;
  const editingBlock = blocks.find((b) => b.id === editingBlockId) ?? null;

  const goToDate = (dateISO: string) => router.push(`/tasks?date=${dateISO}`);
  const goToPrevDay = () => goToDate(addDays(selectedDate, -1));
  const goToNextDay = () => goToDate(addDays(selectedDate, 1));
  const goToToday = () => goToDate(todayISO);

  const handleCreate = async ({
    task,
    block,
    linkedTaskIds,
  }: {
    task?: Task;
    block?: ScheduleBlock;
    linkedTaskIds?: string[];
  }) => {
    if (task) setTasks((prev) => [...prev, task]);
    if (block) setBlocks((prev) => [...prev, block]);
    if (block && linkedTaskIds?.length) {
      const linked = new Set(linkedTaskIds);
      setTasks((prev) => prev.map((t) => (linked.has(t.id) ? { ...t, eventId: block.id } : t)));
    }
    setCreatorOpen(null);
    setScheduleTaskId(null);
    try {
      await Promise.all([
        task && apiJSON("/api/planner/tasks", "POST", taskToRow(task)),
        block && apiJSON("/api/planner/blocks", "POST", blockToRow(block)),
        ...(block
          ? (linkedTaskIds ?? []).map((taskId) =>
              apiJSON(`/api/planner/tasks/${taskId}`, "PATCH", taskUpdatesToRow({ eventId: block.id }))
            )
          : []),
      ]);
    } catch (err) {
      console.error("Failed to save:", err);
    }
    router.refresh();
  };

  // Links/unlinks tasks to an event from the event's own side — diffs against
  // whichever tasks currently point at it and only touches the ones that changed.
  const handleSetLinkedTasks = async (eventId: string, taskIds: string[]) => {
    const linked = new Set(taskIds);
    const changed = tasks.filter((t) => (t.eventId === eventId) !== linked.has(t.id));
    setTasks((prev) =>
      prev.map((t) => {
        if (linked.has(t.id)) return { ...t, eventId };
        if (t.eventId === eventId) return { ...t, eventId: undefined };
        return t;
      })
    );
    try {
      await Promise.all(
        changed.map((t) =>
          apiJSON(
            `/api/planner/tasks/${t.id}`,
            "PATCH",
            taskUpdatesToRow({ eventId: linked.has(t.id) ? eventId : undefined })
          )
        )
      );
    } catch (err) {
      console.error("Failed to update linked tasks:", err);
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
    const block = blocks.find((b) => b.id === blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setTasks((prev) => prev.map((t) => (t.eventId === blockId ? { ...t, eventId: undefined } : t)));
    try {
      await apiJSON(`/api/planner/blocks/${blockId}`, "DELETE", { googleEventId: block?.googleEventId });
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
      const updated = (await res.json()) as { google_event_id: string | null };
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, pushedToGoogle: true, googleEventId: updated.google_event_id ?? undefined } : b
        )
      );
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
          <span className={styles.statusBadge}>{formatDayLabel(selectedDate, todayISO).toUpperCase()}</span>
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
            <div className={styles.dayNav}>
              {!isToday && (
                <button type="button" className={styles.dayNavToday} onClick={goToToday}>
                  Today
                </button>
              )}
              <button type="button" className={styles.dayNavArrow} onClick={goToPrevDay} aria-label="Previous day">
                <ChevronLeft size={15} strokeWidth={2.5} />
              </button>
              <input
                type="date"
                className={styles.dayNavInput}
                value={selectedDate}
                onChange={(e) => e.target.value && goToDate(e.target.value)}
              />
              <button type="button" className={styles.dayNavArrow} onClick={goToNextDay} aria-label="Next day">
                <ChevronRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <TimetableGrid
            blocks={visibleBlocks}
            tags={tags}
            calendarEvents={calendarEvents}
            isToday={isToday}
            selectedDate={selectedDate}
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
              onSchedule={setScheduleTaskId}
            />
          </div>

          <div className={styles.sideHalf}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>DISTRIBUTION</span>
            </div>
            <HoursChart tags={tags} blocks={blocks} todayISO={selectedDate} />
          </div>
        </div>
      </div>

      {(creatorOpen !== null || scheduleTaskId !== null) && (
        <TaskCreatorModal
          tags={tags}
          tasks={tasks}
          selectedDate={selectedDate}
          initialRange={creatorOpen === true || creatorOpen === null ? null : creatorOpen}
          presetTaskId={scheduleTaskId ?? undefined}
          defaultMode={creatorOpen === true ? "task" : "event"}
          onClose={() => {
            setCreatorOpen(null);
            setScheduleTaskId(null);
          }}
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
          tasks={tasks}
          onClose={() => setEditingBlockId(null)}
          onCreateTag={handleCreateTag}
          onSave={handleUpdateBlock}
          onLinkTasks={handleSetLinkedTasks}
        />
      )}
    </div>
  );
}
