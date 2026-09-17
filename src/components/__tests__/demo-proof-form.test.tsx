import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const saveDemoProofMock = vi.fn();
vi.mock("@/app/hacker/travel-actions", () => ({
  saveDemoProof: (...args: unknown[]) => saveDemoProofMock(...args),
}));

const { DemoProofForm } = await import("@/components/demo-proof-form");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DemoProofForm", () => {
  test("disables the trigger button when locked and shows the unlock label", () => {
    render(
      <DemoProofForm
        unlocked={false}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    expect(screen.getByRole("button", { name: /Demo prove/ })).toBeDisabled();
    expect(screen.getByText("Unlocks after final review.")).toBeInTheDocument();
  });

  test("does not render the form when unlocked is false, even after clicking", () => {
    render(
      <DemoProofForm
        unlocked={false}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));

    expect(screen.queryByLabelText("Project or demo URL")).not.toBeInTheDocument();
  });

  test("starts open when a demoUrl already exists", () => {
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl="https://demo.example.com"
        demoComment="Room 42"
      />,
    );

    expect(screen.getByLabelText("Project or demo URL")).toHaveValue(
      "https://demo.example.com",
    );
    expect(screen.getByLabelText("Demo room or other comments")).toHaveValue(
      "Room 42",
    );
    expect(
      screen.getByRole("button", { name: "Update demo proof" }),
    ).toBeInTheDocument();
  });

  test("toggles the form open and closed when unlocked", () => {
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    expect(screen.queryByLabelText("Project or demo URL")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    expect(screen.getByLabelText("Project or demo URL")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit demo proof" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    expect(screen.queryByLabelText("Project or demo URL")).not.toBeInTheDocument();
  });

  test("submits the entered demo url and comment", async () => {
    saveDemoProofMock.mockResolvedValueOnce({ success: true });
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    fireEvent.change(screen.getByLabelText("Project or demo URL"), {
      target: { value: "https://demo.example.com" },
    });
    fireEvent.change(screen.getByLabelText("Demo room or other comments"), {
      target: { value: "Room 42" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit demo proof" }),
    );

    await waitFor(() => {
      expect(saveDemoProofMock).toHaveBeenCalled();
    });
    const formData = saveDemoProofMock.mock.calls[0][1] as FormData;
    expect(formData.get("demoUrl")).toBe("https://demo.example.com");
    expect(formData.get("demoComment")).toBe("Room 42");
  });

  test("disables the submit button and shows the saving label while pending", async () => {
    let resolveSave: (value: object) => void = () => {};
    saveDemoProofMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    fireEvent.change(screen.getByLabelText("Project or demo URL"), {
      target: { value: "https://demo.example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit demo proof" }),
    );

    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();

    resolveSave({ success: true });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Submit demo proof" }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    saveDemoProofMock.mockResolvedValueOnce({ error: "Invalid URL." });
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    fireEvent.change(screen.getByLabelText("Project or demo URL"), {
      target: { value: "https://demo.example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit demo proof" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid URL.");
  });

  test("shows a success message returned from the action", async () => {
    saveDemoProofMock.mockResolvedValueOnce({ success: true });
    render(
      <DemoProofForm
        unlocked={true}
        unlockLabel="after final review"
        demoUrl=""
        demoComment=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demo prove/ }));
    fireEvent.change(screen.getByLabelText("Project or demo URL"), {
      target: { value: "https://demo.example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit demo proof" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Demo proof saved.",
    );
  });
});
