export type RepeatFreq = "daily" | "weekly";

export type RepeatRule = {
  freq: RepeatFreq;
  daysOfWeek?: number[]; // 0 (Sun) - 6 (Sat), weekly only
  endDate?: string; // ISO date, inclusive; undefined = repeats forever
};

export type Tag = {
  id: string;
  label: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string; // ISO date
  dueTime?: string; // "HH:mm"
  tagId?: string;
  eventId?: string; // optional link to an existing ScheduleBlock, for organization only
  completedDates: string[]; // ISO dates this task was completed on
  createdAt: string;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  notes?: string;
  date: string; // ISO date
  startTime: string; // "HH:mm", 15-min aligned
  endTime: string; // "HH:mm", 15-min aligned
  tagId?: string;
  repeat?: RepeatRule;
  pushedToGoogle: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  location?: string;
};

export type Urgency = "overdue" | "dueToday" | "dueSoon" | "upcoming" | "none";
