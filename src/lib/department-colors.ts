// Client-safe on purpose: no server-only imports, so both server actions
// (picking a default for new departments) and client components (color
// picker swatch choices) can share it.

/** A small, visually-distinct palette new departments cycle through by
 * default. Admins can still override any department's color freely. */
export const DEPARTMENT_COLOR_PALETTE = [
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#f97316", // orange
  "#10b981", // emerald
  "#ec4899", // pink
  "#eab308", // yellow
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#ef4444", // red
  "#84cc16", // lime
] as const;

export const DEFAULT_DEPARTMENT_COLOR = "#64748b"; // slate (General)

export function nextDepartmentColor(existingCount: number) {
  return DEPARTMENT_COLOR_PALETTE[
    existingCount % DEPARTMENT_COLOR_PALETTE.length
  ];
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}
