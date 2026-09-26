import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const saveTravelRequestMock = vi.fn();
vi.mock("@/app/hacker/travel-actions", () => ({
  saveTravelRequest: (...args: unknown[]) => saveTravelRequestMock(...args),
}));

const { TravelReimbursementForm } = await import(
  "@/components/travel-reimbursement-form"
);
import type { TravelFormValues } from "@/components/travel-reimbursement-form";

beforeEach(() => {
  vi.clearAllMocks();
});

function baseValues(
  overrides: Partial<TravelFormValues> = {},
): TravelFormValues {
  return {
    originCity: "",
    originCountry: "",
    transportMode: "TRAIN",
    outboundDepartureAt: "",
    outboundDeparturePlace: "",
    outboundArrivalAt: "",
    outboundArrivalPlace: "",
    outboundCarrier: "",
    outboundServiceNumber: "",
    returnDepartureAt: "",
    returnDeparturePlace: "",
    returnArrivalAt: "",
    returnArrivalPlace: "",
    returnCarrier: "",
    returnServiceNumber: "",
    totalPrice: "",
    totalCurrency: "",
    luggagePaid: false,
    luggagePrice: "",
    ...overrides,
  };
}

function fullValues(overrides: Partial<TravelFormValues> = {}): TravelFormValues {
  return baseValues({
    originCity: "Barcelona",
    originCountry: "Spain",
    outboundDepartureAt: "2026-03-01T08:00",
    outboundDeparturePlace: "Sants Station",
    outboundArrivalAt: "2026-03-01T12:00",
    outboundArrivalPlace: "Paris Gare",
    outboundCarrier: "Renfe",
    returnDepartureAt: "2026-03-05T08:00",
    returnDeparturePlace: "Paris Gare",
    returnArrivalAt: "2026-03-05T12:00",
    returnArrivalPlace: "Sants Station",
    returnCarrier: "Renfe",
    totalPrice: "150",
    totalCurrency: "EUR",
    ...overrides,
  });
}

function attachTicket(name = "ticket.pdf") {
  const input = screen.getByLabelText("Ticket document*", {
    exact: false,
  }) as HTMLInputElement;
  const file = new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
}

// jsdom enforces native constraint validation (e.g. the file input's
// `required` flag isn't satisfied by files assigned via fireEvent) when a
// submit button is clicked, which would block these tests before the form's
// action ever runs. Dispatching `submit` directly exercises the same
// React 19 action wiring without going through that browser-only check.
function submitForm() {
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
}

