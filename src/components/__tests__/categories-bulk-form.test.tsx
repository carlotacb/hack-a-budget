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
    updatedAt: "2026-01-01T00:00:00.000Z",
    subcategories: [
      {
        id: "sub1",
        name: "Space rental",
        active: true,
        departmentId: "dep1",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    id: "cat2",
    name: "Catering",
    active: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
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
  test("renders each category and subcategory row with a single Save button", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    expect(screen.getByDisplayValue("Venue")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Catering")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Space rental")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
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

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nothing to save.",
    );
  });
});

describe("CategoriesBulkForm subcategories section", () => {
  test("the add-subcategory form sits above the subcategory rows", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    const addForm = screen.getAllByLabelText("New name")[0].closest("form")!;
    const firstRow = screen.getByDisplayValue("Space rental");

    expect(
      addForm.compareDocumentPosition(firstRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("Hide collapses the subcategories but keeps their fields submittable", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    const [hideVenue] = screen.getAllByRole("button", { name: "Hide" });
    fireEvent.click(hideVenue);

    const row = screen.getByDisplayValue("Space rental");
    expect(row.closest("[hidden]")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Show" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByDisplayValue("Space rental").closest("[hidden]")).toBeNull();
  });

  test("shows how many subcategories a category has", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    expect(screen.getByText("Subcategories (1)")).toBeInTheDocument();
    expect(screen.getByText("Subcategories (0)")).toBeInTheDocument();
  });

  test("a separator line sits between the add form and the subcategory rows", () => {
    const { container } = render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    const hr = container.querySelector("hr")!;
    const addForm = screen.getAllByLabelText("New name")[0].closest("form")!;
    const firstRow = screen.getByDisplayValue("Space rental");

    expect(addForm.compareDocumentPosition(hr) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(hr.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });
});

describe("CategoriesBulkForm delete buttons", () => {
  test("every category and subcategory has a delete button", () => {
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    expect(screen.getByRole("button", { name: "Delete Venue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Catering" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Space rental" }),
    ).toBeInTheDocument();
  });

  test("deleting a category confirms, then submits deleteCategory with its id", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Venue" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(confirmSpy.mock.calls[0][0]).toContain("subcategories");
    expect(formData.get("operation")).toBe("deleteCategory");
    expect(formData.get("id")).toBe("cat1");
    confirmSpy.mockRestore();
  });

  test("deleting a subcategory submits deleteSubcategory with its id", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Space rental" }));

    await waitFor(() => {
      expect(saveMetadataMock).toHaveBeenCalled();
    });
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("deleteSubcategory");
    expect(formData.get("id")).toBe("sub1");
    confirmSpy.mockRestore();
  });

  test("declining the confirmation deletes nothing", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Venue" }));

    expect(saveMetadataMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("shows a loading overlay while a delete is running", async () => {
    let resolveDelete: (value: object) => void = () => {};
    saveMetadataMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CategoriesBulkForm categories={categories} departments={departments} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Venue" }));

    expect(
      await screen.findByRole("progressbar", { name: "Deleting…" }),
    ).toBeInTheDocument();

    resolveDelete({ success: true });
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  test("shows the Unexpected expenses category as read-only with no delete or active toggle", () => {
    const categoriesWithUnexpected = [
      ...categories,
      {
        id: "cat3",
        name: "Unexpected expenses",
        active: true,
        updatedAt: "2026-01-01T00:00:00.000Z",
        subcategories: [],
      },
    ];
    render(
      <CategoriesBulkForm
        categories={categoriesWithUnexpected}
        departments={departments}
      />,
    );

    expect(screen.getByText("Unexpected expenses")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Delete Unexpected expenses"),
    ).not.toBeInTheDocument();
    const nameInputs = screen.getAllByRole("textbox", { name: "Name" });
    for (const input of nameInputs) {
      expect(input).not.toHaveValue("Unexpected expenses");
    }
  });
});
