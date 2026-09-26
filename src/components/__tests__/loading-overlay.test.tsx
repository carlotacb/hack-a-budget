import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormPendingOverlay, LoadingOverlay } from "@/components/loading-overlay";
import { useActionState } from "react";

describe("LoadingOverlay", () => {
  test("shows a labelled busy indicator", () => {
    render(<LoadingOverlay label="Loading data…" />);

    expect(
      screen.getByRole("progressbar", { name: "Loading data…" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading data…")).toBeInTheDocument();
  });

  test("has a default label", () => {
    render(<LoadingOverlay />);

    expect(screen.getByRole("progressbar", { name: "Loading…" })).toBeInTheDocument();
  });
});

describe("FormPendingOverlay", () => {
  function TestForm({ action }: { action: () => Promise<object> }) {
    const [, formAction] = useActionState(action, {});
    return (
      <form action={formAction}>
        <FormPendingOverlay label="Saving thing…" />
        <button>Go</button>
      </form>
    );
  }

  test("is hidden until the form's action is running, then goes away", async () => {
    let resolveAction: (value: object) => void = () => {};
    const action = vi.fn(
      () => new Promise<object>((resolve) => (resolveAction = resolve)),
    );
    render(<TestForm action={action} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    expect(
      await screen.findByRole("progressbar", { name: "Saving thing…" }),
    ).toBeInTheDocument();

    resolveAction({});
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
