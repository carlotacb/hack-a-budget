import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { MetadataForm } = await import("@/components/metadata-form");

const departments = [
  { id: "dep1", name: "HX" },
  { id: "dep2", name: "Logistics" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("MetadataForm", () => {
  test("renders create-category form with 'New name' label and Add button", () => {
    render(<MetadataForm operation="createCategory" />);

    expect(screen.getByLabelText("New name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Active")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
  });

  test("renders the code field for department operations", () => {
    render(<MetadataForm operation="createDepartment" />);

    expect(screen.getByLabelText("Code")).toBeInTheDocument();
  });

  test("does not render the code field for non-department operations", () => {
    render(<MetadataForm operation="createCategory" />);

    expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
  });

  test("renders a department select for createSubcategory", () => {
    render(
      <MetadataForm
        operation="createSubcategory"
        categoryId="cat1"
        departments={departments}
      />,
    );

    expect(screen.getByLabelText("Department")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "HX" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Logistics" }),
    ).toBeInTheDocument();
  });

  test("does not render a department select for other operations", () => {
    render(<MetadataForm operation="createCategory" />);

    expect(screen.queryByLabelText("Department")).not.toBeInTheDocument();
  });

  test("submits createCategory with entered name", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<MetadataForm operation="createCategory" />);

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Food" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createCategory");
    expect(formData.get("name")).toBe("Food");
  });

  test("submits createSubcategory with categoryId, name, and departmentId", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <MetadataForm
        operation="createSubcategory"
        categoryId="cat1"
        departments={departments}
      />,
    );

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Snacks" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dep2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createSubcategory");
    expect(formData.get("categoryId")).toBe("cat1");
    expect(formData.get("name")).toBe("Snacks");
    expect(formData.get("departmentId")).toBe("dep2");
  });

  test("submits createDepartment with code and name", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<MetadataForm operation="createDepartment" />);

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "ops" },
    });
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Ops" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createDepartment");
    expect(formData.get("code")).toBe("ops");
    expect(formData.get("name")).toBe("Ops");
  });

  test("disables the button and shows the pending label while saving", async () => {
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
      await screen.findByRole("button", { name: "Adding..." }),
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
