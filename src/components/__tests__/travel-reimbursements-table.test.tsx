import { describe, expect, test } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TravelReimbursementsTable } from "@/components/travel-reimbursements-table";

const statuses = ["PENDING_REVIEW", "APPROVED"] as const;
const statusLabels = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
} as never;

const reimbursements = [
  {
    id: "r1",
    hackerName: "Raquel Alvarez",
    hackerEmail: "raquel.alvarez@hackupc.com",
    originCity: "New York",
    originCountry: "United States",
    amount: "€200.00",
    submitted: "17 Sept 2026, 12:25",
    statusLabel: "Final approved",
    statusClass: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "r2",
    hackerName: "Demo Hacker",
    hackerEmail: "hacker@example.com",
    originCity: "Berlin",
    originCountry: "Germany",
    amount: "$50.00",
    submitted: "17 Sept 2026, 12:20",
    statusLabel: "Pending review",
    statusClass: "bg-amber-100 text-amber-800",
  },
];

describe("TravelReimbursementsTable", () => {
  test("renders every reimbursement when the search field is empty", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.getByText("Demo Hacker")).toBeInTheDocument();
  });

  test("filters as you type by country", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(
        "Search travel reimbursements by name, email, city, or country",
      ),
      { target: { value: "germany" } },
    );

    expect(screen.getByText("Demo Hacker")).toBeInTheDocument();
    expect(screen.queryByText("Raquel Alvarez")).not.toBeInTheDocument();
  });

  test("filters as you type by city", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(
        "Search travel reimbursements by name, email, city, or country",
      ),
      { target: { value: "new york" } },
    );

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Hacker")).not.toBeInTheDocument();
  });

  test("filters as you type by email, case-insensitively", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(
        "Search travel reimbursements by name, email, city, or country",
      ),
      { target: { value: "HACKUPC" } },
    );

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Hacker")).not.toBeInTheDocument();
  });

  test("filters as you type by name", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(
        "Search travel reimbursements by name, email, city, or country",
      ),
      { target: { value: "raquel" } },
    );

    expect(screen.getByText("Raquel Alvarez")).toBeInTheDocument();
    expect(screen.queryByText("Demo Hacker")).not.toBeInTheDocument();
  });

  test("shows an empty state message with the query when nothing matches", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(
        "Search travel reimbursements by name, email, city, or country",
      ),
      { target: { value: "nobody-matches-this" } },
    );

    expect(
      screen.getByText('No reimbursements match "nobody-matches-this".'),
    ).toBeInTheDocument();
  });

  test("shows the status-only empty state when there are no reimbursements at all", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={[]}
        statuses={[...statuses]}
        statusLabels={statusLabels}
      />,
    );

    expect(
      screen.getByText("No reimbursements match the selected status."),
    ).toBeInTheDocument();
  });

  test("pre-selects the status filter option", () => {
    render(
      <TravelReimbursementsTable
        reimbursements={reimbursements}
        statuses={[...statuses]}
        statusLabels={statusLabels}
        selectedStatus="PENDING_REVIEW"
      />,
    );

    expect(screen.getByRole("combobox")).toHaveValue("PENDING_REVIEW");
    expect(screen.getByRole("link", { name: "Clear" })).toBeInTheDocument();
  });
});
