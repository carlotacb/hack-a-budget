import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueMock = vi.fn();
const categoryCreateMock = vi.fn();
const categoryUpdateMock = vi.fn();
const subcategoryCreateMock = vi.fn();
const subcategoryUpdateMock = vi.fn();
const departmentCreateMock = vi.fn();
const departmentUpdateMock = vi.fn();
const departmentFindUniqueMock = vi.fn();
const departmentFindManyMock = vi.fn();
const departmentDeleteMock = vi.fn();
const categoryDeleteMock = vi.fn();
const subcategoryDeleteMock = vi.fn();
const subcategoryCountMock = vi.fn();
const travelSettingsUpsertMock = vi.fn();
const travelRequirementCreateMock = vi.fn();
const travelRequirementUpdateMock = vi.fn();
const travelMessageTemplateCreateMock = vi.fn();
const travelMessageTemplateUpdateMock = vi.fn();
const transactionMock = vi.fn(async (...args: unknown[]) => {
  const [ops] = args;
  if (Array.isArray(ops)) return Promise.all(ops);
  return ops;
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    category: {
      create: (...args: unknown[]) => categoryCreateMock(...args),
      update: (...args: unknown[]) => categoryUpdateMock(...args),
      delete: (...args: unknown[]) => categoryDeleteMock(...args),
    },
    subcategory: {
      create: (...args: unknown[]) => subcategoryCreateMock(...args),
      update: (...args: unknown[]) => subcategoryUpdateMock(...args),
      count: (...args: unknown[]) => subcategoryCountMock(...args),
      delete: (...args: unknown[]) => subcategoryDeleteMock(...args),
    },
    department: {
      create: (...args: unknown[]) => departmentCreateMock(...args),
      update: (...args: unknown[]) => departmentUpdateMock(...args),
      findUnique: (...args: unknown[]) => departmentFindUniqueMock(...args),
      findMany: (...args: unknown[]) => departmentFindManyMock(...args),
      delete: (...args: unknown[]) => departmentDeleteMock(...args),
    },
    travelEventSettings: {
      upsert: (...args: unknown[]) => travelSettingsUpsertMock(...args),
    },
    travelFinalRequirement: {
      create: (...args: unknown[]) => travelRequirementCreateMock(...args),
      update: (...args: unknown[]) => travelRequirementUpdateMock(...args),
    },
    travelMessageTemplate: {
      create: (...args: unknown[]) => travelMessageTemplateCreateMock(...args),
      update: (...args: unknown[]) => travelMessageTemplateUpdateMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { saveMetadata } = await import(
  "@/app/organizer/settings/metadata/actions"
);

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  departmentFindUniqueMock.mockResolvedValue({
    id: "general-dep-id",
    code: "general",
  });
});

async function asAdmin() {
  authMock.mockResolvedValueOnce({ user: { id: "u1" } });
  findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
}

describe("saveMetadata", () => {
  test("errors when not an admin", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food" }),
    );

    expect(result.error).toBe("Only admins can edit metadata.");
  });

  test("errors on invalid operation data", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "x" }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
  });

  test("creates a category and revalidates paths", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food" }),
    );

    expect(categoryCreateMock).toHaveBeenCalledWith({ data: { name: "Food" } });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/settings/metadata",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/budget");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/expenses");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(result).toEqual({ success: true });
  });

  test("creates a subcategory with a department", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
        departmentId: "clabcdefghijklmnopqrstu2",
      }),
    );

    expect(subcategoryCreateMock).toHaveBeenCalledWith({
      data: {
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
        departmentId: "clabcdefghijklmnopqrstu2",
      },
    });
  });

  test("errors creating a subcategory without a department", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
    expect(subcategoryCreateMock).not.toHaveBeenCalled();
  });

  test("creates a department with a code generated from the name", async () => {
    await asAdmin();
    departmentFindManyMock.mockResolvedValueOnce([]);

    await saveMetadata(
      {},
      formData({ operation: "createDepartment", name: "Operations" }),
    );

    expect(departmentFindManyMock).toHaveBeenCalledWith({
      where: { code: { startsWith: "ope" } },
      select: { code: true },
    });
    expect(departmentCreateMock).toHaveBeenCalledWith({
      data: { code: "ope", name: "Operations" },
    });
  });

  test("appends a number to the generated code when it's already taken", async () => {
    await asAdmin();
    departmentFindManyMock.mockResolvedValueOnce([
      { code: "ope" },
      { code: "ope2" },
    ]);

    await saveMetadata(
      {},
      formData({ operation: "createDepartment", name: "Operations 2" }),
    );

    expect(departmentCreateMock).toHaveBeenCalledWith({
      data: { code: "ope3", name: "Operations 2" },
    });
  });

  test("updates travel settings with a valid start date", async () => {
    await asAdmin();
    travelSettingsUpsertMock.mockResolvedValueOnce({});

    const result = await saveMetadata(
      {},
      formData({
        operation: "updateTravelSettings",
        hackathonStartAt: "2026-03-05T10:00",
        reimbursementInstructions: "Bring receipts.",
        finalReviewInstructions: "Submit by Friday.",
      }),
    );

    expect(travelSettingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "event" },
        update: expect.objectContaining({
          hackathonStartAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  test("allows clearing the hackathon start date", async () => {
    await asAdmin();
    travelSettingsUpsertMock.mockResolvedValueOnce({});

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelSettings",
        hackathonStartAt: "",
        reimbursementInstructions: "Bring receipts.",
        finalReviewInstructions: "Submit by Friday.",
      }),
    );

    expect(travelSettingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ hackathonStartAt: null }),
      }),
    );
  });

  test("errors on an invalid hackathon start date", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "updateTravelSettings",
        hackathonStartAt: "not-a-date",
        reimbursementInstructions: "Bring receipts.",
        finalReviewInstructions: "Submit by Friday.",
      }),
    );

    expect(result.error).toBe("Enter a valid hackathon start date and time.");
    expect(travelSettingsUpsertMock).not.toHaveBeenCalled();
  });

  test("creates a travel requirement", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({ operation: "createTravelRequirement", name: "Passport" }),
    );

    expect(travelRequirementCreateMock).toHaveBeenCalledWith({
      data: { name: "Passport" },
    });
  });

  test("updates a travel requirement", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelRequirement",
        id: "clabcdefghijklmnopqrstu1",
        name: "Passport",
        active: "on",
      }),
    );

    expect(travelRequirementUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: { name: "Passport", active: true },
    });
  });

  test("creates a message template", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "createTravelMessageTemplate",
        name: "Missing ticket",
        message: "We could not verify your ticket, please resubmit.",
      }),
    );

    expect(travelMessageTemplateCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Missing ticket",
        message: "We could not verify your ticket, please resubmit.",
      },
    });
  });

  test("errors creating a message template with a name that's too short", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "createTravelMessageTemplate",
        name: "x",
        message: "We could not verify your ticket.",
      }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
    expect(travelMessageTemplateCreateMock).not.toHaveBeenCalled();
  });

  test("updates a message template", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelMessageTemplate",
        id: "clabcdefghijklmnopqrstu1",
        name: "Missing ticket",
        message: "Updated message text.",
        active: "on",
      }),
    );

    expect(travelMessageTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: {
        name: "Missing ticket",
        message: "Updated message text.",
        active: true,
      },
    });
  });

  test("deactivates a message template when active is omitted", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelMessageTemplate",
        id: "clabcdefghijklmnopqrstu1",
        name: "Missing ticket",
        message: "Updated message text.",
      }),
    );

    expect(travelMessageTemplateUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: {
        name: "Missing ticket",
        message: "Updated message text.",
        active: false,
      },
    });
  });

  test("returns a friendly error on a duplicate name/code", async () => {
    await asAdmin();
    const { Prisma } = await import("@prisma/client");
    categoryCreateMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "1",
      }),
    );

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food" }),
    );

    expect(result.error).toBe("That name or code is already in use.");
  });

  test("rethrows unexpected errors", async () => {
    await asAdmin();
    categoryCreateMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      saveMetadata({}, formData({ operation: "createCategory", name: "Food" })),
    ).rejects.toThrow("db down");
  });
});

