import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const updateBudgetsMock = vi.fn();
vi.mock("@/app/organizer/budget/actions", () => ({
  updateBudgets: (...args: unknown[]) => updateBudgetsMock(...args),
}));

const { BudgetForm } = await import("@/components/budget-form");

const categories = [
  {
    id: "cat1",
    name: "Food",
    budgetCents: 10000,
    subcategories: [
      { id: "sub1", name: "Lunch", budgetCents: 5000 },
      { id: "sub2", name: "Dinner", budgetCents: 5000 },
    ],
  },
  {
    id: "cat2",
    name: "Swag",
    budgetCents: 20000,
    subcategories: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("BudgetForm", () => {
  test("renders category budgets in euros", () => {
    render(<BudgetForm categories={categories} />);

    expect(screen.getByLabelText("Food budget")).toHaveValue(100);
    expect(screen.getByLabelText("Swag budget")).toHaveValue(200);
  });

  test("renders subcategories only when present", () => {
    render(<BudgetForm categories={categories} />);

    expect(screen.getByLabelText("Lunch")).toHaveValue(50);
    expect(screen.getByLabelText("Dinner")).toHaveValue(50);
  });

  test("updates values as the user types", () => {
    render(<BudgetForm categories={categories} />);

    const input = screen.getByLabelText("Food budget");
    fireEvent.change(input, { target: { value: "150" } });

    expect(input).toHaveValue(150);
  });

  test("submits category and subcategory fields with correct names", async () => {
    updateBudgetsMock.mockResolvedValueOnce({ success: true });
    render(<BudgetForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Food budget"), {
      target: { value: "150.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save budgets" }));

    await waitFor(() => {
      expect(updateBudgetsMock).toHaveBeenCalled();
    });
    const formData = updateBudgetsMock.mock.calls[0][1] as FormData;
    expect(formData.get("category:cat1")).toBe("150.50");
    expect(formData.get("category:cat2")).toBe("200.00");
    expect(formData.get("subcategory:sub1")).toBe("50.00");
    expect(formData.get("subcategory:sub2")).toBe("50.00");
  });

  test("disables the submit button and shows saving label while pending", async () => {
    let resolveUpdate: (value: object) => void = () => {};
    updateBudgetsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(<BudgetForm categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Save budgets" }));

    expect(
      await screen.findByRole("button", { name: "Saving..." }),
    ).toBeDisabled();

    resolveUpdate({ success: true });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save budgets" }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    updateBudgetsMock.mockResolvedValueOnce({ error: "Invalid budget." });
    render(<BudgetForm categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Save budgets" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid budget.",
    );
  });

  test("shows a success message returned from the action", async () => {
    updateBudgetsMock.mockResolvedValueOnce({ success: true });
    render(<BudgetForm categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Save budgets" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Budgets updated.",
    );
  });

  test("renders no subcategory grid when the category has none", () => {
    render(<BudgetForm categories={[categories[1]]} />);

    expect(screen.queryByLabelText("Lunch")).not.toBeInTheDocument();
  });
});
