import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueUserMock = vi.fn();
const categoryFindFirstMock = vi.fn();
const budgetFindFirstMock = vi.fn();
const departmentUpsertMock = vi.fn();
const expenseCreateMock = vi.fn();
const expenseFindUniqueMock = vi.fn();
const expenseUpdateMock = vi.fn();
const expenseDeleteMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueUserMock(...args) },
    category: {
      findFirst: (...args: unknown[]) => categoryFindFirstMock(...args),
    },
    budget: {
      findFirst: (...args: unknown[]) => budgetFindFirstMock(...args),
    },
    department: {
      upsert: (...args: unknown[]) => departmentUpsertMock(...args),
    },
    expense: {
      create: (...args: unknown[]) => expenseCreateMock(...args),
      findUnique: (...args: unknown[]) => expenseFindUniqueMock(...args),
      update: (...args: unknown[]) => expenseUpdateMock(...args),
      delete: (...args: unknown[]) => expenseDeleteMock(...args),
    },
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const putMock = vi.fn(async (..._args: unknown[]) => ({
  url: "https://blob.vercel-storage.com/tickets/test.pdf",
}));
const delMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}));

const { addExpense, updateExpense, deleteExpense } = await import(
  "@/app/organizer/expenses/actions"
);

function formData(fields: Record<string, string>, ticket?: File) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  if (ticket) fd.set("ticket", ticket);
  return fd;
}

const validFields = {
  description: "Coffee for volunteers",
  categoryId: "clabcdefghijklmnopqrstu1",
  subcategoryId: "clabcdefghijklmnopqrstu3",
  amount: "12.5",
  incurredAt: "05/03/2026",
  vendor: "Starbucks",
};

function mockAdmin() {
  authMock.mockResolvedValueOnce({ user: { id: "u1" } });
  findUniqueUserMock.mockResolvedValueOnce({ role: "ADMIN" });
}

function mockCategoryWithSubcategory() {
  categoryFindFirstMock.mockResolvedValueOnce({
    id: "c1",
    name: "Food",
    subcategories: [{ id: "clabcdefghijklmnopqrstu3", departmentId: "d1" }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  budgetFindFirstMock.mockResolvedValue({ id: "b1" });
});

describe("addExpense", () => {
  test("errors when not authorized", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe("You are not authorized to add expenses.");
  });

  test("errors when there is no active budget", async () => {
    mockAdmin();
    budgetFindFirstMock.mockResolvedValueOnce(null);

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe("Activate a budget before adding expenses.");
  });

  test("errors on invalid fields", async () => {
    mockAdmin();

    const result = await addExpense(
      {},
      formData({ ...validFields, description: "x" }),
    );

    expect(result.error).toBe("Add a short description.");
  });

  test("errors on an invalid date", async () => {
    mockAdmin();

    const result = await addExpense(
      {},
      formData({ ...validFields, incurredAt: "31/02/2026" }),
    );

    expect(result.error).toBe("Enter a valid date in DD/MM/YYYY format.");
  });

  test("errors when the category is unavailable", async () => {
    mockAdmin();
    categoryFindFirstMock.mockResolvedValueOnce(null);

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe("The selected category is no longer available.");
  });

  test("errors when the subcategory does not belong to the category", async () => {
    mockAdmin();
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe(
      "The selected subcategory does not belong to this category.",
    );
  });

  test("derives the department from the General department for categories without subcategories", async () => {
    mockAdmin();
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c2",
      name: "Unexpected expenses",
      subcategories: [],
    });
    departmentUpsertMock.mockResolvedValueOnce({ id: "general1", name: "General" });
    expenseCreateMock.mockResolvedValueOnce({ id: "e1" });

    const { subcategoryId, ...fieldsWithoutSubcategory } = validFields;
    void subcategoryId;
    const result = await addExpense({}, formData(fieldsWithoutSubcategory));

    expect(departmentUpsertMock).toHaveBeenCalled();
    expect(expenseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: "c2",
        subcategoryId: null,
        departmentId: "general1",
      }),
    });
    expect(result).toEqual({ success: true });
  });

  test("creates the expense with the subcategory's department on success", async () => {
    mockAdmin();
    mockCategoryWithSubcategory();
    expenseCreateMock.mockResolvedValueOnce({ id: "e1" });

    const result = await addExpense({}, formData(validFields));

    expect(expenseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: "Coffee for volunteers",
        categoryLabel: "Food",
        categoryId: "c1",
        subcategoryId: "clabcdefghijklmnopqrstu3",
        departmentId: "d1",
        amountCents: 1250,
        vendor: "Starbucks",
        ticketPath: null,
        organizerId: "u1",
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/expenses");
    expect(result).toEqual({ success: true });
  });

  test("rejects a ticket with an unsupported file type", async () => {
    mockAdmin();
    mockCategoryWithSubcategory();

    const ticket = new File(["data"], "ticket.txt", { type: "text/plain" });
    const result = await addExpense({}, formData(validFields, ticket));

    expect(result.error).toBe("Ticket must be a PDF, JPG, PNG, or WebP file.");
    expect(expenseCreateMock).not.toHaveBeenCalled();
  });

  test("saves a valid ticket and cleans it up if creation fails", async () => {
    mockAdmin();
    mockCategoryWithSubcategory();
    expenseCreateMock.mockRejectedValueOnce(new Error("db error"));

    const ticket = new File(["data"], "ticket.pdf", {
      type: "application/pdf",
    });
    ticket.arrayBuffer = async () => new TextEncoder().encode("data").buffer;

    await expect(addExpense({}, formData(validFields, ticket))).rejects.toThrow(
      "db error",
    );

    expect(putMock).toHaveBeenCalled();
    expect(delMock).toHaveBeenCalled();
  });
});

