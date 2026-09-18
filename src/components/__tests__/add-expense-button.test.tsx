import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const addExpenseMock = vi.fn();
vi.mock("@/app/organizer/expenses/actions", () => ({
  addExpense: (...args: unknown[]) => addExpenseMock(...args),
}));

const { AddExpenseButton } = await import("@/components/add-expense-button");

const categories = [
  { id: "cat1", name: "Food", subcategories: [] },
];
const departments = [{ id: "dep1", name: "Logistics" }];

describe("AddExpenseButton", () => {
  test("renders the trigger button and no dialog initially", () => {
    render(<AddExpenseButton categories={categories} departments={departments} />);

    expect(
      screen.getByRole("button", { name: "Add expense" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens the dialog with the expense form when clicked", () => {
    render(<AddExpenseButton categories={categories} departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Add expense" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
  });

  test("closes the dialog when the close button is clicked", () => {
    render(<AddExpenseButton categories={categories} departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Close add expense dialog" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