describe("TravelReimbursementForm", () => {
  test("renders origin, transport mode options and outbound/return journeys", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    expect(screen.getByLabelText("Origin city*")).toBeInTheDocument();
    expect(screen.getByLabelText("Origin country*")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bus" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Train" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Airplane" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Outbound journey" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Return journey" }),
    ).toBeInTheDocument();
  });

  test("uses train-specific labels for departure/arrival place and service number when TRAIN", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    expect(
      screen.getAllByLabelText("Departure station*").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText("Service number (optional)").length,
    ).toBeGreaterThan(0);
  });

  test("switches to airport labels and requires flight number when AIRPLANE is selected", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Airplane" }));

    expect(screen.getAllByLabelText("Departure airport*").length).toBe(2);
    expect(screen.getAllByLabelText("Flight number*").length).toBe(2);
  });

  test("shows the bus company placeholder by default", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Bus" }));

    const companyInputs = screen.getAllByLabelText("Company*");
    expect(companyInputs[0]).toHaveAttribute(
      "placeholder",
      "Select a bus company",
    );
  });

  test("shows the train company placeholder for TRAIN", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    const companyInputs = screen.getAllByLabelText("Company*");
    expect(companyInputs[0]).toHaveAttribute(
      "placeholder",
      "Select a train company",
    );
  });

  test("shows the airline placeholder for AIRPLANE", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Airplane" }));

    const companyInputs = screen.getAllByLabelText("Company*");
    expect(companyInputs[0]).toHaveAttribute(
      "placeholder",
      "Select an airline company",
    );
  });

  test("toggles the luggage price field when the luggage checkbox is checked", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    expect(screen.queryByLabelText("Luggage price*")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Luggage" }));

    expect(screen.getByLabelText("Luggage price*")).toBeInTheDocument();
  });

  test("shows the luggage price field up front when luggagePaid starts true", () => {
    render(
      <TravelReimbursementForm
        values={baseValues({ luggagePaid: true, luggagePrice: "20" })}
        isResubmission={false}
      />,
    );

    expect(screen.getByLabelText("Luggage price*")).toHaveValue(20);
  });

  test("marks the ticket upload as required for a new submission", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    expect(
      screen.getByLabelText("Ticket document*", { exact: false }),
    ).toBeRequired();
    expect(
      screen.getByText("Upload one PDF, JPG, PNG, or WebP (max 5 MB)"),
    ).toBeInTheDocument();
  });

  test("makes the ticket upload optional and links to the existing ticket when one exists", () => {
    render(
      <TravelReimbursementForm
        values={baseValues({ ticketPath: "/uploads/ticket.pdf" })}
        isResubmission={true}
      />,
    );

    expect(
      screen.getByLabelText("Ticket document", { exact: false }),
    ).not.toBeRequired();
    expect(screen.getByText("Replace current ticket (optional)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View current ticket" })).toHaveAttribute(
      "href",
      "/uploads/ticket.pdf",
    );
  });

  test("shows the selected ticket file name after choosing a file", () => {
    render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );

    const file = new File(["contents"], "boarding-pass.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByLabelText("Ticket document*", {
      exact: false,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("boarding-pass.pdf")).toBeInTheDocument();
  });

  test("shows submit button label based on isResubmission", () => {
    const { rerender } = render(
      <TravelReimbursementForm values={baseValues()} isResubmission={false} />,
    );
    expect(
      screen.getByRole("button", { name: /Submit travel request/ }),
    ).toBeInTheDocument();

    rerender(
      <TravelReimbursementForm values={baseValues()} isResubmission={true} />,
    );
    expect(
      screen.getByRole("button", { name: /Update and resubmit/ }),
    ).toBeInTheDocument();
  });

  test("submits the form data via saveTravelRequest", async () => {
    saveTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReimbursementForm values={fullValues()} isResubmission={false} />,
    );
    attachTicket();

    submitForm();

    await waitFor(() => {
      expect(saveTravelRequestMock).toHaveBeenCalled();
    });
    const [, formData] = saveTravelRequestMock.mock.calls[0] as [
      unknown,
      FormData,
    ];
    expect(formData.get("originCity")).toBe("Barcelona");
    expect(formData.get("originCountry")).toBe("Spain");
    expect(formData.get("totalPrice")).toBe("150");
    expect(formData.get("totalCurrency")).toBe("EUR");
    expect(formData.get("transportMode")).toBe("TRAIN");
  });

  test("disables the submit button and shows submitting state while pending", async () => {
    let resolveSubmit: (value: { success: boolean }) => void = () => {};
    saveTravelRequestMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    render(
      <TravelReimbursementForm values={fullValues()} isResubmission={false} />,
    );
    attachTicket();

    submitForm();

    expect(
      await screen.findByRole("button", { name: /Submitting/ }),
    ).toBeDisabled();

    resolveSubmit({ success: true });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Submit travel request/ }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    saveTravelRequestMock.mockResolvedValueOnce({
      error: "Enter your origin city.",
    });
    render(
      <TravelReimbursementForm values={fullValues()} isResubmission={false} />,
    );
    attachTicket();

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter your origin city.",
    );
  });

  test("shows a success message returned from the action", async () => {
    saveTravelRequestMock.mockResolvedValueOnce({ success: true });
    render(
      <TravelReimbursementForm values={fullValues()} isResubmission={false} />,
    );
    attachTicket();

    submitForm();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Travel request submitted.",
    );
  });

  test("keeps what the hacker typed after an error and shows it as a toast", async () => {
    saveTravelRequestMock.mockResolvedValueOnce({
      error: "Outbound departure must be before arrival.",
    });
    render(
      <TravelReimbursementForm values={fullValues()} isResubmission={false} />,
    );
    attachTicket();
    fireEvent.change(screen.getByDisplayValue("Barcelona"), {
      target: { value: "Girona" },
    });

    submitForm();

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Outbound departure must be before arrival.");
    expect(toast.className).toContain("fixed");
    expect(screen.getByDisplayValue("Girona")).toBeInTheDocument();
  });
});
