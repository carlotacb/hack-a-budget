import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const switchActiveHackathonMock = vi.fn();
vi.mock("@/app/actions/hackathon", () => ({
  switchActiveHackathon: (...args: unknown[]) =>
    switchActiveHackathonMock(...args),
}));

const { HackathonSwitcher } = await import("@/components/hackathon-switcher");

const options = [
  { hackathonId: "h1", hackathonName: "BudgetHack", role: "ADMIN" as const },
  { hackathonId: "h2", hackathonName: "HackUPC", role: "HACKER" as const },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("HackathonSwitcher", () => {
  test("renders nothing for a single membership", () => {
    const { container } = render(
      <HackathonSwitcher options={[options[0]]} activeHackathonId="h1" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the active hackathon and lists every membership with its role", () => {
    render(<HackathonSwitcher options={options} activeHackathonId="h1" />);

    const trigger = screen.getByRole("button", { name: "BudgetHack" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("option");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("aria-selected", "true");
    expect(items[1]).toHaveTextContent("HackUPC");
    expect(items[1]).toHaveTextContent("Participant");
  });

  test("falls back to a prompt when the active hackathon is unknown", () => {
    render(<HackathonSwitcher options={options} activeHackathonId="gone" />);

    expect(
      screen.getByRole("button", { name: "Select hackathon" }),
    ).toBeInTheDocument();
  });

  test("switches to another hackathon", () => {
    render(<HackathonSwitcher options={options} activeHackathonId="h1" />);

    fireEvent.click(screen.getByRole("button", { name: "BudgetHack" }));
    fireEvent.click(screen.getByRole("option", { name: /HackUPC/ }));

    expect(switchActiveHackathonMock).toHaveBeenCalledWith("h2");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("closes without switching when picking the active hackathon", () => {
    render(<HackathonSwitcher options={options} activeHackathonId="h1" />);

    fireEvent.click(screen.getByRole("button", { name: "BudgetHack" }));
    fireEvent.click(screen.getByRole("option", { name: /BudgetHack/ }));

    expect(switchActiveHackathonMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("closes when clicking outside the menu", () => {
    render(<HackathonSwitcher options={options} activeHackathonId="h1" />);

    fireEvent.click(screen.getByRole("button", { name: "BudgetHack" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Close hackathon menu" }),
    );

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
