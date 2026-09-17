import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const signOutMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

const { AppHeader } = await import("@/components/app-header");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AppHeader", () => {
  test("renders the participant name and role", () => {
    render(<AppHeader name="Jane Doe" role="Hacker" />);

    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("Hacker")).toBeTruthy();
  });

  test("falls back to 'Participant' when no name is provided", () => {
    render(<AppHeader name={null} role="Organizer" />);

    expect(screen.getByText("Participant")).toBeTruthy();
  });

  test("calls signOut with the redirect target when the button is clicked", async () => {
    signOutMock.mockResolvedValueOnce(undefined);
    render(<AppHeader name="Jane Doe" role="Hacker" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/" });
    // On success the component keeps the button disabled while next-auth
    // navigates away, so it stays in the "Signing out..." state.
    await waitFor(() => {
      expect(screen.getByRole("button").textContent).toBe("Signing out...");
    });
  });

  test("shows a signing out state while the request is pending", async () => {
    let resolveSignOut: () => void = () => {};
    signOutMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    render(<AppHeader name="Jane Doe" role="Hacker" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    const pendingButton = (await screen.findByRole("button", {
      name: "Signing out...",
    })) as HTMLButtonElement;
    expect(pendingButton.disabled).toBe(true);

    resolveSignOut();
    // The component keeps showing the pending state after a successful
    // sign out, since next-auth's redirect is expected to navigate away.
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button").textContent).toBe("Signing out...");
  });

  test("shows an error message and re-enables the button when sign out fails", async () => {
    signOutMock.mockRejectedValueOnce(new Error("network error"));
    render(<AppHeader name="Jane Doe" role="Hacker" />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Sign out failed. Please try again.");
    const button = screen.getByRole("button", {
      name: "Sign out",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
