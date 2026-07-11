import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Toast } from "./Toast";

describe("Toast reward feedback", () => {
  it("shows a pet score increase and dismisses after three seconds", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<Toast message="Spinach rescued. Pet health +10" onDismiss={onDismiss} />);

    expect(screen.getByText("Koko score increased")).toBeInTheDocument();
    expect(screen.getByText("health")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows a pet score decrease", () => {
    const onDismiss = vi.fn();

    render(<Toast message="Bananas discarded. Pet mood -12" onDismiss={onDismiss} />);

    expect(screen.getByText("Koko score decreased")).toBeInTheDocument();
    expect(screen.getByText("mood")).toBeInTheDocument();
    expect(screen.getByText("-12")).toBeInTheDocument();
    expect(screen.getByText("Bananas discarded.")).toBeInTheDocument();
  });
});
