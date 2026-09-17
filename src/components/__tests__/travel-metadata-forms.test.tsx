import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { TravelSettingsForm, TravelRequirementForm, TravelMessageTemplateForm } =
  await import("@/components/travel-metadata-forms");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TravelSettingsForm", () => {
  test("renders fields with defaults", () => {
    render(
      <TravelSettingsForm
        hackathonStartAt="2026-03-01T08:00"
        reimbursementInstructions="Submit receipts"
        finalReviewInstructions="Submit demo"
      />,
    );

    expect(
      screen.getByLabelText("Hackathon start (event local time)"),
    ).toHaveValue("2026-03-01T08:00");
    expect(
      screen.getByLabelText("Instructions shown after travel approval"),
    ).toHaveValue("Submit receipts");
    expect(
      screen.getByLabelText("Instructions shown during final review"),
    ).toHaveValue("Submit demo");
  });

  test("submits the updateTravelSettings operation", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelSettingsForm
        hackathonStartAt="2026-03-01T08:00"
        reimbursementInstructions="Submit receipts"
        finalReviewInstructions="Submit demo"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save travel settings" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("updateTravelSettings");
  });

  test("shows an error message when saving fails", async () => {
    saveMetadataMock.mockResolvedValueOnce({ error: "Something went wrong" });
    render(
      <TravelSettingsForm
        hackathonStartAt="2026-03-01T08:00"
        reimbursementInstructions="Submit receipts"
        finalReviewInstructions="Submit demo"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save travel settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });

  test("shows a success message when saving succeeds", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelSettingsForm
        hackathonStartAt="2026-03-01T08:00"
        reimbursementInstructions="Submit receipts"
        finalReviewInstructions="Submit demo"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save travel settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });
});

describe("TravelRequirementForm", () => {
  test("renders a create form when no id is provided", () => {
    render(<TravelRequirementForm />);

    expect(screen.getByText("New requirement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  test("renders an edit form with the active checkbox when an id is provided", () => {
    render(<TravelRequirementForm id="req1" name="Flight ticket" active={false} />);

    expect(screen.getByText("Requirement")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Flight ticket")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("submits createTravelRequirement operation when creating", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<TravelRequirementForm />);

    fireEvent.change(screen.getByLabelText("New requirement"), {
      target: { value: "Passport copy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createTravelRequirement");
    expect(formData.get("name")).toBe("Passport copy");
    expect(formData.get("id")).toBeNull();
  });

  test("submits updateTravelRequirement operation with the id when editing", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<TravelRequirementForm id="req1" name="Flight ticket" active />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("updateTravelRequirement");
    expect(formData.get("id")).toBe("req1");
  });
});

describe("TravelMessageTemplateForm", () => {
  test("renders a create form", () => {
    render(<TravelMessageTemplateForm />);

    expect(screen.getByText("New template name")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  test("renders an edit form with the active checkbox when an id is provided", () => {
    render(
      <TravelMessageTemplateForm
        id="tpl1"
        name="Wrong dates"
        message="Your dates don't match the event."
        active={false}
      />,
    );

    expect(screen.getByDisplayValue("Wrong dates")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Your dates don't match the event."),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("submits createTravelMessageTemplate with the name and message", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<TravelMessageTemplateForm />);

    fireEvent.change(screen.getByLabelText("New template name"), {
      target: { value: "Missing ticket" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "We could not verify your ticket." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createTravelMessageTemplate");
    expect(formData.get("name")).toBe("Missing ticket");
    expect(formData.get("message")).toBe("We could not verify your ticket.");
    expect(formData.get("id")).toBeNull();
  });

  test("submits updateTravelMessageTemplate with the id when editing", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelMessageTemplateForm
        id="tpl1"
        name="Missing ticket"
        message="We could not verify your ticket."
        active
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("updateTravelMessageTemplate");
    expect(formData.get("id")).toBe("tpl1");
  });
});
