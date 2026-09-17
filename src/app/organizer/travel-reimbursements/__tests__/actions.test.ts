import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueUserMock = vi.fn();
const findUniqueReimbursementMock = vi.fn();
const findManyRequirementMock = vi.fn();
const transactionMock = vi.fn(
  async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
);
const reimbursementUpdateMock = vi.fn();
const statusEventCreateMock = vi.fn();
const requirementCheckUpsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueUserMock(...args) },
    travelReimbursement: {
      findUnique: (...args: unknown[]) => findUniqueReimbursementMock(...args),
      update: (...args: unknown[]) => reimbursementUpdateMock(...args),
    },
    travelFinalRequirement: {
      findMany: (...args: unknown[]) => findManyRequirementMock(...args),
    },
    travelStatusEvent: {
      create: (...args: unknown[]) => statusEventCreateMock(...args),
    },
    travelRequirementCheck: {
      upsert: (...args: unknown[]) => requirementCheckUpsertMock(...args),
    },
    $transaction: (...args: unknown[]) =>
      transactionMock(...(args as [unknown[]])),
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const {
  reviewTravelRequest,
  saveRequirementChecks,
  finalApproveTravel,
} = await import("@/app/organizer/travel-reimbursements/actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const reimbursementId = "clabcdefghijklmnopqrstu1";

beforeEach(() => {
  vi.clearAllMocks();
});

async function asDirector() {
  authMock.mockResolvedValueOnce({ user: { id: "reviewer1" } });
  findUniqueUserMock.mockResolvedValueOnce({ role: "DIRECTOR" });
}

describe("reviewTravelRequest", () => {
  test("errors when not an admin or director", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueUserMock.mockResolvedValueOnce({ role: "ORGANIZER" });

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "approve", approvedAmount: "10" }),
    );

    expect(result.error).toBe(
      "Only admins and directors can review travel requests.",
    );
  });

  test("errors on an invalid reimbursement id", async () => {
    await asDirector();

    const result = await reviewTravelRequest(
      "not-a-cuid",
      {},
      formData({ operation: "approve", approvedAmount: "10" }),
    );

    expect(result.error).toBe("Invalid reimbursement.");
  });

  test("errors on invalid form data", async () => {
    await asDirector();

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "reject", note: "" }),
    );

    expect(result.error).toBe(
      "A note is required when rejecting a request.",
    );
  });

  test("errors when the reimbursement is not found", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce(null);

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "reject", note: "Missing receipt" }),
    );

    expect(result.error).toBe("Travel reimbursement not found.");
  });

  test("errors when the reimbursement is not pending review", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "APPROVED",
      totalPriceCents: 1000,
    });

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "reject", note: "Missing receipt" }),
    );

    expect(result.error).toBe("This request is no longer pending review.");
  });

  test("errors when the approved amount exceeds the submitted total", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "PENDING_REVIEW",
      totalPriceCents: 500,
    });

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "approve", approvedAmount: "10" }),
    );

    expect(result.error).toBe(
      "Approved amount cannot exceed the submitted total.",
    );
  });

  test("approves the request and creates a status event", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "PENDING_REVIEW",
      totalPriceCents: 5000,
    });

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "approve", approvedAmount: "10" }),
    );

    expect(reimbursementUpdateMock).toHaveBeenCalledWith({
      where: { id: reimbursementId },
      data: expect.objectContaining({
        status: "APPROVED",
        approvedAmountCents: 1000,
        initialReviewerId: "reviewer1",
      }),
    });
    expect(statusEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reimbursementId,
        actorId: "reviewer1",
        fromStatus: "PENDING_REVIEW",
        toStatus: "APPROVED",
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/organizer/travel-reimbursements/${reimbursementId}`,
    );
    expect(result).toEqual({ success: true });
  });

  test("requests changes with a note", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "PENDING_REVIEW",
      totalPriceCents: 5000,
    });

    const result = await reviewTravelRequest(
      reimbursementId,
      {},
      formData({ operation: "requestChanges", note: "Add a receipt" }),
    );

    expect(reimbursementUpdateMock).toHaveBeenCalledWith({
      where: { id: reimbursementId },
      data: expect.objectContaining({
        status: "CHANGES_REQUESTED",
        organizerNote: "Add a receipt",
        approvedAmountCents: null,
      }),
    });
    expect(result).toEqual({ success: true });
  });
});

describe("saveRequirementChecks", () => {
  test("errors when not an admin or director", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueUserMock.mockResolvedValueOnce({ role: "ORGANIZER" });

    const result = await saveRequirementChecks(reimbursementId, {}, formData({}));

    expect(result.error).toBe(
      "Only admins and directors can update final checks.",
    );
  });

  test("errors on an invalid reimbursement id", async () => {
    await asDirector();

    const result = await saveRequirementChecks("bad-id", {}, formData({}));

    expect(result.error).toBe("Invalid reimbursement.");
  });

  test("errors when the reimbursement is not found", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce(null);
    findManyRequirementMock.mockResolvedValueOnce([]);

    const result = await saveRequirementChecks(reimbursementId, {}, formData({}));

    expect(result.error).toBe("Travel reimbursement not found.");
  });

  test("errors when not in final review", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({ status: "APPROVED" });
    findManyRequirementMock.mockResolvedValueOnce([]);

    const result = await saveRequirementChecks(reimbursementId, {}, formData({}));

    expect(result.error).toBe(
      "Checklist updates require a submitted demo proof.",
    );
  });

  test("upserts checks for each active requirement", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      status: "FINAL_REVIEW",
    });
    findManyRequirementMock.mockResolvedValueOnce([
      { id: "req1" },
      { id: "req2" },
    ]);

    const result = await saveRequirementChecks(
      reimbursementId,
      {},
      formData({ "requirement:req1": "on" }),
    );

    expect(requirementCheckUpsertMock).toHaveBeenCalledTimes(2);
    expect(requirementCheckUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ checked: true, checkedById: "reviewer1" }),
      }),
    );
    expect(requirementCheckUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ checked: false, checkedById: null }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/organizer/travel-reimbursements/${reimbursementId}`,
    );
    expect(result).toEqual({ success: true });
  });
});

