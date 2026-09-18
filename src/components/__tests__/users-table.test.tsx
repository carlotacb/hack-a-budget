import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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

  test("does not show gender, city, or major in the table itself", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    expect(screen.queryByText("Woman")).not.toBeInTheDocument();
    expect(screen.queryByText("Barcelona")).not.toBeInTheDocument();
    expect(screen.queryByText("CS")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens a details dialog with the full profile when Info is clicked", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.click(
      screen.getByRole("button", { name: "View details for Raquel Alvarez" }),
    );

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("raquel.alvarez@hackupc.com")).toBeInTheDocument();
    expect(dialog.getByText("Hacker")).toBeInTheDocument();
    expect(dialog.getByText("Woman")).toBeInTheDocument();
    expect(dialog.getByText("Barcelona")).toBeInTheDocument();
    expect(dialog.getByText("CS")).toBeInTheDocument();
  });

  test("falls back to 'Not provided' for missing profile fields in the dialog", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "View details for Demo Organizer",
      }),
    );

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getAllByText("Not provided")).toHaveLength(3);
  });

  test("closes the details dialog", () => {
    render(<UsersTable users={users} currentUserId="u2" />);

    fireEvent.click(
      screen.getByRole("button", { name: "View details for Raquel Alvarez" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close user details" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
