import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Topbar } from "./Topbar";

describe("Topbar", () => {
  it("shows the demo date and exposes day controls", async () => {
    const user = userEvent.setup();
    const onNextDay = vi.fn();
    const onResetToday = vi.fn();

    render(
      <Topbar
        view="dashboard"
        today="2026-07-10"
        onNavigate={vi.fn()}
        onNextDay={onNextDay}
        onResetToday={onResetToday}
      />,
    );

    expect(screen.getByText("2026-07-10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next day" }));
    await user.click(screen.getByRole("button", { name: "Reset to real today" }));

    expect(onNextDay).toHaveBeenCalledTimes(1);
    expect(onResetToday).toHaveBeenCalledTimes(1);
  });
});
