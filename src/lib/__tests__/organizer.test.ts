import { describe, expect, test, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { dashboardForRole, organizerRoles, roleLabels } = await import(
  "@/lib/organizer"
);

describe("dashboardForRole", () => {
  test("routes hackers to the hacker dashboard", () => {
    expect(dashboardForRole("HACKER")).toBe("/hacker");
  });

  test.each(["ORGANIZER", "DIRECTOR", "ADMIN"] as const)(
    "routes %s to the organizer dashboard",
    (role) => {
      expect(dashboardForRole(role)).toBe("/organizer");
    },
  );
});

describe("organizerRoles", () => {
  test("does not include HACKER", () => {
    expect(organizerRoles).not.toContain("HACKER");
  });
});

describe("roleLabels", () => {
  test("has a human-readable label for every role", () => {
    expect(roleLabels).toEqual({
      HACKER: "Hacker",
      ORGANIZER: "Organizer",
      DIRECTOR: "Director",
      ADMIN: "Admin",
    });
  });
});
