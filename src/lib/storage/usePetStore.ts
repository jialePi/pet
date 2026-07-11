import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FoodAction,
  FoodActionType,
  InventoryItem,
  InventoryItemDraft,
  PetState,
  PurchaseDecisionEvent,
  PurchaseDecisionType,
} from "../../types/domain";
import { demoActions, demoItems, demoPet } from "../../data/demoData";
import { calculatePetState } from "../pet-state/petState";
import { todayIso } from "../dates/dates";
import { applyInventoryAction } from "./inventoryUsage";

type PetStore = {
  items: InventoryItem[];
  actions: FoodAction[];
  purchaseDecisions: PurchaseDecisionEvent[];
  pet: PetState;
  lastToast?: string;
  addManualItem: (draft: InventoryItemDraft) => void;
  updateInventoryItem: (
    item: InventoryItem,
    patch: Partial<InventoryItemDraft>,
  ) => void;
  recordAction: (
    item: InventoryItem,
    type: FoodActionType,
    quantity?: number,
    note?: string,
  ) => void;
  recordPurchaseDecision: (input: {
    itemName: string;
    decision: PurchaseDecisionType;
    reason: string;
  }) => void;
  resetDemo: () => void;
  clearAll: () => void;
  dismissToast: () => void;
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toInventoryItem(draft: InventoryItemDraft): InventoryItem {
  const now = new Date().toISOString();
  return {
    id: createId("item"),
    ...draft,
    source: "manual",
    confidence: {
      name: 1,
      category: 1,
      quantity: 1,
      purchaseDate: draft.purchaseDate ? 1 : undefined,
      suggestedUseByDate: draft.suggestedUseByDate ? 1 : undefined,
      storageLocation: 1,
    },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export const usePetStore = create<PetStore>()(
  persist(
    (set, get) => ({
      items: demoItems,
      actions: demoActions,
      purchaseDecisions: [],
      pet: demoPet,
      addManualItem: (draft) => {
        const item = toInventoryItem(draft);
        const nextItems = [item, ...get().items];
        set({
          items: nextItems,
          pet: calculatePetState({
            current: get().pet,
            items: nextItems,
            actions: get().actions,
            today: todayIso(),
          }),
          lastToast: `${item.name} added. Pet trust +2`,
        });
      },
      updateInventoryItem: (item, patch) => {
        const now = new Date().toISOString();
        const nextItems = get().items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                ...patch,
                updatedAt: now,
                confidence: {
                  ...candidate.confidence,
                  name: patch.name ? 1 : candidate.confidence.name,
                  quantity:
                    patch.quantity !== undefined ? 1 : candidate.confidence.quantity,
                  suggestedUseByDate:
                    patch.suggestedUseByDate !== undefined
                      ? 1
                      : candidate.confidence.suggestedUseByDate,
                  storageLocation:
                    patch.storageLocation !== undefined
                      ? 1
                      : candidate.confidence.storageLocation,
                },
              }
            : candidate,
        );
        set({
          items: nextItems,
          pet: calculatePetState({
            current: get().pet,
            items: nextItems,
            actions: get().actions,
            today: todayIso(),
          }),
          lastToast: `${patch.name ?? item.name} updated.`,
        });
      },
      recordAction: (item, type, quantity, note) => {
        const now = new Date().toISOString();
        const usage = applyInventoryAction(item, type, quantity);
        const action: FoodAction = {
          id: createId("action"),
          itemId: item.id,
          type,
          quantity: usage.actionQuantity,
          unit: item.unit,
          occurredAt: now,
          note,
        };
        const nextItems = get().items.map((candidate) =>
          candidate.id === item.id ? usage.item : candidate,
        );
        const nextActions = [action, ...get().actions];
        const nextPet = calculatePetState({
          current: get().pet,
          items: nextItems,
          actions: nextActions,
          today: todayIso(),
        });
        const label =
          type === "partially_used"
            ? usage.item.status === "used"
              ? `${item.name} finished. Pet health +6`
              : `${item.name} check-in saved. I will keep it on the rescue list.`
            : type === "used"
              ? `${item.name} rescued. Pet health +6`
              : type === "frozen"
              ? `${item.name} frozen. Pet energy +8`
              : type === "shared"
                ? `${item.name} shared. Pet mood +10`
                : `${item.name} recorded. We'll plan earlier next time.`;
        set({
          items: nextItems,
          actions: nextActions,
          pet: nextPet,
          lastToast: label,
        });
      },
      recordPurchaseDecision: (input) => {
        const decision: PurchaseDecisionEvent = {
          id: createId("purchase"),
          itemName: input.itemName,
          decision: input.decision,
          reason: input.reason,
          occurredAt: new Date().toISOString(),
        };
        const currentDecisions = get().purchaseDecisions ?? [];
        const label =
          input.decision === "skipped_duplicate"
            ? `${input.itemName} skipped. Duplicate purchase avoided.`
            : input.decision === "reduced_quantity"
              ? `${input.itemName} reduced. Pet trust +2`
              : input.decision === "checked_inventory"
                ? `${input.itemName} flagged for fridge check.`
                : input.decision === "bought_anyway"
                  ? `${input.itemName} bought anyway. I will track the risk.`
                  : `${input.itemName} approved for planned shop.`;
        set({
          purchaseDecisions: [decision, ...currentDecisions],
          lastToast: label,
        });
      },
      resetDemo: () =>
        set({
          items: demoItems,
          actions: demoActions,
          purchaseDecisions: [],
          pet: demoPet,
          lastToast: "Demo pantry restored.",
        }),
      clearAll: () =>
        set({
          items: [],
          actions: [],
          purchaseDecisions: [],
          pet: demoPet,
          lastToast: "Local inventory cleared.",
        }),
      dismissToast: () => set({ lastToast: undefined }),
    }),
    {
      name: "pet-mvp-store",
    },
  ),
);
