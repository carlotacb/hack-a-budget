import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

const { OrganizerNav } = await import("@/components/organizer-nav");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("OrganizerNav", () => {
  test("shows only the links allowed for an ORGANIZER role", () => {
    usePathnameMock.mockReturnValue("/organizer");
    render(<OrganizerNav role="ORGANIZER" />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Expenses")).toBeTruthy();
    expect(screen.queryByText("Budget")).toBeNull();
    expect(screen.queryByText("Travel")).toBeNull();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.queryByText("Metadata")).toBeNull();
  });

  test("shows all links for an ADMIN role", () => {
    usePathnameMock.mockReturnValue("/organizer");
    render(<OrganizerNav role="ADMIN" />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
    expect(screen.getByText("Expenses")).toBeTruthy();
    expect(screen.getByText("Travel")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("Metadata")).toBeTruthy();
  });

  test("shows DIRECTOR-appropriate links without ADMIN-only ones", () => {
    usePathnameMock.mockReturnValue("/organizer");
    render(<OrganizerNav role="DIRECTOR" />);

    expect(screen.getByText("Budget")).toBeTruthy();
    expect(screen.getByText("Travel")).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.queryByText("Metadata")).toBeNull();
  });

  test("marks the dashboard link active only on an exact match", () => {
    usePathnameMock.mockReturnValue("/organizer/expenses");
    render(<OrganizerNav role="ADMIN" />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const expensesLink = screen.getByText("Expenses").closest("a");

    expect(dashboardLink?.className).not.toContain("organizer-nav-link-active");
    expect(expensesLink?.className).toContain("organizer-nav-link-active");
  });

  test("marks a nested route active via startsWith matching", () => {
    usePathnameMock.mockReturnValue("/organizer/travel-reimbursements/abc123");
    render(<OrganizerNav role="ADMIN" />);

    const travelLink = screen.getByText("Travel").closest("a");

    expect(travelLink?.className).toContain("organizer-nav-link-active");
  });
});
