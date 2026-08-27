"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import styles from "./page.module.css";
import TimetableGrid from "./TimetableGrid";
import TodoList from "./TodoList";
import GoalCards from "./GoalCards";
import GoalDetailModal from "./GoalDetailModal";
import HoursChart from "./HoursChart";
import TaskCreatorModal from "./TaskCreatorModal";
import EventEditorModal from "./EventEditorModal";
import { occursOn } from "./occurrences";
import { blockToRow, blockUpdatesToRow, goalToRow, tagToRow, taskToRow, taskUpdatesToRow } from "./serialization";
import { GRID_END_HOUR, GRID_START_HOUR, minutesToTime, timeToMinutes, toISODate } from "./time";
import type { CalendarEvent, Goal, ScheduleBlock, Tag, Task } from "./types";

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
  initialGoals,
  calendarEvents,
}: {
  initialTasks: Task[];
  initialBlocks: ScheduleBlock[];
  initialTags: Tag[];
  initialGoals: Goal[];
  calendarEvents: CalendarEvent[];
}) {
  const router = useRouter();
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const [tasks, setTasks] = useResyncedState(initialTasks);
  const [blocks, setBlocks] = useResyncedState(initialBlocks);
  const [tags, setTags] = useResyncedState(initialTags);
  const [goals, setGoals] = useResyncedState(initialGoals);

  const [creatorOpen, setCreatorOpen] = useState<null | true | { startTime: string; endTime: string }>(null);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const todaysTasks = tasks.filter((t) => occursOn(t.repeat, todayISO));
  const todaysBlocks = blocks.filter((b) => b.date === todayISO);
  const openGoal = goals.find((g) => g.id === openGoalId) ?? null;
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

  const handleCreateGoal = async (goal: Goal) => {
    setGoals((prev) => [...prev, goal]);
    try {
      await apiJSON("/api/planner/goals", "POST", goalToRow(goal));
    } catch (err) {
      console.error("Failed to save goal:", err);
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
    setBlocks((prev) => prev.filter((b) => b.taskId !== taskId));
    try {
      // The DB cascades planner_blocks on task delete, so no separate block deletes needed.
      await apiJSON(`/api/planner/tasks/${taskId}`, "DELETE");
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
    router.refresh();
  };

  const makeBlockForTask = (task: Task, startTime: string): ScheduleBlock => ({
    id: crypto.randomUUID(),
    taskId: task.id,
    title: task.title,
    date: todayISO,
    startTime,
    endTime: minutesToTime(timeToMinutes(startTime) + 30),
    tagIds: task.tagIds,
    pushedToGoogle: false,
  });

  const createBlock = async (block: ScheduleBlock) => {
    setBlocks((prev) => [...prev, block]);
    try {
      await apiJSON("/api/planner/blocks", "POST", blockToRow(block));
    } catch (err) {
      console.error("Failed to save block:", err);
    }
    router.refresh();
  };

  const handleQuickSchedule = (task: Task) => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const snapped = Math.min(
      GRID_END_HOUR * 60 - 30,
      Math.max(GRID_START_HOUR * 60, Math.ceil(nowMinutes / 15) * 15)
    );
    void createBlock(makeBlockForTask(task, minutesToTime(snapped)));
  };

  const handleDropTask = (taskId: string, startTime: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    void createBlock(makeBlockForTask(task, startTime));
  };

  const handleCreateRange = (range: { startTime: string; endTime: string }) => setCreatorOpen(range);

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

  const handleDeleteBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
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

      <GoalCards goals={goals} tasks={tasks} onOpenGoal={setOpenGoalId} onCreateGoal={handleCreateGoal} />

      <div className={styles.content}>
        <div className={styles.timetableColumn}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>TIMETABLE</span>
            <span className={styles.runningCount}>Drag to create a block · drag a to-do in to schedule it</span>
          </div>
          <TimetableGrid
            blocks={todaysBlocks}
            tags={tags}
            calendarEvents={calendarEvents}
            onCreateRange={handleCreateRange}
            onDropTask={handleDropTask}
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
              <span className={styles.runningCount}>{todaysTasks.length} total</span>
            </div>
            <TodoList
              tasks={todaysTasks}
              tags={tags}
              goals={goals}
              todayISO={todayISO}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onQuickSchedule={handleQuickSchedule}
            />
          </div>

          <div className={styles.sideHalf}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>DISTRIBUTION</span>
            </div>
            <HoursChart goals={goals} tasks={tasks} blocks={blocks} todayISO={todayISO} />
          </div>
        </div>
      </div>

      {creatorOpen !== null && (
        <TaskCreatorModal
          tags={tags}
          goals={goals}
          todayISO={todayISO}
          initialRange={creatorOpen === true ? null : creatorOpen}
          onClose={() => setCreatorOpen(null)}
          onCreateTag={handleCreateTag}
          onCreateGoal={handleCreateGoal}
          onCreate={handleCreate}
        />
      )}

      {openGoal && (
        <GoalDetailModal goal={openGoal} tasks={tasks} blocks={blocks} onClose={() => setOpenGoalId(null)} />
      )}

      {editingBlock && (
        <EventEditorModal
          block={editingBlock}
          tags={tags}
          goals={goals}
          onClose={() => setEditingBlockId(null)}
          onCreateGoal={handleCreateGoal}
          onSave={handleUpdateBlock}
        />
      )}
    </div>
  );
}
