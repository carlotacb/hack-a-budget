import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { MetadataForm } = await import("@/components/metadata-form");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("MetadataForm", () => {
  test("renders create form with 'New name' label and Add button", () => {
    render(<MetadataForm operation="createCategory" />);

    expect(screen.getByLabelText("New name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Active")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
  });

  test("renders update form with 'Name' label, active checkbox and Save button", () => {
    render(
      <MetadataForm
        operation="updateCategory"
        id="cat1"
        name="Food"
        active={false}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Food");
    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("renders the code field for department operations", () => {
    render(<MetadataForm operation="createDepartment" code="OPS" />);

    expect(screen.getByLabelText("Code")).toHaveValue("OPS");
  });

  test("does not render the code field for non-department operations", () => {
    render(<MetadataForm operation="createCategory" />);

    expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
  });

  test("submits create operation with entered name", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<MetadataForm operation="createSubcategory" categoryId="cat1" />);

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Snacks" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createSubcategory");
    expect(formData.get("categoryId")).toBe("cat1");
    expect(formData.get("name")).toBe("Snacks");
    expect(formData.get("id")).toBeNull();
  });

  test("submits update operation with id and active state", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <MetadataForm
        operation="updateDepartment"
        id="dep1"
        name="Ops"
        code="OPS"
        active
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("updateDepartment");
    expect(formData.get("id")).toBe("dep1");
    expect(formData.get("code")).toBe("OPS");
    expect(formData.get("active")).toBe("on");
  });

  test("disables the button and shows the saving label while pending", async () => {
    let resolveSave: (value: object) => void = () => {};
    saveMetadataMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(<MetadataForm operation="createCategory" />);

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Food" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByRole("button", { name: "Saving..." }),
    ).toBeDisabled();

    resolveSave({ success: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add" })).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ error: "Name already exists." });
    render(<MetadataForm operation="createCategory" />);

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Food" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name already exists.",
    );
  });

  test("shows a success message returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<MetadataForm operation="createCategory" />);

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Food" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });
});
