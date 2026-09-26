import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { DepartmentsBulkForm } = await import(
  "@/components/departments-bulk-form"
);

const updatedAt = "2026-01-01T00:00:00.000Z";
const departments = [
  { id: "dep1", code: "hx", name: "HX", active: true, updatedAt },
  { id: "general-id", code: "general", name: "General", active: true, updatedAt },
  { id: "dep2", code: "mkt", name: "Marketing", active: false, updatedAt },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DepartmentsBulkForm", () => {
  test("renders a row per department with a single Save button", () => {
    render(<DepartmentsBulkForm departments={departments} />);

    expect(screen.getAllByDisplayValue("HX")).toHaveLength(1);
    expect(screen.getAllByDisplayValue("Marketing")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Save changes" })).toHaveLength(1);
  });

  test("does not show a code field", () => {
    render(<DepartmentsBulkForm departments={departments} />);

    expect(screen.queryByText("Code")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("hx")).not.toBeInTheDocument();
  });

  test("shows the general department as plain text: no inputs, no delete", () => {
    render(<DepartmentsBulkForm departments={departments} />);

    expect(
      screen.queryByRole("button", { name: "Delete General" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete HX" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("General")).not.toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    // Only the two editable departments have an Active checkbox.
    expect(screen.getAllByRole("checkbox", { name: "Active" })).toHaveLength(2);
    expect(
      screen.getByText(/Default department/),
    ).toBeInTheDocument();
  });

  test("submits every department row via the form= association, respecting the general department's protection", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("bulkUpdateDepartments");
    expect(formData.get("department:dep1:code")).toBeNull();
    expect(formData.get("department:dep1:name")).toBe("HX");
    expect(formData.get("department:dep1:active")).toBe("on");
    expect(formData.get("department:dep2:active")).toBeNull();
    expect(formData.get("department:general-id:code")).toBeNull();
    expect(formData.get("department:general-id:active")).toBeNull();
    expect(formData.get("department:general-id:name")).toBeNull();
  });

  test("deleting asks for confirmation, then submits the delete operation with the id", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete HX" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(confirmSpy).toHaveBeenCalled();
    expect(formData.get("operation")).toBe("deleteDepartment");
    expect(formData.get("id")).toBe("dep1");
    confirmSpy.mockRestore();
  });

  test("declining the confirmation does not delete", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete HX" }));

    expect(saveMetadataMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("shows an error message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ error: "Nothing to save." });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nothing to save.",
    );
  });

  test("shows a success message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });
});
