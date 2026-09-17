import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const reviewTravelRequestMock = vi.fn();
const saveRequirementChecksMock = vi.fn();
const finalApproveTravelMock = vi.fn();
vi.mock("@/app/organizer/travel-reimbursements/actions", () => ({
  reviewTravelRequest: (...args: unknown[]) => reviewTravelRequestMock(...args),
  saveRequirementChecks: (...args: unknown[]) => saveRequirementChecksMock(...args),
  finalApproveTravel: (...args: unknown[]) => finalApproveTravelMock(...args),
}));

const { TravelReviewForm, FinalRequirementForms } = await import(
  "@/components/travel-review-forms"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TravelReviewForm", () => {
  test("renders default approved amount and currency label", () => {
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    expect(screen.getByLabelText("Approved reimbursement (EUR)")).toHaveValue(
      150,
    );
  });

  test("binds the reimbursementId and submits the approve operation", async () => {
    reviewTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve travel" }));

    await waitFor(() => {
      expect(reviewTravelRequestMock).toHaveBeenCalled();
    });
    const [reimbursementId, , formData] = reviewTravelRequestMock.mock.calls[0] as [
      string,
      unknown,
      FormData,
    ];
    expect(reimbursementId).toBe("r1");
    expect(formData.get("operation")).toBe("approve");
  });

  test("submits the requestChanges operation", async () => {
    reviewTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));

    await waitFor(() => {
      const [, , formData] = reviewTravelRequestMock.mock.calls[0] as [
        string,
        unknown,
        FormData,
      ];
      expect(formData.get("operation")).toBe("requestChanges");
    });
  });

  test("submits the reject operation", async () => {
    reviewTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      const [, , formData] = reviewTravelRequestMock.mock.calls[0] as [
        string,
        unknown,
        FormData,
      ];
      expect(formData.get("operation")).toBe("reject");
    });
  });

  test("shows an error message when review fails", async () => {
    reviewTravelRequestMock.mockResolvedValueOnce({ error: "Bad note" });
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Bad note");
  });

  test("shows a success message when review saves", async () => {
    reviewTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve travel" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Review saved.",
    );
  });

  test("does not render template pickers when no templates are provided", () => {
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
      />,
    );

    expect(
      screen.queryByLabelText("Reject template"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Request changes template"),
    ).not.toBeInTheDocument();
  });

  test("applying a reject template fills the reviewer note, and the note stays editable", () => {
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
        rejectTemplates={[
          { id: "tpl1", name: "Missing ticket", message: "Ticket missing." },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Reject template"), {
      target: { value: "Ticket missing." },
    });

    const note = screen.getByLabelText("Reviewer note") as HTMLTextAreaElement;
    expect(note.value).toBe("Ticket missing.");

    fireEvent.change(note, { target: { value: "Ticket missing, edited." } });
    expect(note.value).toBe("Ticket missing, edited.");
  });

  test("applying a request-changes template fills the reviewer note", () => {
    render(
      <TravelReviewForm
        reimbursementId="r1"
        submittedTotal="150.00"
        currencyCode="EUR"
        requestChangesTemplates={[
          { id: "tpl2", name: "Wrong dates", message: "Dates don't match." },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Request changes template"), {
      target: { value: "Dates don't match." },
    });

    expect(screen.getByLabelText("Reviewer note")).toHaveValue(
      "Dates don't match.",
    );
  });
});

describe("FinalRequirementForms", () => {
  test("renders each requirement with its checked state", () => {
    render(
      <FinalRequirementForms
        reimbursementId="r1"
        requirements={[
          { id: "req1", name: "Passport copy", checked: true },
          { id: "req2", name: "Boarding pass", checked: false },
        ]}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Passport copy" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Boarding pass" }),
    ).not.toBeChecked();
  });

  test("renders a placeholder message when there are no requirements", () => {
    render(<FinalRequirementForms reimbursementId="r1" requirements={[]} />);

    expect(
      screen.getByText("No active final requirements are configured."),
    ).toBeInTheDocument();
  });

  test("submits the checklist with checkbox state as requirement:<id> fields", async () => {
    saveRequirementChecksMock.mockResolvedValueOnce({ success: true });
    render(
      <FinalRequirementForms
        reimbursementId="r1"
        requirements={[{ id: "req1", name: "Passport copy", checked: false }]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Passport copy" }));
    fireEvent.click(screen.getByRole("button", { name: "Save checklist" }));

    await waitFor(() => {
      expect(saveRequirementChecksMock).toHaveBeenCalled();
    });
    const [reimbursementId, , formData] = saveRequirementChecksMock.mock
      .calls[0] as [string, unknown, FormData];
    expect(reimbursementId).toBe("r1");
    expect(formData.get("requirement:req1")).toBe("on");
  });

  test("submits final approval bound to the reimbursementId", async () => {
    finalApproveTravelMock.mockResolvedValueOnce({ success: true });
    render(<FinalRequirementForms reimbursementId="r1" requirements={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Final approve" }));

    await waitFor(() => {
      expect(finalApproveTravelMock).toHaveBeenCalled();
    });
    const [reimbursementId] = finalApproveTravelMock.mock.calls[0] as [string];
    expect(reimbursementId).toBe("r1");
  });

  test("shows a success message after final approval", async () => {
    finalApproveTravelMock.mockResolvedValueOnce({ success: true });
    render(<FinalRequirementForms reimbursementId="r1" requirements={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Final approve" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Final approval recorded.",
    );
  });

  test("shows an error message when checklist save fails", async () => {
    saveRequirementChecksMock.mockResolvedValueOnce({ error: "Save failed" });
    render(
      <FinalRequirementForms
        reimbursementId="r1"
        requirements={[{ id: "req1", name: "Passport copy", checked: false }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save checklist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  });
});
