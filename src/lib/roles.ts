import type { Role } from "@prisma/client";

// Client-safe on purpose: no server-only imports (auth, prisma) so client
// components can use these without pulling them into the browser bundle.
export const roleLabels = {
  HACKER: "Hacker",
  ORGANIZER: "Organizer",
  DIRECTOR: "Director",
  ADMIN: "Admin",
} as const satisfies Record<Role, string>;
