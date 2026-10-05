import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const getOrganizerIdMock = vi.fn();
vi.mock("@/lib/organizer", () => ({
  getOrganizerId: (...args: unknown[]) => getOrganizerIdMock(...args),
}));

const syncNewCategoryMock = vi.fn();
const syncNewSubcategoryMock = vi.fn();
vi.mock("@/app/organizer/budget/actions", () => ({
  syncNewCategoryToActiveBudget: (...args: unknown[]) =>
    syncNewCategoryMock(...args),
  syncNewSubcategoryToActiveBudget: (...args: unknown[]) =>
    syncNewSubcategoryMock(...args),
}));

const hackathonFindUniqueMock = vi.fn();
const hackathonUpdateMock = vi.fn();
const categoryCreateMock = vi.fn();
const categoryFindFirstMock = vi.fn();
const categoryDeleteMock = vi.fn();
const categoryCountMock = vi.fn();
const categoryUpdateManyMock = vi.fn();
const subcategoryCreateMock = vi.fn();
const subcategoryFindFirstMock = vi.fn();
const subcategoryDeleteMock = vi.fn();
const subcategoryUpdateManyMock = vi.fn();
const departmentCreateMock = vi.fn();
const departmentFindFirstMock = vi.fn();
const departmentFindManyMock = vi.fn();
const departmentCountMock = vi.fn();
const departmentDeleteMock = vi.fn();
const departmentUpdateManyMock = vi.fn();
const expenseCountMock = vi.fn();
const travelSettingsUpsertMock = vi.fn();
const travelRequirementCreateMock = vi.fn();
const travelRequirementUpdateManyMock = vi.fn();
const travelMessageTemplateCreateMock = vi.fn();
const travelMessageTemplateUpdateManyMock = vi.fn();
const budgetFindFirstMock = vi.fn();
const budgetCategoryUpdateManyMock = vi.fn();
const budgetSubcategoryUpdateManyMock = vi.fn();
const transactionMock = vi.fn(async (...args: unknown[]) => {
  const [ops] = args;
  if (Array.isArray(ops)) return Promise.all(ops);
  return ops;
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    hackathon: {
      findUnique: (...args: unknown[]) => hackathonFindUniqueMock(...args),
      update: (...args: unknown[]) => hackathonUpdateMock(...args),
    },
    category: {
      create: (...args: unknown[]) => categoryCreateMock(...args),
      findFirst: (...args: unknown[]) => categoryFindFirstMock(...args),
      delete: (...args: unknown[]) => categoryDeleteMock(...args),
      count: (...args: unknown[]) => categoryCountMock(...args),
      updateMany: (...args: unknown[]) => categoryUpdateManyMock(...args),
    },
    subcategory: {
      create: (...args: unknown[]) => subcategoryCreateMock(...args),
      findFirst: (...args: unknown[]) => subcategoryFindFirstMock(...args),
      delete: (...args: unknown[]) => subcategoryDeleteMock(...args),
      updateMany: (...args: unknown[]) => subcategoryUpdateManyMock(...args),
    },
    department: {
      create: (...args: unknown[]) => departmentCreateMock(...args),
      findFirst: (...args: unknown[]) => departmentFindFirstMock(...args),
      findMany: (...args: unknown[]) => departmentFindManyMock(...args),
      count: (...args: unknown[]) => departmentCountMock(...args),
      delete: (...args: unknown[]) => departmentDeleteMock(...args),
      updateMany: (...args: unknown[]) => departmentUpdateManyMock(...args),
    },
    expense: {
      count: (...args: unknown[]) => expenseCountMock(...args),
    },
    travelEventSettings: {
      upsert: (...args: unknown[]) => travelSettingsUpsertMock(...args),
    },
    travelFinalRequirement: {
      create: (...args: unknown[]) => travelRequirementCreateMock(...args),
      updateMany: (...args: unknown[]) =>
        travelRequirementUpdateManyMock(...args),
    },
    travelMessageTemplate: {
      create: (...args: unknown[]) => travelMessageTemplateCreateMock(...args),
      updateMany: (...args: unknown[]) =>
        travelMessageTemplateUpdateManyMock(...args),
    },
    budget: {
      findFirst: (...args: unknown[]) => budgetFindFirstMock(...args),
    },
    budgetCategory: {
      updateMany: (...args: unknown[]) => budgetCategoryUpdateManyMock(...args),
    },
    budgetSubcategory: {
      updateMany: (...args: unknown[]) =>
        budgetSubcategoryUpdateManyMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { saveMetadata } = await import("@/app/organizer/settings/actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const HACKATHON_ID = "h1";
const departmentId = "clabcdefghijklmnopqrstu2";

beforeEach(() => {
  vi.clearAllMocks();
  hackathonFindUniqueMock.mockResolvedValue({
    travelReimbursementEnabled: true,
  });
  categoryFindFirstMock.mockResolvedValue({ id: "cat-generic-id", name: "Food" });
  subcategoryFindFirstMock.mockResolvedValue({ id: "sub-generic-id" });
  departmentFindFirstMock.mockResolvedValue({ id: departmentId, code: "ops" });
  departmentFindManyMock.mockResolvedValue([]);
  departmentCountMock.mockResolvedValue(0);
  expenseCountMock.mockResolvedValue(0);
  categoryCountMock.mockResolvedValue(0);
  budgetFindFirstMock.mockResolvedValue(null);
});

function asAdmin() {
  getOrganizerIdMock.mockResolvedValueOnce({
    userId: "u1",
    hackathonId: HACKATHON_ID,
  });
}

describe("saveMetadata", () => {
  test("errors when not an admin", async () => {
    getOrganizerIdMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food", departmentId }),
    );

    expect(getOrganizerIdMock).toHaveBeenCalledWith(["ADMIN"]);
    expect(result.error).toBe("Only admins can edit metadata.");
  });

  test("errors on invalid operation data", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "x", departmentId }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
  });

  test("creates a category in the hackathon, syncs the budget and revalidates paths", async () => {
    asAdmin();
    categoryCreateMock.mockResolvedValueOnce({ id: "cat1", name: "Food" });

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food", departmentId }),
    );

    expect(departmentFindFirstMock).toHaveBeenCalledWith({
      where: { id: departmentId, hackathonId: HACKATHON_ID },
      select: { id: true },
    });
    expect(categoryCreateMock).toHaveBeenCalledWith({
      data: { hackathonId: HACKATHON_ID, name: "Food", departmentId },
    });
    expect(syncNewCategoryMock).toHaveBeenCalledWith(
      HACKATHON_ID,
      "cat1",
      "Food",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/settings");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/budget");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/expenses");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(result).toEqual({ success: true });
  });

  test("errors creating a category without a department", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food" }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
    expect(categoryCreateMock).not.toHaveBeenCalled();
  });

  test("errors creating a category for a department outside the hackathon", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food", departmentId }),
    );

    expect(result.error).toBe("That department no longer exists.");
    expect(categoryCreateMock).not.toHaveBeenCalled();
  });

  test("creates a subcategory and syncs the budget", async () => {
    asAdmin();
    subcategoryCreateMock.mockResolvedValueOnce({
      id: "sub1",
      name: "Snacks",
    });

    const result = await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(categoryFindFirstMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1", hackathonId: HACKATHON_ID },
      select: { name: true },
    });
    expect(subcategoryCreateMock).toHaveBeenCalledWith({
      data: { categoryId: "clabcdefghijklmnopqrstu1", name: "Snacks" },
    });
    expect(syncNewSubcategoryMock).toHaveBeenCalledWith(
      HACKATHON_ID,
      "sub1",
      "clabcdefghijklmnopqrstu1",
      "Snacks",
    );
    expect(result).toEqual({ success: true });
  });

  test("errors creating a subcategory under a category outside the hackathon", async () => {
    asAdmin();
    categoryFindFirstMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(result.error).toBe("That category no longer exists.");
    expect(subcategoryCreateMock).not.toHaveBeenCalled();
  });

  test("creates a department with a code generated from the name", async () => {
    asAdmin();
    departmentFindManyMock.mockResolvedValueOnce([]);
    departmentCountMock.mockResolvedValueOnce(2);

    await saveMetadata(
      {},
      formData({ operation: "createDepartment", name: "Operations" }),
    );

    expect(departmentFindManyMock).toHaveBeenCalledWith({
      where: { hackathonId: HACKATHON_ID, code: { startsWith: "ope" } },
      select: { code: true },
    });
    expect(departmentCreateMock).toHaveBeenCalledWith({
      data: {
        hackathonId: HACKATHON_ID,
        code: "ope",
        name: "Operations",
        color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
      },
    });
  });

  test("appends a number to the generated code when it's already taken", async () => {
    asAdmin();
    departmentFindManyMock.mockResolvedValueOnce([
      { code: "ope" },
      { code: "ope2" },
    ]);

    await saveMetadata(
      {},
      formData({ operation: "createDepartment", name: "Operations 2" }),
    );

    expect(departmentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: "ope3", name: "Operations 2" }),
    });
  });

  test("toggles the travel reimbursement feature", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "updateHackathonSettings",
        travelReimbursementEnabled: "on",
      }),
    );

    expect(hackathonUpdateMock).toHaveBeenCalledWith({
      where: { id: HACKATHON_ID },
      data: { travelReimbursementEnabled: true },
    });
    expect(result).toEqual({ success: true });
  });

  test("refuses travel edits while the travel feature is disabled", async () => {
    asAdmin();
    hackathonFindUniqueMock.mockResolvedValueOnce({
      travelReimbursementEnabled: false,
    });

    const result = await saveMetadata(
      {},
      formData({ operation: "createTravelRequirement", name: "Passport" }),
    );

    expect(result.error).toBe(
      "Enable the travel reimbursement flow in Features before editing travel settings.",
    );
    expect(travelRequirementCreateMock).not.toHaveBeenCalled();
  });

  test("updates travel settings with a valid start date", async () => {
    asAdmin();
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
        where: { hackathonId: HACKATHON_ID },
        update: expect.objectContaining({
          hackathonStartAt: expect.any(Date),
        }),
        create: expect.objectContaining({ hackathonId: HACKATHON_ID }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  test("allows clearing the hackathon start date", async () => {
    asAdmin();
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
    asAdmin();

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
    asAdmin();

    await saveMetadata(
      {},
      formData({ operation: "createTravelRequirement", name: "Passport" }),
    );

    expect(travelRequirementCreateMock).toHaveBeenCalledWith({
      data: { hackathonId: HACKATHON_ID, name: "Passport" },
    });
  });

  test("updates a travel requirement", async () => {
    asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelRequirement",
        id: "clabcdefghijklmnopqrstu1",
        name: "Passport",
        active: "on",
      }),
    );

    expect(travelRequirementUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1", hackathonId: HACKATHON_ID },
      data: { name: "Passport", active: true },
    });
  });

  test("creates a message template", async () => {
    asAdmin();

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
        hackathonId: HACKATHON_ID,
        name: "Missing ticket",
        message: "We could not verify your ticket, please resubmit.",
      },
    });
  });

  test("errors creating a message template with a name that's too short", async () => {
    asAdmin();

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
    asAdmin();

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

    expect(travelMessageTemplateUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1", hackathonId: HACKATHON_ID },
      data: {
        name: "Missing ticket",
        message: "Updated message text.",
        active: true,
      },
    });
  });

  test("deactivates a message template when active is omitted", async () => {
    asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateTravelMessageTemplate",
        id: "clabcdefghijklmnopqrstu1",
        name: "Missing ticket",
        message: "Updated message text.",
      }),
    );

    expect(travelMessageTemplateUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1", hackathonId: HACKATHON_ID },
      data: {
        name: "Missing ticket",
        message: "Updated message text.",
        active: false,
      },
    });
  });

  test("returns a friendly error on a duplicate name/code", async () => {
    asAdmin();
    const { Prisma } = await import("@prisma/client");
    categoryCreateMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "1",
      }),
    );

    const result = await saveMetadata(
      {},
      formData({ operation: "createCategory", name: "Food", departmentId }),
    );

    expect(result.error).toBe("That name or code is already in use.");
  });

  test("rethrows unexpected errors", async () => {
    asAdmin();
    categoryCreateMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      saveMetadata(
        {},
        formData({ operation: "createCategory", name: "Food", departmentId }),
      ),
    ).rejects.toThrow("db down");
  });
});

