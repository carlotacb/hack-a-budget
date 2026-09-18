import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const updateUserRoleMock = vi.fn();
vi.mock("@/app/organizer/actions", () => ({
  updateUserRole: (...args: unknown[]) => updateUserRoleMock(...args),
}));

const { UserRoleButton } = await import("@/components/user-role-button");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UserRoleButton", () => {
  test("shows a static label instead of a form for the current user", () => {
    render(
      <UserRoleButton userId="u1" currentRole="ADMIN" isCurrentUser />,
    );

    expect(screen.getByText("Your account")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  test("renders a role selector and save button for other users", () => {
    render(
      <UserRoleButton userId="u1" currentRole="HACKER" isCurrentUser={false} />,
    );

    const select = screen.getByRole("combobox", {
      name: "User role",
    }) as HTMLSelectElement;
    expect(select.value).toBe("HACKER");
    expect(screen.getByRole("button", { name: "Save role" })).toBeTruthy();
  });

  test("does not submit when the role is unchanged", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <UserRoleButton userId="u1" currentRole="HACKER" isCurrentUser={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(updateUserRoleMock).not.toHaveBeenCalled();
  });

  test("submits the update when the user confirms a role change", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    updateUserRoleMock.mockResolvedValueOnce({});
    render(
      <UserRoleButton userId="u1" currentRole="HACKER" isCurrentUser={false} />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "User role" }), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Change this user's role from Hacker to Admin? Their access will update immediately.",
    );
    await waitFor(() => {
      expect(updateUserRoleMock).toHaveBeenCalled();
    });
  });

  test("does not submit when the user cancels the confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <UserRoleButton userId="u1" currentRole="HACKER" isCurrentUser={false} />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "User role" }), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    expect(updateUserRoleMock).not.toHaveBeenCalled();
  });

  test("shows the error message returned by the action", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    updateUserRoleMock.mockResolvedValueOnce({ error: "Something went wrong" });
    render(
      <UserRoleButton userId="u1" currentRole="HACKER" isCurrentUser={false} />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "User role" }), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Something went wrong");
  });
});
