import { describe, expect, test, vi, beforeEach } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/travel", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

const reimbursementFindFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    travelReimbursement: {
      findFirst: (...args: unknown[]) => reimbursementFindFirstMock(...args),
    },
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

describe("GET /api/tickets/travel/[id]", () => {
  test("returns 404 when signed out", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(404);
    expect(reimbursementFindFirstMock).not.toHaveBeenCalled();
  });

  test("returns 404 when the reimbursement does not exist", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "hacker1", role: "HACKER", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test"), params("missing"));

    expect(response.status).toBe(404);
  });

  test("returns 404 for a hacker who does not own the reimbursement", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "hacker1", role: "HACKER", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce({
      hackerId: "someone-else",
      ticketPath: "https://blob.example/travel-reimbursements/a.pdf",
    });

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(404);
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  test("allows the owning hacker", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "hacker1", role: "HACKER", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce({
      hackerId: "hacker1",
      ticketPath: "https://blob.example/travel-reimbursements/a.pdf",
    });
    const stream = new ReadableStream();
    getBlobMock.mockResolvedValueOnce({
      stream,
      blob: { contentType: "application/pdf" },
    });

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(200);
  });

  test("allows an ADMIN reviewer who does not own the reimbursement", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "admin1", role: "ADMIN", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce({
      hackerId: "hacker1",
      ticketPath: "https://blob.example/travel-reimbursements/a.pdf",
    });
    const stream = new ReadableStream();
    getBlobMock.mockResolvedValueOnce({
      stream,
      blob: { contentType: "application/pdf" },
    });

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(200);
  });

  test("blocks an ORGANIZER (not a reviewer role) who does not own the reimbursement", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "org1", role: "ORGANIZER", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce({
      hackerId: "hacker1",
      ticketPath: "https://blob.example/travel-reimbursements/a.pdf",
    });

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(404);
  });

  test("returns 404 when the blob can't be fetched", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "hacker1", role: "HACKER", hackathonId: "h1" });
    reimbursementFindFirstMock.mockResolvedValueOnce({
      hackerId: "hacker1",
      ticketPath: "https://blob.example/travel-reimbursements/a.pdf",
    });
    getBlobMock.mockRejectedValueOnce(new Error("not found"));

    const response = await GET(new Request("http://test"), params("r1"));

    expect(response.status).toBe(404);
  });
});
