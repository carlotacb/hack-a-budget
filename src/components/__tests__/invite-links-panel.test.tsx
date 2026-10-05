import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";

const createHackerInviteMock = vi.fn();
const revokeHackerInviteMock = vi.fn();
vi.mock("@/app/organizer/users/actions", () => ({
  createHackerInvite: (...args: unknown[]) => createHackerInviteMock(...args),
  revokeHackerInvite: (...args: unknown[]) => revokeHackerInviteMock(...args),
}));

const { InviteLinksPanel } = await import("@/components/invite-links-panel");

const invites = [
  { id: "invite1", token: "abc123", createdAt: new Date(2026, 0, 1) },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("InviteLinksPanel", () => {
  test("shows an empty state without open invites", () => {
    render(<InviteLinksPanel invites={[]} />);

    expect(screen.getByText(/No open invites/)).toBeInTheDocument();
  });

  test("lists open invites", () => {
    render(<InviteLinksPanel invites={invites} />);

    expect(screen.getByText("/invite/abc123")).toBeInTheDocument();
  });

  test("generates an invite", async () => {
    createHackerInviteMock.mockResolvedValueOnce({});
    render(<InviteLinksPanel invites={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate invite" }));

    await waitFor(() => expect(createHackerInviteMock).toHaveBeenCalled());
  });

  test("shows an error when generating fails", async () => {
    createHackerInviteMock.mockResolvedValueOnce({ error: "Try again." });
    render(<InviteLinksPanel invites={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Try again.");
  });

  test("revokes an invite", async () => {
    revokeHackerInviteMock.mockResolvedValueOnce({});
    render(<InviteLinksPanel invites={invites} />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke invite link" }));

    await waitFor(() =>
      expect(revokeHackerInviteMock).toHaveBeenCalledWith("invite1"),
    );
  });

  test("copies the full invite url", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<InviteLinksPanel invites={invites} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/invite/abc123`,
    );
  });
});