describe("saveMetadata bulkUpdateCategories", () => {
  test("errors when not an admin", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateCategories" }),
    );

    expect(result.error).toBe("Only admins can edit metadata.");
  });

  test("errors when there is nothing to save", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateCategories" }),
    );

    expect(result.error).toBe("Nothing to save.");
  });

  test("errors on a blank category name", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "x",
      }),
    );

    expect(result.error).toBe(
      "Each category needs a name with at least 2 characters.",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test("errors when a subcategory has no department", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "subcategory:sub1:name": "Snacks",
      }),
    );

    expect(result.error).toBe("Each subcategory must have a department.");
  });

  test("updates every category and subcategory row in one transaction", async () => {
    await asAdmin();

    const fd = formData({
      operation: "bulkUpdateCategories",
      "category:cat1:name": "Food",
      "category:cat1:active": "on",
      "category:cat2:name": "Travel",
      "subcategory:sub1:name": "Snacks",
      "subcategory:sub1:departmentId": "dep1",
      "subcategory:sub1:active": "on",
    });

    const result = await saveMetadata({}, fd);

    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "cat1" },
      data: { name: "Food", active: true },
    });
    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "cat2" },
      data: { name: "Travel", active: false },
    });
    expect(subcategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "sub1" },
      data: { name: "Snacks", active: true, departmentId: "dep1" },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  test("returns a friendly error on a duplicate name", async () => {
    await asAdmin();
    const { Prisma } = await import("@prisma/client");
    transactionMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "1",
      }),
    );

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "Food",
      }),
    );

    expect(result.error).toBe("That name is already in use.");
  });
});