describe("updateExpense", () => {
  test("errors when not authorized", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await updateExpense({}, formData({ ...validFields, id: "e1" }));

    expect(result.error).toBe("You are not authorized to edit expenses.");
  });

  test("errors when the expense no longer exists", async () => {
    mockAdmin();
    expenseFindUniqueMock.mockResolvedValueOnce(null);

    const result = await updateExpense({}, formData({ ...validFields, id: "e1" }));

    expect(result.error).toBe("That expense no longer exists.");
  });

  test("updates the expense and keeps the existing ticket when none is uploaded", async () => {
    mockAdmin();
    expenseFindUniqueMock.mockResolvedValueOnce({
      id: "e1",
      ticketPath: "https://blob/old.pdf",
    });
    mockCategoryWithSubcategory();
    expenseUpdateMock.mockResolvedValueOnce({ id: "e1" });

    const result = await updateExpense({}, formData({ ...validFields, id: "e1" }));

    expect(expenseUpdateMock).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ ticketPath: "https://blob/old.pdf" }),
    });
    expect(delMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("replaces the ticket and deletes the previous one", async () => {
    mockAdmin();
    expenseFindUniqueMock.mockResolvedValueOnce({
      id: "e1",
      ticketPath: "https://blob/old.pdf",
    });
    mockCategoryWithSubcategory();
    expenseUpdateMock.mockResolvedValueOnce({ id: "e1" });

    const ticket = new File(["data"], "ticket.pdf", {
      type: "application/pdf",
    });
    ticket.arrayBuffer = async () => new TextEncoder().encode("data").buffer;

    const result = await updateExpense(
      {},
      formData({ ...validFields, id: "e1" }, ticket),
    );

    expect(putMock).toHaveBeenCalled();
    expect(delMock).toHaveBeenCalledWith("https://blob/old.pdf");
    expect(result).toEqual({ success: true });
  });
});

describe("deleteExpense", () => {
  test("errors when not authorized", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await deleteExpense({}, formData({ id: "e1" }));

    expect(result.error).toBe("You are not authorized to delete expenses.");
  });

  test("errors when the expense no longer exists", async () => {
    mockAdmin();
    expenseFindUniqueMock.mockResolvedValueOnce(null);

    const result = await deleteExpense({}, formData({ id: "e1" }));

    expect(result.error).toBe("That expense no longer exists.");
  });

  test("deletes the expense and its ticket", async () => {
    mockAdmin();
    expenseFindUniqueMock.mockResolvedValueOnce({
      id: "e1",
      ticketPath: "https://blob/old.pdf",
    });

    const result = await deleteExpense({}, formData({ id: "e1" }));

    expect(expenseDeleteMock).toHaveBeenCalledWith({ where: { id: "e1" } });
    expect(delMock).toHaveBeenCalledWith("https://blob/old.pdf");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/expenses");
    expect(result).toEqual({ success: true });
  });
});
