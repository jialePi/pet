import { describe, expect, it } from "vitest";
import type { InventoryItem, InventoryItemDraft } from "../../types/domain";
import { evaluatePurchaseGuard } from "./purchaseGuard";

const bananaItem: InventoryItem = {
  id: "banana-1",
  name: "Bananas",
  category: "produce",
  quantity: 6,
  unit: "item",
  storageLocation: "counter",
  purchaseDate: "2026-07-08",
  suggestedUseByDate: "2026-07-12",
  source: "manual",
  confidence: { name: 1, category: 1, suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

const baseDraft: InventoryItemDraft = {
  name: "Apples",
  category: "produce",
  quantity: 1,
  unit: "item",
  storageLocation: "counter",
  purchaseDate: "2026-07-10",
  suggestedUseByDate: "2026-07-15",
};

describe("purchase guard", () => {
  it("blocks duplicate active items", () => {
    const result = evaluatePurchaseGuard({
      draft: { ...baseDraft, name: "banana", quantity: 2 },
      activeItems: [bananaItem],
    });

    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.reasonCode).toBe("DUPLICATE_ACTIVE_ITEM");
      expect(result.existingItemIds).toContain("banana-1");
    }
  });

  it("blocks too many high-risk category items", () => {
    const result = evaluatePurchaseGuard({
      draft: { ...baseDraft, name: "Tomatoes", category: "produce", quantity: 3 },
      activeItems: [
        bananaItem,
        { ...bananaItem, id: "spinach", name: "Spinach", quantity: 1 },
        { ...bananaItem, id: "berries", name: "Berries", quantity: 1 },
      ],
    });

    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.reasonCode).toBe("TOO_MUCH_HIGH_RISK_CATEGORY");
    }
  });

  it("allows safe additions", () => {
    const result = evaluatePurchaseGuard({
      draft: { ...baseDraft, name: "Rice", category: "pantry", quantity: 1 },
      activeItems: [bananaItem],
    });

    expect(result.blocked).toBe(false);
  });
});
