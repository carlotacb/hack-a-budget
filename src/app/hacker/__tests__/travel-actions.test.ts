import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const getHackerIdMock = vi.fn();
vi.mock("@/lib/travel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/travel")>();
  return { ...actual, getHackerId: (...args: unknown[]) => getHackerIdMock(...args) };
});

const findUniqueReimbursementMock = vi.fn();
const findUniqueSettingsMock = vi.fn();
const transactionArrayMock = vi.fn(
  async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
);
const txUpdateMock = vi.fn();
const txCreateMock = vi.fn();
const txStatusEventCreateMock = vi.fn();
const reimbursementUpdateMock = vi.fn();
const statusEventCreateMock = vi.fn();

function transactionImpl(arg: unknown) {
  if (typeof arg === "function") {
    const tx = {
      travelReimbursement: {
        update: (...args: unknown[]) => txUpdateMock(...args),
        create: (...args: unknown[]) => txCreateMock(...args),
      },
      travelStatusEvent: { create: (...args: unknown[]) => txStatusEventCreateMock(...args) },
    };
    return (arg as (tx: unknown) => unknown)(tx);
  }
  return transactionArrayMock(arg as unknown[]);
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    travelReimbursement: {
      findUnique: (...args: unknown[]) => findUniqueReimbursementMock(...args),
      update: (...args: unknown[]) => reimbursementUpdateMock(...args),
    },
    travelEventSettings: {
      findUnique: (...args: unknown[]) => findUniqueSettingsMock(...args),
    },
    travelStatusEvent: {
      create: (...args: unknown[]) => statusEventCreateMock(...args),
    },
    $transaction: (arg: unknown) => transactionImpl(arg),
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const putMock = vi.fn(async (..._args: unknown[]) => ({
  url: "https://blob.vercel-storage.com/travel-reimbursements/test.pdf",
}));
const delMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}));

const { saveTravelRequest, saveDemoProof } = await import(
  "@/app/hacker/travel-actions"
);

function baseFields() {
  return {
    originCity: "Barcelona",
    originCountry: "Spain",
    transportMode: "TRAIN",
    outboundDepartureAt: "2026-03-01T08:00",
    outboundDeparturePlace: "Sants Station",
    outboundArrivalAt: "2026-03-01T12:00",
    outboundArrivalPlace: "Paris Gare",
    outboundCarrier: "Renfe",
    returnDepartureAt: "2026-03-05T08:00",
    returnDeparturePlace: "Paris Gare",
    returnArrivalAt: "2026-03-05T12:00",
    returnArrivalPlace: "Sants Station",
    returnCarrier: "Renfe",
    totalPrice: "150",
    totalCurrency: "EUR",
  };
}

function formData(fields: Record<string, string>, ticket?: File) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  if (ticket) fd.set("ticket", ticket);
  return fd;
}

