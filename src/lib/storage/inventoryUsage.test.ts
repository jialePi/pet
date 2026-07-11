import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../../types/domain";
import { applyInventoryAction } from "./inventoryUsage";

const milk: InventoryItem = {
  id: "milk",
  name: "Milk",
  category: "dairy",
  quantity: 3,
  unit: "l",
  storageLocation: "fridge",
  purchaseDate: "2026-07-11",
  suggestedUseByDate: "2026-07-14",
  source: "manual",
  confidence: { name: 1, category: 1, quantity: 1, suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
};

describe("inventory usage", () => {
  it("keeps an item active when only part of it is used", () => {
    const result = applyInventoryAction(milk, "partially_used", 1);

    expect(result.actionQuantity).toBe(1);
    expect(result.item.quantity).toBe(2);
    expect(result.item.status).toBe("active");
  });

  it("marks an item used when the requested amount consumes the remainder", () => {
    const result = applyInventoryAction(milk, "partially_used", 3);

    expect(result.actionQuantity).toBe(3);
    expect(result.item.quantity).toBe(0);
    expect(result.item.status).toBe("used");
  });

  it("caps partial usage at the available quantity", () => {
    const result = applyInventoryAction(milk, "partially_used", 10);

    expect(result.actionQuantity).toBe(3);
    expect(result.item.quantity).toBe(0);
    expect(result.item.status).toBe("used");
  });

  it("keeps quantity when an item is frozen", () => {
    const result = applyInventoryAction(milk, "frozen");

    expect(result.actionQuantity).toBe(3);
    expect(result.item.quantity).toBe(3);
    expect(result.item.status).toBe("frozen");
    expect(result.item.storageLocation).toBe("freezer");
  });

  it("keeps an item active when it is only checked", () => {
    const result = applyInventoryAction(milk, "checked");

    expect(result.item.quantity).toBe(3);
    expect(result.item.status).toBe("active");
  });
});
