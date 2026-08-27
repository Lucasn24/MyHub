"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import styles from "./page.module.css";
import TimetableGrid from "./TimetableGrid";
import TodoList from "./TodoList";
import GoalCards from "./GoalCards";
import GoalDetailModal from "./GoalDetailModal";
import HoursChart from "./HoursChart";
import TaskCreatorModal from "./TaskCreatorModal";
import EventEditorModal from "./EventEditorModal";
import { useLocalStorageState } from "./useLocalStorageState";
import { DEFAULT_TAGS } from "./constants";
import { MOCK_CALENDAR_EVENTS } from "./mockCalendarEvents";
import { occursOn } from "./occurrences";
import { GRID_END_HOUR, GRID_START_HOUR, minutesToTime, timeToMinutes, toISODate } from "./time";
import type { Goal, ScheduleBlock, Tag, Task } from "./types";

export default function TasksPage() {
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const [tasks, setTasks] = useLocalStorageState<Task[]>("myhub.tasks", []);
  const [blocks, setBlocks] = useLocalStorageState<ScheduleBlock[]>("myhub.scheduleBlocks", []);
  const [tags, setTags] = useLocalStorageState<Tag[]>("myhub.tags", DEFAULT_TAGS);
  const [goals, setGoals] = useLocalStorageState<Goal[]>("myhub.goals", []);

  const [creatorOpen, setCreatorOpen] = useState<null | true | { startTime: string; endTime: string }>(null);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const todaysTasks = tasks.filter((t) => occursOn(t.repeat, todayISO));
  const todaysBlocks = blocks.filter((b) => b.date === todayISO);
  const openGoal = goals.find((g) => g.id === openGoalId) ?? null;
  const editingBlock = blocks.find((b) => b.id === editingBlockId) ?? null;

  const handleCreate = ({ task, block }: { task?: Task; block?: ScheduleBlock }) => {
    if (task) setTasks((prev) => [...prev, task]);
    if (block) setBlocks((prev) => [...prev, block]);
    setCreatorOpen(null);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<ScheduleBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
    setEditingBlockId(null);
  };

  const handleCreateTag = (tag: Tag) => setTags((prev) => [...prev, tag]);
  const handleCreateGoal = (goal: Goal) => setGoals((prev) => [...prev, goal]);

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const alreadyDone = t.completedDates.includes(todayISO);
        return {
          ...t,
          completedDates: alreadyDone
            ? t.completedDates.filter((d) => d !== todayISO)
            : [...t.completedDates, todayISO],
        };
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setBlocks((prev) => prev.filter((b) => b.taskId !== taskId));
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

  const handleQuickSchedule = (task: Task) => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const snapped = Math.min(
      GRID_END_HOUR * 60 - 30,
      Math.max(GRID_START_HOUR * 60, Math.ceil(nowMinutes / 15) * 15)
    );
    setBlocks((prev) => [...prev, makeBlockForTask(task, minutesToTime(snapped))]);
  };

  const handleDropTask = (taskId: string, startTime: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setBlocks((prev) => [...prev, makeBlockForTask(task, startTime)]);
  };

  const handleCreateRange = (range: { startTime: string; endTime: string }) => setCreatorOpen(range);

  const handleMoveBlock = (blockId: string, startTime: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const duration = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
        return { ...b, startTime, endTime: minutesToTime(timeToMinutes(startTime) + duration) };
      })
    );
  };

  const handleResizeBlock = (blockId: string, endTime: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, endTime } : b)));
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handlePushToGoogle = (blockId: string) => {
    // Mocked for now — no call to lib/google/calendar.ts createEvent() yet.
    // Wire that in once backend integration for this page is greenlit.
    setTimeout(() => {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, pushedToGoogle: true } : b)));
    }, 500);
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
            mockEvents={MOCK_CALENDAR_EVENTS}
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
