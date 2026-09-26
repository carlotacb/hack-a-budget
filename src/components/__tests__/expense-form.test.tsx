import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const addExpenseMock = vi.fn();
const updateExpenseMock = vi.fn();
vi.mock("@/app/organizer/expenses/actions", () => ({
  addExpense: (...args: unknown[]) => addExpenseMock(...args),
  updateExpense: (...args: unknown[]) => updateExpenseMock(...args),
}));

const { ExpenseForm } = await import("@/components/expense-form");

const categories = [
  {
    id: "cat1",
    name: "Food",
    departmentName: "General",
    subcategories: [
      { id: "sub1", name: "Lunch", departmentName: "Logistics" },
      { id: "sub2", name: "Dinner", departmentName: "Marketing" },
    ],
  },
  {
    id: "cat2",
    name: "Unexpected expenses",
    departmentName: "General",
    subcategories: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ExpenseForm", () => {
  test("renders category options", () => {
    render(<ExpenseForm categories={categories} />);

    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Unexpected expenses" }),
    ).toBeInTheDocument();
  });

  test("shows subcategories and derived department for the initially selected category", () => {
    render(<ExpenseForm categories={categories} />);

    expect(screen.getByRole("option", { name: "Lunch" })).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
  });

  test("updates the department tag when a different subcategory is chosen", () => {
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Subcategory"), {
      target: { value: "sub2" },
    });

    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });

  test("hides the subcategory field and shows the fallback department for a category without subcategories", () => {
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat2" },
    });

    expect(
      screen.queryByLabelText("Subcategory"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  test("shows the selected ticket file name", () => {
    const { container } = render(<ExpenseForm categories={categories} />);

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

  test("submits form data with entered values, deriving the department server-side", async () => {
    addExpenseMock.mockResolvedValueOnce({ success: true });
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount (EUR)"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    await waitFor(() => {
      expect(addExpenseMock).toHaveBeenCalled();
    });
    const formData = addExpenseMock.mock.calls[0][1] as FormData;
    expect(formData.get("description")).toBe("Venue deposit");
    expect(formData.get("categoryId")).toBe("cat1");
    expect(formData.get("subcategoryId")).toBe("sub1");
    expect(formData.get("amount")).toBe("500");
    expect(formData.get("vendor")).toBe("Acme Venues");
    expect(formData.get("departmentId")).toBeNull();
  });

  test("disables the submit button and shows the adding label while pending", async () => {
    let resolveAdd: (value: object) => void = () => {};
    addExpenseMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount (EUR)"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
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
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount (EUR)"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Amount is required.",
    );
  });

  test("shows a success message returned from the action", async () => {
    addExpenseMock.mockResolvedValueOnce({ success: true });
    render(<ExpenseForm categories={categories} />);

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Venue deposit" },
    });
    fireEvent.change(screen.getByLabelText("Amount (EUR)"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Vendor"), {
      target: { value: "Acme Venues" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add expense/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Expense added successfully.",
    );
  });

  test("prefills values and calls updateExpense in edit mode", async () => {
    updateExpenseMock.mockResolvedValueOnce({ success: true });
    render(
      <ExpenseForm
        categories={categories}
        expense={{
          id: "exp1",
          description: "Old description",
          categoryId: "cat1",
          subcategoryId: "sub2",
          amountCents: 12345,
          incurredAt: "2024-03-05T00:00:00.000Z",
          vendor: "Old vendor",
        }}
      />,
    );

    expect(screen.getByDisplayValue("Old description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123.45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("05/03/2024")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Old vendor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => {
      expect(updateExpenseMock).toHaveBeenCalled();
    });
    const formData = updateExpenseMock.mock.calls[0][1] as FormData;
    expect(formData.get("id")).toBe("exp1");
  });
});
