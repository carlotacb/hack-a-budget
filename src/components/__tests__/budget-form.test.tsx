import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const updateBudgetAmountsMock = vi.fn();
vi.mock("@/app/organizer/budget/actions", () => ({
  updateBudgetAmounts: (...args: unknown[]) => updateBudgetAmountsMock(...args),
}));

const { BudgetPlanForm } = await import("@/components/budget-form");

const categories = [
  {
    id: "cat1",
    name: "Food",
    budgetCents: 10000,
    isUnexpected: false,
    subcategories: [
      { id: "sub1", name: "Lunch", budgetCents: 5000 },
      { id: "sub2", name: "Dinner", budgetCents: 5000 },
    ],
  },
  {
    id: "cat2",
    name: "Swag",
    budgetCents: 20000,
    isUnexpected: false,
    subcategories: [],
  },
  {
    id: "cat3",
    name: "Unexpected expenses",
    budgetCents: 1000,
    isUnexpected: true,
    subcategories: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("BudgetPlanForm", () => {
  test("renders the category total as calculated from subcategories", () => {
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    expect(screen.getByLabelText("Food budget")).toHaveTextContent("$100.00");
  });

  test("recalculates the category total when a subcategory changes", () => {
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    fireEvent.change(screen.getByLabelText("Lunch"), {
      target: { value: "100" },
    });

    expect(screen.getByLabelText("Food budget")).toHaveTextContent("$150.00");
  });

  test("renders a directly editable input for categories without subcategories", () => {
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    expect(screen.getByLabelText("Swag budget")).toHaveValue(200);
  });

  test("renders the unexpected-expenses category as directly editable", () => {
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    expect(screen.getByLabelText("Unexpected expenses budget")).toHaveValue(10);
  });

  test("submits subcategory and direct category fields with correct names", async () => {
    updateBudgetAmountsMock.mockResolvedValueOnce({ success: true });
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    fireEvent.change(screen.getByLabelText("Lunch"), {
      target: { value: "60.00" },
    });
    fireEvent.change(screen.getByLabelText("Swag budget"), {
      target: { value: "150.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save budget" }));

    await waitFor(() => {
      expect(updateBudgetAmountsMock).toHaveBeenCalled();
    });
    const formData = updateBudgetAmountsMock.mock.calls[0][1] as FormData;
    expect(formData.get("budgetId")).toBe("budget1");
    expect(formData.get("budgetSubcategory:sub1")).toBe("60.00");
    expect(formData.get("budgetSubcategory:sub2")).toBe("50.00");
    expect(formData.get("budgetCategory:cat2")).toBe("150.50");
    expect(formData.get("budgetCategory:cat1")).toBeNull();
  });

  test("shows an error message returned from the action", async () => {
    updateBudgetAmountsMock.mockResolvedValueOnce({ error: "Invalid budget." });
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Save budget" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid budget.",
    );
  });

  test("shows a success message returned from the action", async () => {
    updateBudgetAmountsMock.mockResolvedValueOnce({ success: true });
    render(<BudgetPlanForm budgetId="budget1" categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Save budget" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Budget updated.",
    );
  });

  test("shows already spent amounts next to categories and subcategories", () => {
    const categoriesWithSpend = [
      {
        id: "cat2",
        name: "Swag",
        budgetCents: 20000,
        isUnexpected: false,
        spentCents: 1234,
        subcategories: [],
      },
      {
        id: "cat1",
        name: "Food",
        budgetCents: 10000,
        isUnexpected: false,
        subcategories: [
          { id: "sub1", name: "Lunch", budgetCents: 5000, spentCents: 2500 },
        ],
      },
    ];
    render(
      <BudgetPlanForm budgetId="budget1" categories={categoriesWithSpend} />,
    );

    expect(screen.getByText(/\$12\.34 already spent/)).toBeInTheDocument();
    expect(screen.getByText(/\$25\.00 already/)).toBeInTheDocument();
  });
});
