import { beforeEach, describe, expect, it } from "vitest";
import type { InventoryItemDraft } from "../../types/domain";
import { demoItems, demoPet } from "../../data/demoData";
import { usePetStore } from "./usePetStore";

const manualDraft: InventoryItemDraft = {
  name: "Test milk",
  category: "dairy",
  quantity: 1,
  unit: "l",
  storageLocation: "fridge",
  purchaseDate: "2026-07-11",
  suggestedUseByDate: "2026-07-12",
};

describe("usePetStore state transitions", () => {
  beforeEach(() => {
    usePetStore.getState().resetDemo();
  });

  it("adds an item without claiming a pet score that did not happen", () => {
    const startTrust = usePetStore.getState().pet.trust;

    usePetStore.getState().addManualItem(manualDraft);

    const state = usePetStore.getState();
    expect(state.items[0].name).toBe("Test milk");
    expect(state.pet.trust).toBe(startTrust);
    expect(state.lastToast).toBe("Test milk added for planning.");
  });

  it("upgrades partial use to used when the action consumes the remainder", () => {
    const item = demoItems.find((candidate) => candidate.id === "item-spinach");
    if (!item) throw new Error("Missing demo spinach item.");

    usePetStore
      .getState()
      .recordAction(item, "partially_used", item.quantity, "Used all from mission.", "2026-07-11");

    const state = usePetStore.getState();
    const updatedItem = state.items.find((candidate) => candidate.id === item.id);
    expect(updatedItem?.status).toBe("used");
    expect(updatedItem?.quantity).toBe(0);
    expect(state.actions[0]).toMatchObject({
      itemId: item.id,
      type: "used",
      quantity: item.quantity,
    });
    expect(state.pet.health).toBe(demoPet.health + 10);
    expect(state.lastToast).toContain("Spinach rescued. Pet health +10");
  });

  it("records inventory date and quantity edits as scoring actions", () => {
    const item = demoItems.find((candidate) => candidate.id === "item-spinach");
    if (!item) throw new Error("Missing demo spinach item.");

    usePetStore.getState().updateInventoryItem(
      item,
      {
        quantity: item.quantity + 1,
        suggestedUseByDate: "2026-07-13",
      },
      "2026-07-11",
    );

    const state = usePetStore.getState();
    expect(state.actions.map((action) => action.type).slice(0, 2)).toEqual([
      "date_adjusted",
      "quantity_adjusted",
    ]);
    expect(state.pet.trust).toBe(demoPet.trust + 5);
    expect(state.pet.mood).toBe(demoPet.mood + 2);
  });

  it("shows a negative score toast when food is discarded", () => {
    const item = demoItems.find((candidate) => candidate.id === "item-spinach");
    if (!item) throw new Error("Missing demo spinach item.");

    usePetStore.getState().recordAction(item, "discarded", undefined, "Unsafe to eat.", "2026-07-11");

    const state = usePetStore.getState();
    expect(state.items.find((candidate) => candidate.id === item.id)?.status).toBe("discarded");
    expect(state.actions[0]).toMatchObject({
      itemId: item.id,
      type: "discarded",
    });
    expect(state.lastToast).toBe("Spinach discarded. Pet mood -12");
  });

  it("shows a negative score toast when a guarded purchase is bought anyway", () => {
    usePetStore.getState().recordPurchaseDecision(
      {
        itemName: "Spinach",
        decision: "bought_anyway",
        reason: "Override duplicate warning.",
      },
      "2026-07-11",
    );

    const state = usePetStore.getState();
    expect(state.purchaseDecisions[0].decision).toBe("bought_anyway");
    expect(state.lastToast).toBe("Spinach bought anyway. Pet mood -3");
  });
});