describe("saveMetadata updateRoleSettings", () => {
  test("merges role settings into the hackathon settings", async () => {
    asAdmin();
    hackathonFindUniqueMock.mockResolvedValueOnce({
      settings: { theme: "violet" },
    });

    const result = await saveMetadata(
      {},
      formData({
        operation: "updateRoleSettings",
        "role:ORGANIZER:label": "Volunteer",
        "role:ORGANIZER:enabled": "on",
      }),
    );

    expect(hackathonUpdateMock).toHaveBeenCalledWith({
      where: { id: HACKATHON_ID },
      data: {
        settings: expect.objectContaining({
          theme: "violet",
          roles: expect.objectContaining({
            ORGANIZER: expect.objectContaining({
              label: "Volunteer",
              enabled: true,
            }),
          }),
        }),
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({ success: true });
  });
});

describe("saveMetadata bulkUpdateCategories", () => {
  test("errors when not an admin", async () => {
    getOrganizerIdMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateCategories" }),
    );

    expect(result.error).toBe("Only admins can edit metadata.");
  });

  test("errors when there is nothing to save", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateCategories" }),
    );

    expect(result.error).toBe("Nothing to save.");
  });

  test("errors on a blank category name", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "x",
        "category:cat1:departmentId": "dep1",
      }),
    );

    expect(result.error).toBe(
      "Each category needs a name with at least 2 characters.",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test("errors when a category has no department", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "Food",
      }),
    );

    expect(result.error).toBe("Each category must have a department.");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test("errors on a blank subcategory name", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "subcategory:sub1:name": "x",
      }),
    );

    expect(result.error).toBe(
      "Each subcategory needs a name with at least 2 characters.",
    );
  });

  test("updates every category and subcategory row in one transaction", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "Food",
        "category:cat1:departmentId": "dep1",
        "category:cat1:active": "on",
        "category:cat2:name": "Travel",
        "category:cat2:departmentId": "dep2",
        "subcategory:sub1:name": "Snacks",
        "subcategory:sub1:active": "on",
      }),
    );

    expect(categoryUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "cat1", hackathonId: HACKATHON_ID },
      data: { name: "Food", active: true, departmentId: "dep1" },
    });
    expect(categoryUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "cat2", hackathonId: HACKATHON_ID },
      data: { name: "Travel", active: false, departmentId: "dep2" },
    });
    expect(subcategoryUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "sub1", category: { hackathonId: HACKATHON_ID } },
      data: { name: "Snacks", active: true },
    });
    expect(budgetCategoryUpdateManyMock).not.toHaveBeenCalled();
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  test("keeps the active budget's name snapshots in sync with renames", async () => {
    asAdmin();
    budgetFindFirstMock.mockResolvedValueOnce({ id: "budget1" });

    await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:cat1:name": "Food & drinks",
        "category:cat1:departmentId": "dep1",
        "subcategory:sub1:name": "Snacks",
      }),
    );

    expect(budgetCategoryUpdateManyMock).toHaveBeenCalledWith({
      where: { budgetId: "budget1", categoryId: "cat1" },
      data: { name: "Food & drinks" },
    });
    expect(budgetSubcategoryUpdateManyMock).toHaveBeenCalledWith({
      where: {
        subcategoryId: "sub1",
        budgetCategory: { budgetId: "budget1" },
      },
      data: { name: "Snacks" },
    });
  });

  test("returns a friendly error on a duplicate name", async () => {
    asAdmin();
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
        "category:cat1:departmentId": "dep1",
      }),
    );

    expect(result.error).toBe("That name is already in use.");
  });

  test("ignores an Unexpected expenses row even if one is submitted", async () => {
    asAdmin();
    categoryFindFirstMock.mockResolvedValueOnce({ id: "unexpected-id" });

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateCategories",
        "category:unexpected-id:name": "Renamed",
        "category:unexpected-id:departmentId": "dep1",
        "category:unexpected-id:active": "off",
      }),
    );

    expect(categoryUpdateManyMock).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Nothing to save." });
  });
});

