import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dashboard, MissionCardView } from "./Dashboard";
import type { InventoryItem, MissionCard, PetState } from "../../types/domain";

const item: InventoryItem = {
  id: "spinach",
  name: "Spinach",
  category: "produce",
  quantity: 1,
  unit: "bag",
  storageLocation: "fridge",
  purchaseDate: "2026-07-08",
  suggestedUseByDate: "2026-07-11",
  source: "manual",
  confidence: { name: 1, category: 1, suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

const mission: MissionCard = {
  id: "mission-spinach",
  planItemId: "plan-spinach",
  itemId: "spinach",
  phaseLabel: "Waste blocker",
  title: "Rescue Spinach",
  itemName: "Spinach",
  reason: "Spinach is a higher-priority produce item.",
  suggestedAction: "Use it in a simple meal today.",
  rewardPreview: "Pet mood +6",
  urgencyLabel: "Today",
  primaryActionLabel: "Used some",
  primaryActionType: "partially_used",
  secondaryActionLabel: "No time: freeze",
  secondaryActionType: "frozen",
};

const pet: PetState = {
  id: "pet-main",
  health: 70,
  mood: 70,
  energy: 60,
  trust: 50,
  streakDays: 0,
  stage: "baby",
  visualState: "hungry",
  lastUpdatedAt: "2026-07-10T00:00:00.000Z",
};

describe("MissionCardView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls partial usage from the primary button", async () => {
    const user = userEvent.setup();
    const onRecordAction = vi.fn();

    render(
      <MissionCardView
        mission={mission}
        item={item}
        onRecordAction={onRecordAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Used some" }));

    expect(onRecordAction).toHaveBeenCalledWith(
      item,
      "partially_used",
      1,
      "Lightweight check-in: used some, not exact tracking.",
    );
  });

  it("calls frozen action from the secondary button", async () => {
    const user = userEvent.setup();
    const onRecordAction = vi.fn();

    render(
      <MissionCardView
        mission={mission}
        item={item}
        onRecordAction={onRecordAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "No time: freeze" }));

    expect(onRecordAction).toHaveBeenCalledWith(
      item,
      "frozen",
      undefined,
      "Fallback rescue: no time to cook, so frozen.",
    );
  });

  it("records checked missions without consuming inventory", async () => {
    const user = userEvent.setup();
    const onRecordAction = vi.fn();

    render(
      <MissionCardView
        mission={{
          ...mission,
          primaryActionLabel: "Checked",
          primaryActionType: "checked",
          secondaryActionLabel: undefined,
          secondaryActionType: undefined,
        }}
        item={item}
        onRecordAction={onRecordAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Checked" }));

    expect(onRecordAction).toHaveBeenCalledWith(
      item,
      "checked",
      undefined,
      "Checked quality/date; inventory remains active.",
    );
  });

  it("does not offer freeze at the same time as a check-first mission", () => {
    render(
      <MissionCardView
        mission={{
          ...mission,
          title: "Check Spinach",
          suggestedAction: "Check smell, appearance, packaging, and storage before deciding.",
          primaryActionLabel: "Checked",
          primaryActionType: "checked",
          secondaryActionLabel: undefined,
          secondaryActionType: undefined,
        }}
        item={item}
        onRecordAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Checked" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No time: freeze" })).not.toBeInTheDocument();
    expect(screen.getByText(/Check does not finish the rescue/)).toBeInTheDocument();
  });
});

describe("Dashboard pet interactions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a shopping guard hint from the pet", async () => {
    const user = userEvent.setup();

    render(
      <Dashboard
        items={[item]}
        availableItems={[item]}
        missions={[mission]}
        pet={pet}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    await user.click(
      within(screen.getByLabelText("Pet interaction choices")).getByRole("button", {
        name: "Shopping check",
      }),
    );

    expect(screen.getByText(/Before shopping, rescue Spinach/)).toBeInTheDocument();
    expect(screen.getByText(/I will ask you to pause/)).toBeInTheDocument();
  });

  it("shows the pet mood by default and removes the mood action button", () => {
    render(
      <Dashboard
        items={[item]}
        availableItems={[item]}
        missions={[mission]}
        pet={pet}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    expect(
      screen.getByText("The pet is pointing at today's most waste-risky food."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mood check" })).not.toBeInTheDocument();
  });

  it("shows a local rescue plan when remote AI is unavailable", async () => {
    const user = userEvent.setup();

    render(
      <Dashboard
        items={[item]}
        availableItems={[item]}
        missions={[mission]}
        pet={pet}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rescue plan" }));

    expect(await screen.findByText("Quick Spinach rescue bowl")).toBeInTheDocument();
    expect(screen.getByText("Rule daily plan")).toBeInTheDocument();
    expect(screen.getByText("Use 1 bag Spinach")).toBeInTheDocument();
  });

  it("walks through local recipe steps before submitting usage tasks", async () => {
    const user = userEvent.setup();
    const onRecordAction = vi.fn();

    render(
      <Dashboard
        items={[item]}
        availableItems={[item]}
        missions={[mission]}
        pet={pet}
        today="2026-07-10"
        onRecordAction={onRecordAction}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rescue plan" }));

    expect(await screen.findByText("0%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit rescue" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Check quality/ }));
    await user.click(screen.getByRole("button", { name: /Prepare Spinach/ }));
    await user.click(screen.getByRole("button", { name: /Combine with a pantry base/ }));
    await user.click(screen.getByRole("button", { name: "Submit rescue" }));

    expect(onRecordAction).toHaveBeenCalledWith(
      item,
      "used",
      undefined,
      "Rule-based task. Adjust the item manually if you used a different amount.",
    );
  });

  it("shows a paused inventory state when only frozen food remains", () => {
    const frozenItem: InventoryItem = {
      ...item,
      status: "frozen",
      storageLocation: "freezer",
    };

    render(
      <Dashboard
        items={[frozenItem]}
        availableItems={[frozenItem]}
        missions={[]}
        pet={{ ...pet, visualState: "calm" }}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    expect(screen.getByText("No urgent rescue right now")).toBeInTheDocument();
    expect(screen.getByText(/1 frozen item is parked in inventory/)).toBeInTheDocument();
  });

  it("syncs an AI daily plan when a mission action freezes the planned item", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <Dashboard
        items={[item]}
        availableItems={[item]}
        missions={[mission]}
        pet={pet}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rescue plan" }));

    expect(await screen.findByText("Use 1 bag Spinach")).toBeInTheDocument();

    const frozenItem: InventoryItem = {
      ...item,
      status: "frozen",
      storageLocation: "freezer",
    };
    rerender(
      <Dashboard
        items={[frozenItem]}
        availableItems={[frozenItem]}
        missions={[]}
        pet={{ ...pet, visualState: "calm" }}
        today="2026-07-10"
        onRecordAction={vi.fn()}
        onNavigate={vi.fn()}
        onResetDemo={vi.fn()}
      />,
    );

    expect(await screen.findByText("Inventory changed, so I synced the AI plan.")).toBeInTheDocument();
    expect(screen.queryByText("Use 1 bag Spinach")).not.toBeInTheDocument();
    expect(screen.getByText("All AI tasks from this plan are submitted.")).toBeInTheDocument();
  });
});
