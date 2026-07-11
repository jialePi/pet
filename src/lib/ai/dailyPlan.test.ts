import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../../types/domain";
import type { AiDailyPlanResponse } from "./dailyPlan";
import { normalizeDailyPlanResponse } from "./dailyPlan";

const spinach: InventoryItem = {
  id: "spinach",
  name: "Spinach",
  category: "produce",
  quantity: 1,
  unit: "bag",
  storageLocation: "fridge",
  purchaseDate: "2026-07-08",
  suggestedUseByDate: "2026-07-12",
  source: "manual",
  confidence: { name: 1, category: 1, quantity: 1, suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

const milk: InventoryItem = {
  ...spinach,
  id: "milk",
  name: "Milk",
  category: "dairy",
  quantity: 3,
  unit: "l",
};

const response: AiDailyPlanResponse = {
  petLine: "Let's cook the urgent items.",
  planSummary: "Use spinach and milk first.",
  recipes: [
    {
      id: "recipe-1",
      title: "Spinach eggs",
      usesItemIds: ["spinach", "missing"],
      timeMinutes: 12.4,
      steps: ["Wash spinach.", "Cook with eggs."],
      expectedLeftovers: "Milk remains for breakfast.",
    },
  ],
  usageTasks: [
    {
      id: "task-1",
      itemId: "milk",
      itemName: "Wrong model name",
      actionLabel: "Use milk",
      quantity: 10,
      unit: "item",
      note: "Use in sauce.",
    },
    {
      id: "task-missing",
      itemId: "missing",
      itemName: "Missing",
      actionLabel: "Use missing",
      quantity: 1,
      unit: "item",
      note: "Should be removed.",
    },
  ],
  provider: "google",
  model: "gemini",
};

describe("daily plan normalization", () => {
  it("keeps only real inventory ids and caps task quantity", () => {
    const normalized = normalizeDailyPlanResponse(response, [spinach, milk]);

    expect(normalized.recipes[0].usesItemIds).toEqual(["spinach"]);
    expect(normalized.recipes[0].timeMinutes).toBe(12);
    expect(normalized.usageTasks).toHaveLength(1);
    expect(normalized.usageTasks[0]).toEqual(
      expect.objectContaining({
        itemId: "milk",
        itemName: "Milk",
        quantity: 3,
        unit: "l",
      }),
    );
  });
});
