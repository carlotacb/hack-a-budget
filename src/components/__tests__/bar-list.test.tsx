import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarList } from "@/components/bar-list";

describe("BarList", () => {
  test("shows the empty message when there are no items", () => {
    render(<BarList items={[]} emptyMessage="Nothing here." />);

    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  test("renders labels, values, and bars scaled to the largest value", () => {
    const { container } = render(
      <BarList
        items={[
          { label: "Spain", value: 4 },
          { label: "France", value: 2, barClass: "bg-red-400" },
        ]}
      />,
    );

    expect(screen.getByText("Spain")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>("[role=presentation]");
    expect(bars[0].style.width).toBe("100%");
    expect(bars[1].style.width).toBe("50%");
    expect(bars[1].className).toContain("bg-red-400");
  });
});
