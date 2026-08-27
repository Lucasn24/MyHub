export const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 90, 120];

// Validated categorical palette (light mode), fixed order — see the dataviz
// skill's references/palette.md. Capped at 6 to match the pie chart's
// part-to-whole segment limit; tags beyond this fold into an "Other" bucket
// in the hours chart (TagCards itself cycles the same 6 for card accents).
export const TAG_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
];
export const TAG_OTHER_COLOR = "#898781";

export function getTagColor(index: number): string {
  return TAG_PALETTE[index % TAG_PALETTE.length];
}