describe("saveMetadata bulkUpdateDepartments", () => {
  test("errors when there is nothing to save", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "bulkUpdateDepartments" }),
    );

    expect(result.error).toBe("Nothing to save.");
  });

  test("errors on a blank department name", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:dep1:name": "x",
      }),
    );

    expect(result.error).toBe(
      "Each department needs a name with at least 2 characters.",
    );
  });

  test("errors on an invalid color", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:dep1:name": "Operations",
        "department:dep1:color": "purple",
      }),
    );

    expect(result.error).toBe("Department colors must be valid hex colors.");
    expect(departmentUpdateManyMock).not.toHaveBeenCalled();
  });

  test("updates non-protected departments' name, color and active state", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ id: "general-dep-id" });

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:dep1:name": "Operations",
        "department:dep1:color": "#7c3aed",
        "department:dep1:active": "on",
      }),
    );

    expect(departmentUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "dep1", hackathonId: HACKATHON_ID },
      data: { name: "Operations", color: "#7c3aed", active: true },
    });
    expect(result).toEqual({ success: true });
  });

  test("does not touch active for the protected general department", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ id: "general-dep-id" });

    const result = await saveMetadata(
      {},
      formData({
        operation: "bulkUpdateDepartments",
        "department:general-dep-id:name": "General",
      }),
    );

    expect(departmentUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "general-dep-id", hackathonId: HACKATHON_ID },
      data: { name: "General" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("saveMetadata deleteDepartment", () => {
  const id = "clabcdefghijklmnopqrstu1";

  test("deletes an unused department", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ code: "ops" });
    categoryCountMock.mockResolvedValueOnce(0);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(departmentFindFirstMock).toHaveBeenCalledWith({
      where: { id, hackathonId: HACKATHON_ID },
      select: { code: true },
    });
    expect(departmentDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({ success: true });
  });

  test("refuses to delete the protected General department", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ code: "general" });

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toBe("The General department can't be deleted.");
    expect(departmentDeleteMock).not.toHaveBeenCalled();
  });

  test("refuses when categories still use the department", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ code: "ops" });
    categoryCountMock.mockResolvedValueOnce(2);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toContain("still has 2 categories");
    expect(departmentDeleteMock).not.toHaveBeenCalled();
  });

  test("reports a department that no longer exists", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteDepartment", id }),
    );

    expect(result.error).toBe("That department no longer exists.");
  });

  test("turns a foreign-key race into a friendly error", async () => {
    asAdmin();
    departmentFindFirstMock.mockResolvedValueOnce({ code: "ops" });
    categoryCountMock.mockResolvedValueOnce(0);
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
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(categoryFindFirstMock).toHaveBeenCalledWith({
      where: { id, hackathonId: HACKATHON_ID },
      select: { name: true },
    });
    expect(categoryDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/settings");
    expect(result).toEqual({ success: true });
  });

  test("deletes a subcategory", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteSubcategory", id }),
    );

    expect(subcategoryFindFirstMock).toHaveBeenCalledWith({
      where: { id, category: { hackathonId: HACKATHON_ID } },
      select: { id: true },
    });
    expect(subcategoryDeleteMock).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual({ success: true });
  });

  test("reports a category outside the hackathon as missing", async () => {
    asAdmin();
    categoryFindFirstMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(result.error).toBe("That category no longer exists.");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("reports a subcategory outside the hackathon as missing", async () => {
    asAdmin();
    subcategoryFindFirstMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteSubcategory", id }),
    );

    expect(result.error).toBe("That subcategory no longer exists.");
    expect(subcategoryDeleteMock).not.toHaveBeenCalled();
  });

  test("refuses to delete a category that has expenses", async () => {
    asAdmin();
    expenseCountMock.mockResolvedValueOnce(2);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(result.error).toContain("2 expenses");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("refuses to delete a subcategory that has expenses", async () => {
    asAdmin();
    expenseCountMock.mockResolvedValueOnce(1);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteSubcategory", id }),
    );

    expect(result.error).toContain("1 expense ");
    expect(subcategoryDeleteMock).not.toHaveBeenCalled();
  });

  test("rejects an invalid id", async () => {
    asAdmin();

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id: "nope" }),
    );

    expect(result.error).toBe("Complete all fields with valid values.");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("only admins can delete", async () => {
    getOrganizerIdMock.mockResolvedValueOnce(null);

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(result.error).toBe("Only admins can edit metadata.");
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  test("turns a missing record into a friendly error", async () => {
    asAdmin();
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

  test("refuses to delete the Unexpected expenses category", async () => {
    asAdmin();
    categoryFindFirstMock.mockResolvedValueOnce({
      name: "Unexpected expenses",
    });

    const result = await saveMetadata(
      {},
      formData({ operation: "deleteCategory", id }),
    );

    expect(result.error).toBe(
      "The Unexpected expenses category can't be deleted.",
    );
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });
});

describe("saveMetadata Unexpected expenses protections", () => {
  test("refuses to add a subcategory under Unexpected expenses", async () => {
    asAdmin();
    categoryFindFirstMock.mockResolvedValueOnce({
      name: "Unexpected expenses",
    });

    const result = await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(result.error).toBe("Unexpected expenses can't have subcategories.");
    expect(subcategoryCreateMock).not.toHaveBeenCalled();
  });
});
