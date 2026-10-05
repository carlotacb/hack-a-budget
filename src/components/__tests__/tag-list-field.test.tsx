import { describe, expect, test, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TagListField } from "@/components/tag-list-field";

afterEach(() => {
  cleanup();
});

function renderField() {
  const { container } = render(
    <form>
      <TagListField
        name="departments"
        label="Departments"
        placeholder="e.g. Logistics"
      />
    </form>,
  );
  const form = container.querySelector("form")!;
  return {
    input: screen.getByLabelText("Departments"),
    values: () => new FormData(form).getAll("departments"),
  };
}

describe("TagListField", () => {
  test("adds trimmed entries with the Add button and Enter key", () => {
    const { input, values } = renderField();

    fireEvent.change(input, { target: { value: "  Logistics " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(values()).toEqual(["Logistics", "Design"]);
    expect(input).toHaveValue("");
  });

  test("ignores blank and duplicate entries", () => {
    const { input, values } = renderField();

    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(values()).toEqual(["Design"]);
    expect(input).toHaveValue("");
  });

  test("does not add on other keys", () => {
    const { input, values } = renderField();

    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.keyDown(input, { key: "a" });

    expect(values()).toEqual([]);
  });

  test("removes an entry", () => {
    const { input, values } = renderField();

    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Remove Design" }));

    expect(values()).toEqual([]);
    expect(screen.queryByText("Design")).not.toBeInTheDocument();
  });
});
