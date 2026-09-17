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
const travelSettingsUpsertMock = vi.fn();
const travelRequirementCreateMock = vi.fn();
const travelRequirementUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    category: {
      create: (...args: unknown[]) => categoryCreateMock(...args),
      update: (...args: unknown[]) => categoryUpdateMock(...args),
    },
    subcategory: {
      create: (...args: unknown[]) => subcategoryCreateMock(...args),
      update: (...args: unknown[]) => subcategoryUpdateMock(...args),
    },
    department: {
      create: (...args: unknown[]) => departmentCreateMock(...args),
      update: (...args: unknown[]) => departmentUpdateMock(...args),
    },
    travelEventSettings: {
      upsert: (...args: unknown[]) => travelSettingsUpsertMock(...args),
    },
    travelFinalRequirement: {
      create: (...args: unknown[]) => travelRequirementCreateMock(...args),
      update: (...args: unknown[]) => travelRequirementUpdateMock(...args),
    },
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/expenses/new");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(result).toEqual({ success: true });
  });

  test("updates a category with active flag", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateCategory",
        id: "clabcdefghijklmnopqrstu1",
        name: "Food",
        active: "on",
      }),
    );

    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: { name: "Food", active: true },
    });
  });

  test("creates a subcategory", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "createSubcategory",
        categoryId: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(subcategoryCreateMock).toHaveBeenCalledWith({
      data: { categoryId: "clabcdefghijklmnopqrstu1", name: "Snacks" },
    });
  });

  test("updates a subcategory", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateSubcategory",
        id: "clabcdefghijklmnopqrstu1",
        name: "Snacks",
      }),
    );

    expect(subcategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: { name: "Snacks", active: false },
    });
  });

  test("creates a department with a lowercased code", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "createDepartment",
        code: "OPS",
        name: "Operations",
      }),
    );

    expect(departmentCreateMock).toHaveBeenCalledWith({
      data: { code: "ops", name: "Operations" },
    });
  });

  test("updates a department", async () => {
    await asAdmin();

    await saveMetadata(
      {},
      formData({
        operation: "updateDepartment",
        id: "clabcdefghijklmnopqrstu1",
        code: "OPS",
        name: "Operations",
        active: "on",
      }),
    );

    expect(departmentUpdateMock).toHaveBeenCalledWith({
      where: { id: "clabcdefghijklmnopqrstu1" },
      data: { code: "ops", name: "Operations", active: true },
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
