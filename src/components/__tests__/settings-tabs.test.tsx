import { describe, expect, test, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SettingsTabs } from "@/components/settings-tabs";

afterEach(() => {
  cleanup();
});

describe("SettingsTabs", () => {
  test("shows the features panel by default", () => {
    render(
      <SettingsTabs
        features={<p>Features content</p>}
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
        roles={<p>Roles content</p>}
      />,
    );

    expect(screen.getByText("Features content")).toBeInTheDocument();
    expect(screen.queryByText("Travel content")).not.toBeInTheDocument();
    expect(screen.queryByText("Expenses content")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Departments content"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Features" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("switches to the travel panel on click", () => {
    render(
      <SettingsTabs
        features={<p>Features content</p>}
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
        roles={<p>Roles content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Travel" }));

    expect(screen.getByText("Travel content")).toBeInTheDocument();
    expect(screen.queryByText("Features content")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Travel" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Features" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("switches to the expenses panel on click", () => {
    render(
      <SettingsTabs
        features={<p>Features content</p>}
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
        roles={<p>Roles content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Expense - categories" }));

    expect(screen.getByText("Expenses content")).toBeInTheDocument();
    expect(screen.queryByText("Features content")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Expense - categories" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("switches to the departments panel on click", () => {
    render(
      <SettingsTabs
        features={<p>Features content</p>}
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
        roles={<p>Roles content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Departments" }));

    expect(screen.getByText("Departments content")).toBeInTheDocument();
    expect(screen.queryByText("Features content")).not.toBeInTheDocument();
    expect(screen.queryByText("Expenses content")).not.toBeInTheDocument();
  });

  test("switches to the roles panel on click", () => {
    render(
      <SettingsTabs
        features={<p>Features content</p>}
        travel={<p>Travel content</p>}
        expenses={<p>Expenses content</p>}
        departments={<p>Departments content</p>}
        roles={<p>Roles content</p>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));

    expect(screen.getByText("Roles content")).toBeInTheDocument();
    expect(screen.queryByText("Features content")).not.toBeInTheDocument();
  });
});
