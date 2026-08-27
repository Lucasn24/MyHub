export const TAG_COLOR_PRESETS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6b7280", // gray
];

export const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 90, 120];

// Validated categorical palette (light mode), fixed order — see the dataviz
// skill's references/palette.md. Capped at 6 to match the pie chart's
// part-to-whole segment limit; goals beyond this fold into an "Other" bucket
// in the hours chart (GoalCards itself cycles the same 6 for card accents).
export const GOAL_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
];
export const GOAL_OTHER_COLOR = "#898781";

export function getGoalColor(index: number): string {
  return GOAL_PALETTE[index % GOAL_PALETTE.length];
}
