import { afterEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutoDismiss } from "@/components/use-auto-dismiss";

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoDismiss", () => {
  test("never shows for an empty result", () => {
    const { result } = renderHook(() => useAutoDismiss({}));

    expect(result.current).toBe(false);
  });

  test("shows a message, then hides it after 5 seconds", () => {
    vi.useFakeTimers();
    const state = { success: true };
    const { result } = renderHook(() => useAutoDismiss(state));

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  test("a new result of the same kind shows again", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ state }) => useAutoDismiss(state),
      { initialProps: { state: { error: "Nope" } as { error?: string } } },
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(false);

    rerender({ state: { error: "Nope" } });
    expect(result.current).toBe(true);
  });
});
