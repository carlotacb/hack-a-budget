import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const addExpenseMock = vi.fn();
vi.mock("@/app/organizer/expenses/actions", () => ({
  addExpense: (...args: unknown[]) => addExpenseMock(...args),
}));

const { ExpenseForm } = await import("@/components/expense-form");

const categories = [
  {
    id: "cat1",
    name: "Food",
    subcategories: [{ id: "sub1", name: "Lunch" }],
  },
  {
    id: "cat2",
    name: "Swag",
    subcategories: [],
  },
];

const departments = [
  { id: "dep1", name: "Logistics" },
  { id: "dep2", name: "Marketing" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ExpenseForm", () => {
  test("renders category and department options", () => {
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    expect(
      screen.getByRole("option", { name: "Food" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Swag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Logistics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Marketing" }),
    ).toBeInTheDocument();
  });

  test("shows subcategories for the initially selected category", () => {
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    expect(screen.getByRole("option", { name: "Lunch" })).toBeInTheDocument();
  });

  test("updates subcategory options when category changes", () => {
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat2" },
    });

    expect(
      screen.queryByRole("option", { name: "Lunch" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "No subcategory" }),
    ).toBeInTheDocument();
  });

  test("shows the selected ticket file name", () => {
    const { container } = render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    expect(
      screen.getByText("Upload PDF or image (max 5 MB)"),
    ).toBeInTheDocument();

    const file = new File(["contents"], "receipt.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector(
      'input[name="ticket"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
  });

  test("submits form data with entered values", async () => {
    addExpenseMock.mockResolvedValueOnce({ success: true });
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dep1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    await waitFor(() => {
      expect(addExpenseMock).toHaveBeenCalled();
    });
    const formData = addExpenseMock.mock.calls[0][1] as FormData;
    expect(formData.get("description")).toBe("Venue deposit");
    expect(formData.get("categoryId")).toBe("cat1");
    expect(formData.get("amount")).toBe("500");
    expect(formData.get("vendor")).toBe("Acme Venues");
    expect(formData.get("departmentId")).toBe("dep1");
  });

  test("disables the submit button and shows the adding label while pending", async () => {
    let resolveAdd: (value: object) => void = () => {};
    addExpenseMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dep1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    expect(
      await screen.findByRole("button", { name: /Adding.../ }),
    ).toBeDisabled();

    resolveAdd({ success: true });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add expense/ }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    addExpenseMock.mockResolvedValueOnce({ error: "Amount is required." });
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dep1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Amount is required.",
    );
  });

  test("shows a success message returned from the action", async () => {
    addExpenseMock.mockResolvedValueOnce({ success: true });
    render(
      <ExpenseForm categories={categories} departments={departments} />,
    );

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dep1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Expense added successfully.",
    );
  });
});
