import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DEFAULT_ROLE_SETTINGS } from "@/lib/role-settings";

const updateUserRoleMock = vi.fn();
const deleteOrganizerUserMock = vi.fn();
vi.mock("@/app/organizer/actions", () => ({
  updateUserRole: (...args: unknown[]) => updateUserRoleMock(...args),
  deleteOrganizerUser: (...args: unknown[]) =>
    deleteOrganizerUserMock(...args),
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
    departmentId: null,
    gender: "WOMAN" as const,
    diet: "VEGETARIAN" as const,
    tshirtSize: "M" as const,
  },
  {
    id: "u2",
    name: "Demo Organizer",
    email: "organizer@example.com",
    role: "ADMIN" as const,
    departmentId: null,
    gender: null,
    diet: null,
    tshirtSize: null,
  },
  {
    id: "u3",
    name: null,
    email: "noname@example.com",
    role: "HACKER" as const,
    departmentId: null,
    gender: null,
    diet: null,
    tshirtSize: null,
  },
];

const defaultProps = {
  roleSettings: DEFAULT_ROLE_SETTINGS,
  departments: [],
};


describe("UsersTable", () => {
  test("renders every user when the search field is empty", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.getByText("Demo Organizer")).toBeInTheDocument();
    expect(screen.getByText("Name not provided")).toBeInTheDocument();
  });

  test("filters as you type, matching by name, case-insensitively", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "raquel" },
    });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Organizer")).not.toBeInTheDocument();
  });

  test("filters as you type, matching by email", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "hackupc" },
    });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Organizer")).not.toBeInTheDocument();
    expect(screen.queryByText("Name not provided")).not.toBeInTheDocument();
  });

  test("shows an empty state when nothing matches", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Search users by name or email"), {
      target: { value: "nobody-matches-this" },
    });

    expect(
      screen.getByText('No users match "nobody-matches-this".'),
    ).toBeInTheDocument();
    expect(screen.queryByText("Raquel Alvarez")).not.toBeInTheDocument();
  });

  test("clearing the search restores every user", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    const input = screen.getByLabelText("Search users by name or email");
    fireEvent.change(input, { target: { value: "raquel" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.getByText("Demo Organizer")).toBeInTheDocument();
  });

  test("does not show gender, diet, or t-shirt size in the table itself", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    expect(screen.queryByText("Woman")).not.toBeInTheDocument();
    expect(screen.queryByText("Vegetarian")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens a details dialog with the full profile when Info is clicked", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "View details for Raquel Alvarez" }),
    );

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("raquel.alvarez@hackupc.com")).toBeInTheDocument();
    expect(dialog.getByText("Participant")).toBeInTheDocument();
    expect(dialog.getByText("Woman")).toBeInTheDocument();
    expect(dialog.getByText("Vegetarian")).toBeInTheDocument();
    expect(dialog.getByText("M")).toBeInTheDocument();
  });

  test("falls back to 'Not provided' for missing profile fields in the dialog", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "View details for Demo Organizer",
      }),
    );

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getAllByText("Not provided")).toHaveLength(3);
  });

  test("closes the details dialog", () => {
    render(<UsersTable users={users} currentUserId="u2" {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "View details for Raquel Alvarez" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close user details" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
