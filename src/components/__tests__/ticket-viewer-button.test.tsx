import { describe, expect, test, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { TicketViewerButton } from "@/components/ticket-viewer-button";

afterEach(() => {
  cleanup();
});

describe("TicketViewerButton", () => {
  test("does not show the ticket dialog initially", () => {
    render(<TicketViewerButton ticketPath="/tickets/ticket.pdf" />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("opens the ticket dialog when the trigger button is clicked", () => {
    render(<TicketViewerButton ticketPath="/tickets/ticket.pdf" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open ticket document" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    const iframe = screen.getByTitle("Ticket document preview");
    expect(iframe.getAttribute("src")).toBe("/tickets/ticket.pdf");

    const link = screen.getByRole("link", {
      name: "Open in a new tab if preview does not load",
    });
    expect(link.getAttribute("href")).toBe("/tickets/ticket.pdf");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  test("closes the ticket dialog when the close button is clicked", () => {
    render(<TicketViewerButton ticketPath="/tickets/ticket.pdf" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open ticket document" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close ticket viewer" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
