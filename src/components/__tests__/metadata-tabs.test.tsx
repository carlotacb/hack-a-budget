import { describe, expect, test, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MetadataTabs } from "@/components/metadata-tabs";

afterEach(() => {
  cleanup();
});

describe("MetadataTabs", () => {
  test("shows the travel panel by default", () => {
    render(
      <MetadataTabs
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
      />,
    );

    expect(screen.getByText("Travel content")).toBeInTheDocument();
    expect(screen.queryByText("Expenses content")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Departments content"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Travel" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("switches to the expenses panel on click", () => {
    render(
      <MetadataTabs
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Expenses" }));

    expect(screen.getByText("Expenses content")).toBeInTheDocument();
    expect(screen.queryByText("Travel content")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Expenses" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Travel" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("switches to the departments panel on click", () => {
    render(
      <MetadataTabs
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Departments" }));

    expect(screen.getByText("Departments content")).toBeInTheDocument();
    expect(screen.queryByText("Travel content")).not.toBeInTheDocument();
    expect(screen.queryByText("Expenses content")).not.toBeInTheDocument();
  });
});
