import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const updateUserRoleMock = vi.fn();
vi.mock("@/app/organizer/actions", () => ({
  updateUserRole: (...args: unknown[]) => updateUserRoleMock(...args),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { UsersTable } = await import("@/components/users-table");

const users = [
  {
    id: "u1",
    name: "Raquel Alvarez",
    email: "raquel.alvarez@hackupc.com",
    role: "HACKER" as const,
    gender: "WOMAN" as const,
    city: "Barcelona",
    major: "CS",
  },
  {
    id: "u2",
    name: "Demo Organizer",
    email: "organizer@example.com",
    role: "ADMIN" as const,
    gender: null,
    city: null,
    major: null,
  },
  {
    id: "u3",
    name: null,
    email: "noname@example.com",
    role: "HACKER" as const,
    gender: null,
    city: null,
    major: null,
  },
];

describe("UsersTable", () => {
  test("renders every user when the search field is empty", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.getByText("Demo Organizer")).toBeInTheDocument();
    expect(screen.getByText("Name not provided")).toBeInTheDocument();
  });

  test("filters as you type, matching by name, case-insensitively", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "raquel" },
    });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Organizer")).not.toBeInTheDocument();
  });

  test("filters as you type, matching by email", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "hackupc" },
    });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Organizer")).not.toBeInTheDocument();
    expect(screen.queryByText("Name not provided")).not.toBeInTheDocument();
  });

  test("shows an empty state when nothing matches", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "nobody-matches-this" },
    });

    expect(
      screen.getByText('No users match "nobody-matches-this".'),
    ).toBeInTheDocument();
    expect(screen.queryByText("Raquel Alvarez")).not.toBeInTheDocument();
  });

  test("clearing the search restores every user", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    const input = screen.getByLabelText("Search users by name or email");
    fireEvent.change(input, { target: { value: "raquel" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.getByText("Demo Organizer")).toBeInTheDocument();
  });
});