describe("finalApproveTravel", () => {
  test("errors when not an admin or director", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueUserMock.mockResolvedValueOnce({ role: "ORGANIZER" });

    const result = await finalApproveTravel(reimbursementId, {}, formData({}));

    expect(result.error).toBe(
      "Only admins and directors can final-approve travel.",
    );
  });

  test("errors on an invalid reimbursement id", async () => {
    await asDirector();

    const result = await finalApproveTravel("bad-id", {}, formData({}));

    expect(result.error).toBe("Invalid reimbursement.");
  });

  test("errors when missing a demo proof or not in final review", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "FINAL_REVIEW",
      demoUrl: null,
    });
    findManyRequirementMock.mockResolvedValueOnce([]);

    const result = await finalApproveTravel(reimbursementId, {}, formData({}));

    expect(result.error).toBe(
      "Final approval requires a submitted demo proof.",
    );
  });

  test("errors when a requirement is not checked", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "FINAL_REVIEW",
      demoUrl: "https://example.com/demo",
    });
    findManyRequirementMock.mockResolvedValueOnce([
      { id: "req1", checks: [{ checked: false }] },
    ]);

    const result = await finalApproveTravel(reimbursementId, {}, formData({}));

    expect(result.error).toBe("Complete every active final requirement first.");
  });

  test("final-approves when all requirements are checked", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "FINAL_REVIEW",
      demoUrl: "https://example.com/demo",
    });
    findManyRequirementMock.mockResolvedValueOnce([
      { id: "req1", checks: [{ checked: true }] },
    ]);

    const result = await finalApproveTravel(reimbursementId, {}, formData({}));

    expect(reimbursementUpdateMock).toHaveBeenCalledWith({
      where: { id: reimbursementId },
      data: expect.objectContaining({
        status: "FINAL_APPROVED",
        finalReviewerId: "reviewer1",
      }),
    });
    expect(statusEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toStatus: "FINAL_APPROVED",
      }),
    });
    expect(result).toEqual({ success: true });
  });

  test("treats a requirement with no check record as unchecked", async () => {
    await asDirector();
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: reimbursementId,
      status: "FINAL_REVIEW",
      demoUrl: "https://example.com/demo",
    });
    findManyRequirementMock.mockResolvedValueOnce([
      { id: "req1", checks: [] },
    ]);

    const result = await finalApproveTravel(reimbursementId, {}, formData({}));

    expect(result.error).toBe("Complete every active final requirement first.");
  });
});