function pdfTicket(name = "ticket.pdf") {
  const file = new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
  file.arrayBuffer = async () =>
    new TextEncoder().encode("%PDF-1.4 fake").buffer;
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveTravelRequest", () => {
  test("errors when not a hacker", async () => {
    getHackerIdMock.mockResolvedValueOnce(null);

    const result = await saveTravelRequest({}, formData(baseFields(), pdfTicket()));

    expect(result.error).toBe("Only hackers can submit travel reimbursements.");
  });

  test("errors on invalid form fields", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData({ ...baseFields(), originCity: "B" }, pdfTicket()),
    );

    expect(result.error).toBe("Enter your origin city.");
  });

  test("requires flight numbers when transport mode is AIRPLANE", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData({ ...baseFields(), transportMode: "AIRPLANE" }, pdfTicket()),
    );

    expect(result.error).toBe("Enter the outbound flight number.");
  });

  test("errors on invalid dates", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData({ ...baseFields(), outboundDepartureAt: "bad" }, pdfTicket()),
    );

    expect(result.error).toBe("Enter valid dates and times for every journey.");
  });

  test("errors on an invalid currency", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData({ ...baseFields(), totalCurrency: "123" }, pdfTicket()),
    );

    expect(result.error).toBe("Select a valid currency.");
  });

  test("errors when outbound departure is not before arrival", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData(
        {
          ...baseFields(),
          outboundDepartureAt: "2026-03-01T12:00",
          outboundArrivalAt: "2026-03-01T08:00",
        },
        pdfTicket(),
      ),
    );

    expect(result.error).toBe("Outbound departure must be before arrival.");
  });

  test("errors when return departure is before outbound arrival", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData(
        {
          ...baseFields(),
          returnDepartureAt: "2026-03-01T09:00",
        },
        pdfTicket(),
      ),
    );

    expect(result.error).toBe(
      "The return journey must depart after the outbound journey arrives.",
    );
  });

  test("errors when luggage paid but no positive price given", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveTravelRequest(
      {},
      formData({ ...baseFields(), luggagePaid: "on" }, pdfTicket()),
    );

    expect(result.error).toBe(
      "Enter a positive luggage price when luggage was paid.",
    );
  });

  test("errors when an existing reimbursement is not editable", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "PENDING_REVIEW",
      ticketPath: "/uploads/travel-reimbursements/old.pdf",
    });

    const result = await saveTravelRequest({}, formData(baseFields()));

    expect(result.error).toBe(
      "This reimbursement cannot be edited in its current status.",
    );
  });

  test("requires a ticket for a new submission", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce(null);

    const result = await saveTravelRequest({}, formData(baseFields()));

    expect(result.error).toBe("Upload exactly one ticket document.");
  });

  test("rejects a ticket with a mismatched signature", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce(null);

    const badTicket = new File(["not a pdf"], "ticket.pdf", {
      type: "application/pdf",
    });
    badTicket.arrayBuffer = async () =>
      new TextEncoder().encode("not a pdf").buffer;

    const result = await saveTravelRequest(
      {},
      formData(baseFields(), badTicket),
    );

    expect(result.error).toBe(
      "The ticket contents do not match the selected file type.",
    );
  });

  test("creates a new reimbursement on success", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce(null);
    txCreateMock.mockResolvedValueOnce({ id: "new-r1" });

    const result = await saveTravelRequest(
      {},
      formData(baseFields(), pdfTicket()),
    );

    expect(txCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hackerId: "hacker1",
          totalPriceCents: 15000,
          totalCurrencyCode: "EUR",
          status: "PENDING_REVIEW",
        }),
      }),
    );
    expect(txStatusEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reimbursementId: "new-r1",
          fromStatus: null,
          toStatus: "PENDING_REVIEW",
          note: "Travel request submitted.",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements",
    );
    expect(result).toEqual({ success: true });
  });

  test("updates an existing editable reimbursement without a new ticket", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "REJECTED",
      ticketPath: "/uploads/travel-reimbursements/old.pdf",
    });
    txUpdateMock.mockResolvedValueOnce({ id: "r1" });

    const result = await saveTravelRequest({}, formData(baseFields()));

    expect(txUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({
          ticketPath: "/uploads/travel-reimbursements/old.pdf",
        }),
      }),
    );
    expect(txStatusEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: "Travel request resubmitted.",
        }),
      }),
    );
    expect(delMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("removes the old ticket when replaced", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "REJECTED",
      ticketPath: "/uploads/travel-reimbursements/old.pdf",
    });
    txUpdateMock.mockResolvedValueOnce({ id: "r1" });

    const result = await saveTravelRequest(
      {},
      formData(baseFields(), pdfTicket("new.pdf")),
    );

    expect(putMock).toHaveBeenCalled();
    expect(delMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("cleans up the new ticket if the transaction fails", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce(null);
    txCreateMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      saveTravelRequest({}, formData(baseFields(), pdfTicket())),
    ).rejects.toThrow("db down");

    expect(delMock).toHaveBeenCalled();
  });
});

describe("saveDemoProof", () => {
  const demoFields = {
    demoUrl: "https://example.com/demo",
    demoComment: "Check it out",
  };

  test("errors when not a hacker", async () => {
    getHackerIdMock.mockResolvedValueOnce(null);

    const result = await saveDemoProof({}, formData(demoFields));

    expect(result.error).toBe("Only hackers can submit demo proof.");
  });

  test("errors on an invalid demo url", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");

    const result = await saveDemoProof(
      {},
      formData({ ...demoFields, demoUrl: "not-a-url" }),
    );

    expect(result.error).toBe("Enter a valid project or demo URL.");
  });

  test("errors when there is no approved reimbursement", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce(null);
    findUniqueSettingsMock.mockResolvedValueOnce(null);

    const result = await saveDemoProof({}, formData(demoFields));

    expect(result.error).toBe(
      "Demo proof requires an approved travel reimbursement.",
    );
  });

  test("errors when demo proof is not unlocked yet", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "APPROVED",
    });
    findUniqueSettingsMock.mockResolvedValueOnce({
      hackathonStartAt: new Date(Date.now() + 100_000),
    });

    const result = await saveDemoProof({}, formData(demoFields));

    expect(result.error).toBe("Demo proof is not unlocked yet.");
  });

  test("submits demo proof on success", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "APPROVED",
    });
    findUniqueSettingsMock.mockResolvedValueOnce({
      hackathonStartAt: new Date(Date.now() - 100_000),
    });

    const result = await saveDemoProof({}, formData(demoFields));

    expect(reimbursementUpdateMock).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: expect.objectContaining({
        demoUrl: "https://example.com/demo",
        status: "FINAL_REVIEW",
      }),
    });
    expect(statusEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: "APPROVED",
        toStatus: "FINAL_REVIEW",
        note: "Demo proof submitted.",
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/organizer/travel-reimbursements/r1",
    );
    expect(result).toEqual({ success: true });
  });

  test("uses updated note when resubmitting from FINAL_REVIEW", async () => {
    getHackerIdMock.mockResolvedValueOnce("hacker1");
    findUniqueReimbursementMock.mockResolvedValueOnce({
      id: "r1",
      status: "FINAL_REVIEW",
    });
    findUniqueSettingsMock.mockResolvedValueOnce({
      hackathonStartAt: new Date(Date.now() - 100_000),
    });

    const result = await saveDemoProof({}, formData(demoFields));

    expect(statusEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ note: "Demo proof updated." }),
    });
    expect(result).toEqual({ success: true });
  });
});
