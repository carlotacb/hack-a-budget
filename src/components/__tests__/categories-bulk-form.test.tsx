import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/metadata/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { CategoriesBulkForm } = await import(
  "@/components/categories-bulk-form"
);

const departments = [
  { id: "dep1", name: "HX" },
  { id: "dep2", name: "Logistics" },
];

const categories = [
  {
    id: "cat1",
    name: "Venue",
    active: true,
    subcategories: [
      { id: "sub1", name: "Space rental", active: true, departmentId: "dep1" },
    ],
  },
  {
    id: "cat2",
    name: "Catering",
    active: false,
    subcategories: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("CategoriesBulkForm", () => {
  test("renders each category and subcategory row with two Save buttons", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    expect(screen.getByDisplayValue("Venue")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Catering")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Space rental")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(2);
  });

  test("renders a standalone 'Add subcategory' form per category", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    expect(screen.getAllByLabelText("New name")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(2);
  });

  test("submits every category/subcategory row via the external form association", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("bulkUpdateCategories");
    expect(formData.get("category:cat1:name")).toBe("Venue");
    expect(formData.get("category:cat1:active")).toBe("on");
    expect(formData.get("category:cat2:name")).toBe("Catering");
    expect(formData.get("category:cat2:active")).toBeNull();
    expect(formData.get("subcategory:sub1:name")).toBe("Space rental");
    expect(formData.get("subcategory:sub1:departmentId")).toBe("dep1");
    expect(formData.get("subcategory:sub1:active")).toBe("on");
  });

  test("the nested create-subcategory form submits independently of the bulk save form", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    const addButton = screen.getAllByRole("button", { name: "Add" })[0];
    const createForm = within(addButton.closest("form")!);
    fireEvent.change(createForm.getByLabelText("New name"), {
      target: { value: "Equipment" },
    });
    fireEvent.change(createForm.getByLabelText("Department"), {
      target: { value: "dep2" },
    });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("createSubcategory");
    expect(formData.get("categoryId")).toBe("cat1");
    expect(formData.get("name")).toBe("Equipment");
    expect(formData.get("departmentId")).toBe("dep2");
  });

  test("shows a message returned from the bulk save action", async () => {
    saveMetadataMock.mockResolvedValueOnce({ error: "Nothing to save." });
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nothing to save.",
    );
  });
});