describe("saveMetadata bulkUpdateDepartments", () => {
  test("errors when there is nothing to save", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateDepartments" }),
    );

    expect(result.error).toBe("Nothing to save.");
  });

  test("errors on a blank department name", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:dep1:name": "x",
        "department:dep1:code": "ops",
      }),
    );

    expect(result.error).toBe(
      "Each department needs a name with at least 2 characters.",
    );
  });

  test("updates non-protected departments' name and active state", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:dep1:name": "Operations",
        "department:dep1:active": "on",
      }),
    );

    expect(departmentUpdateMock).toHaveBeenCalledWith({
      where: { id: "dep1" },
      data: { name: "Operations", active: true },
    });
    expect(result).toEqual({ success: true });
  });

  test("does not require a code or touch active for the protected general department", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce({
      id: "general-dep-id",
      code: "general",
    });

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:general-dep-id:name": "General",
      }),
    );

    expect(departmentUpdateMock).toHaveBeenCalledWith({
      where: { id: "general-dep-id" },
      data: { name: "General" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("saveMetadata deleteDepartment", () => {
  const id = "clabcdefghijklmnopqrstu1";

  test("deletes an unused department", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce({ code: "ops" });
    subcategoryCountMock.mockResolvedValueOnce(0);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(departmentDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({ success: true });
  });

  test("refuses to delete the protected General department", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce({ code: "general" });

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toBe("The General department can't be deleted.");
    expect(departmentDeleteMock).not.toHaveBeenCalled();
  });

  test("refuses when subcategories still use the department", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce({ code: "ops" });
    subcategoryCountMock.mockResolvedValueOnce(2);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toContain("still has 2 subcategories");
    expect(departmentDeleteMock).not.toHaveBeenCalled();
  });

  test("reports a department that no longer exists", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toBe("That department no longer exists.");
  });

  test("turns a foreign-key race into a friendly error", async () => {
    await asAdmin();
    departmentFindUniqueMock.mockResolvedValueOnce({ code: "ops" });
    subcategoryCountMock.mockResolvedValueOnce(0);
    const { Prisma } = await import("@prisma/client");
    departmentDeleteMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("fk", {
        code: "P2003",
        clientVersion: "1",
      }),
    );

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toBe("That item is still in use.");
  });
});

describe("saveMetadata deleteCategory / deleteSubcategory", () => {
  const id = "clabcdefghijklmnopqrstu1";

  test("deletes a category", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(categoryDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/settings/metadata",
    );
    expect(result).toEqual({ success: true });
  });

  test("deletes a subcategory", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteSubcategory", id }),
    );

    expect(subcategoryDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({ success: true });
  });

  test("rejects an invalid id", async () => {
    await asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id: "nope" }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("only admins can delete", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(result.error).toBe("Only admins can edit metadata.");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("turns a missing record into a friendly error", async () => {
    await asAdmin();
    const { Prisma } = await import("@prisma/client");
    subcategoryDeleteMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("gone", {
        code: "P2025",
        clientVersion: "1",
      }),
    );

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteSubcategory", id }),
    );

    expect(result.error).toBe("That item no longer exists.");
  });
});
