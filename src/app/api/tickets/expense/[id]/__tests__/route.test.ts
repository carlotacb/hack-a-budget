import { describe, expect, test, vi, beforeEach } from "vitest";

const getOrganizerIdMock = vi.fn();
vi.mock("@/lib/organizer", () => ({
  getOrganizerId: (...args: unknown[]) => getOrganizerIdMock(...args),
}));

const expenseFindUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: { findUnique: (...args: unknown[]) => expenseFindUniqueMock(...args) },
  },
}));

const getBlobMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  get: (...args: unknown[]) => getBlobMock(...args),
}));

const { GET } = await import("../route");

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tickets/expense/[id]", () => {
  test("returns 404 when the caller is not an organizer/director/admin", async () => {
    getOrganizerIdMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test"), params("e1"));

    expect(response.status).toBe(404);
    expect(expenseFindUniqueMock).not.toHaveBeenCalled();
  });

  test("returns 404 when the expense has no ticket", async () => {
    getOrganizerIdMock.mockResolvedValueOnce("u1");
    expenseFindUniqueMock.mockResolvedValueOnce({ ticketPath: null });

    const response = await GET(new Request("http://test"), params("e1"));

    expect(response.status).toBe(404);
  });

  test("returns 404 when the expense does not exist", async () => {
    getOrganizerIdMock.mockResolvedValueOnce("u1");
    expenseFindUniqueMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test"), params("missing"));

    expect(response.status).toBe(404);
  });

  test("returns 404 when the blob can't be fetched", async () => {
    getOrganizerIdMock.mockResolvedValueOnce("u1");
    expenseFindUniqueMock.mockResolvedValueOnce({
      ticketPath: "https://blob.example/tickets/a.pdf",
    });
    getBlobMock.mockRejectedValueOnce(new Error("not found"));

    const response = await GET(new Request("http://test"), params("e1"));

    expect(response.status).toBe(404);
  });

  test("streams the ticket with its content type for an authorized caller", async () => {
    getOrganizerIdMock.mockResolvedValueOnce("u1");
    expenseFindUniqueMock.mockResolvedValueOnce({
      ticketPath: "https://blob.example/tickets/a.pdf",
    });
    const stream = new ReadableStream();
    getBlobMock.mockResolvedValueOnce({
      stream,
      blob: { contentType: "application/pdf" },
    });

    const response = await GET(new Request("http://test"), params("e1"));

    expect(getBlobMock).toHaveBeenCalledWith(
      "https://blob.example/tickets/a.pdf",
      { access: "private" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.body).toBe(stream);
  });
});
