import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../../types/domain";
import { generatePlan, getRiskLevel } from "./planning";

const baseItem: InventoryItem = {
  id: "item-base",
  name: "Base",
  category: "pantry",
  quantity: 1,
  unit: "item",
  storageLocation: "pantry",
  purchaseDate: "2026-07-01",
  suggestedUseByDate: "2026-10-01",
  source: "manual",
  confidence: { suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("planning", () => {
  it("prioritizes urgent produce ahead of stable pantry items", () => {
    const spinach: InventoryItem = {
      ...baseItem,
      id: "spinach",
      name: "Spinach",
      category: "produce",
      storageLocation: "fridge",
      suggestedUseByDate: "2026-07-11",
    };
    const rice: InventoryItem = {
      ...baseItem,
      id: "rice",
      name: "Rice",
      category: "pantry",
      suggestedUseByDate: "2026-10-01",
    };

    const plan = generatePlan({
      items: [rice, spinach],
      actions: [],
      today: "2026-07-10",
    });

    expect(plan.today[0].itemId).toBe("spinach");
    expect(plan.today[0].explanation).toContain("higher-priority");
  });

  it("marks missing or low-confidence dates for review", () => {
    const unknownDate: InventoryItem = {
      ...baseItem,
      id: "unknown",
      name: "Mystery leftovers",
      category: "prepared",
      suggestedUseByDate: undefined,
      confidence: {},
    };

    expect(getRiskLevel(unknownDate, "2026-07-10")).toBe("unknown");
    const plan = generatePlan({
      items: [unknownDate],
      actions: [],
      today: "2026-07-10",
    });

    expect(plan.review).toHaveLength(1);
    expect(plan.review[0].suggestedAction).toBe("add_date");
  });

  it("excludes items already acted on today", () => {
    const plan = generatePlan({
      items: [baseItem],
      actions: [
        {
          id: "action-1",
          itemId: baseItem.id,
          type: "used",
          quantity: 1,
          unit: "item",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(plan.today).toHaveLength(0);
  });

  it("keeps checked items in the plan and moves them to a follow-up action", () => {
    const chicken: InventoryItem = {
      ...baseItem,
      id: "chicken",
      name: "Chicken breast",
      category: "meat",
      storageLocation: "fridge",
      suggestedUseByDate: "2026-07-09",
    };
    const plan = generatePlan({
      items: [chicken],
      actions: [
        {
          id: "action-checked",
          itemId: chicken.id,
          type: "checked",
          quantity: 1,
          unit: "item",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(plan.today).toHaveLength(1);
    expect(plan.today[0].suggestedAction).toBe("freeze");
    expect(plan.today[0].reasonCodes).toContain("CHECKED_TODAY");
    expect(plan.today[0].explanation).toContain("checked");
  });

  it("checks perishable meat before offering freeze as the follow-up decision", () => {
    const chicken: InventoryItem = {
      ...baseItem,
      id: "chicken",
      name: "Chicken breast",
      category: "meat",
      storageLocation: "fridge",
      suggestedUseByDate: "2026-07-11",
    };

    const beforeCheck = generatePlan({
      items: [chicken],
      actions: [],
      today: "2026-07-10",
    });
    const afterCheck = generatePlan({
      items: [chicken],
      actions: [
        {
          id: "action-checked",
          itemId: chicken.id,
          type: "checked",
          quantity: 1,
          unit: "item",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(beforeCheck.today[0].suggestedAction).toBe("check_quality");
    expect(afterCheck.today[0].suggestedAction).toBe("freeze");
  });

  it("does not offer follow-up missions after a terminal rescue action", () => {
    const checkedThenFrozen = generatePlan({
      items: [baseItem],
      actions: [
        {
          id: "action-checked",
          itemId: baseItem.id,
          type: "checked",
          quantity: 1,
          unit: "item",
          occurredAt: "2026-07-10T09:00:00.000Z",
        },
        {
          id: "action-frozen",
          itemId: baseItem.id,
          type: "frozen",
          quantity: 1,
          unit: "item",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(checkedThenFrozen.today).toHaveLength(0);
  });
});
