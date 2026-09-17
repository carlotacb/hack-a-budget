import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { DepartmentsBulkForm } = await import(
  "@/components/departments-bulk-form"
);

const departments = [
  { id: "dep1", code: "hx", name: "HX", active: true },
  { id: "general-id", code: "general", name: "General", active: true },
  { id: "dep2", code: "mkt", name: "Marketing", active: false },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DepartmentsBulkForm", () => {
  test("renders a row per department with two Save buttons", () => {
    render(<DepartmentsBulkForm departments={departments} />);

    expect(screen.getAllByDisplayValue("HX")).toHaveLength(1);
    expect(screen.getAllByDisplayValue("Marketing")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(2);
  });

  test("disables the code input and active checkbox for the general department", () => {
    render(<DepartmentsBulkForm departments={departments} />);

    const codeInputs = screen.getAllByDisplayValue("general");
    expect(codeInputs[0]).toBeDisabled();
    expect(
      screen.getByText(/Protected default department/),
    ).toBeInTheDocument();
  });

  test("submits every department row via the form= association, respecting the general department's protection", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("bulkUpdateDepartments");
    expect(formData.get("department:dep1:code")).toBe("hx");
    expect(formData.get("department:dep1:name")).toBe("HX");
    expect(formData.get("department:dep1:active")).toBe("on");
    expect(formData.get("department:dep2:active")).toBeNull();
    expect(formData.get("department:general-id:code")).toBeNull();
    expect(formData.get("department:general-id:active")).toBeNull();
    expect(formData.get("department:general-id:name")).toBe("General");
  });

  test("shows an error message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ error: "Nothing to save." });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nothing to save.",
    );
  });

  test("shows a success message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<DepartmentsBulkForm departments={departments} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });
});
