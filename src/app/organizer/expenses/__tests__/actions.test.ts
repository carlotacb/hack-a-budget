import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueMock = vi.fn();
const categoryFindFirstMock = vi.fn();
const departmentFindFirstMock = vi.fn();
const expenseCreateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    category: {
      findFirst: (...args: unknown[]) => categoryFindFirstMock(...args),
    },
    department: {
      findFirst: (...args: unknown[]) => departmentFindFirstMock(...args),
    },
    expense: { create: (...args: unknown[]) => expenseCreateMock(...args) },
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

const { addExpense } = await import("@/app/organizer/expenses/actions");

function formData(
  fields: Record<string, string>,
  ticket?: File,
) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  if (ticket) fd.set("ticket", ticket);
  return fd;
}

const validFields = {
  description: "Coffee for volunteers",
  categoryId: "clabcdefghijklmnopqrstu1",
  departmentId: "clabcdefghijklmnopqrstu2",
  amount: "12.5",
  incurredAt: "05/03/2026",
  vendor: "Starbucks",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addExpense", () => {
  test("errors when not authorized", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe("You are not authorized to add expenses.");
  });

  test("errors on invalid fields", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await addExpense(
      {},
      formData({ ...validFields, description: "x" }),
    );

    expect(result.error).toBe("Add a short description.");
  });

  test("errors on an invalid date", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await addExpense(
      {},
      formData({ ...validFields, incurredAt: "31/02/2026" }),
    );

    expect(result.error).toBe("Enter a valid date in DD/MM/YYYY format.");
  });

  test("errors when the category is unavailable", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce(null);
    departmentFindFirstMock.mockResolvedValueOnce({ id: "d1" });

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe("The selected category is no longer available.");
  });

  test("errors when the department is unavailable", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });
    departmentFindFirstMock.mockResolvedValueOnce(null);

    const result = await addExpense({}, formData(validFields));

    expect(result.error).toBe(
      "The selected department is no longer available.",
    );
  });

  test("errors when the subcategory does not belong to the category", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });
    departmentFindFirstMock.mockResolvedValueOnce({ id: "d1" });

    const result = await addExpense(
      {},
      formData({ ...validFields, subcategoryId: "clabcdefghijklmnopqrstu3" }),
    );

    expect(result.error).toBe(
      "The selected subcategory does not belong to this category.",
    );
  });

  test("creates the expense on success without a ticket", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });
    departmentFindFirstMock.mockResolvedValueOnce({ id: "d1" });
    expenseCreateMock.mockResolvedValueOnce({ id: "e1" });

    const result = await addExpense({}, formData(validFields));

    expect(expenseCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: "Coffee for volunteers",
        categoryLabel: "Food",
        categoryId: "c1",
        subcategoryId: null,
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
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });
    departmentFindFirstMock.mockResolvedValueOnce({ id: "d1" });

    const ticket = new File(["data"], "ticket.txt", { type: "text/plain" });
    const result = await addExpense({}, formData(validFields, ticket));

    expect(result.error).toBe("Ticket must be a PDF, JPG, PNG, or WebP file.");
    expect(expenseCreateMock).not.toHaveBeenCalled();
  });

  test("saves a valid ticket and cleans it up if creation fails", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    categoryFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      name: "Food",
      subcategories: [],
    });
    departmentFindFirstMock.mockResolvedValueOnce({ id: "d1" });
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
