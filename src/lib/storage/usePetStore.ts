import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FoodAction,
  FoodActionType,
  InventoryItem,
  InventoryItemDraft,
  IsoDate,
  PetState,
  PetReaction,
  PurchaseDecisionEvent,
  PurchaseDecisionType,
} from "../../types/domain";
import { demoActions, demoItems, demoPet } from "../../data/demoData";
import {
  applyPetEffect,
  calculatePetState,
  describeActionReward,
  purchaseDecisionEffects,
} from "../pet-state/petState";
import { todayIso } from "../dates/dates";
import { applyInventoryAction } from "./inventoryUsage";
import {
  reactionIntentForAction,
  reactionIntentForPurchaseDecision,
} from "../pet-state/petReactions";

type PetStore = {
  items: InventoryItem[];
  actions: FoodAction[];
  purchaseDecisions: PurchaseDecisionEvent[];
  pet: PetState;
  petReaction: PetReaction;
  lastToast?: string;
  addManualItem: (draft: InventoryItemDraft) => void;
  updateInventoryItem: (
    item: InventoryItem,
    patch: Partial<InventoryItemDraft>,
    today?: IsoDate,
  ) => void;
  recordAction: (
    item: InventoryItem,
    type: FoodActionType,
    quantity?: number,
    note?: string,
    today?: IsoDate,
  ) => void;
  recordPurchaseDecision: (
    input: {
      itemName: string;
      decision: PurchaseDecisionType;
      reason: string;
    },
    today?: IsoDate,
  ) => void;
  recalculatePet: (today?: IsoDate) => void;
  resetDemo: () => void;
  clearAll: () => void;
  dismissToast: () => void;
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function actionOccurredAt(today: IsoDate): string {
  const now = new Date();
  const time = now.toISOString().slice(11);
  return `${today}T${time}`;
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

function createPetReaction(mode: PetReaction["mode"], label: string): PetReaction {
  return { id: createId("reaction"), mode, label, durationMs: 2200 };
}

export const usePetStore = create<PetStore>()(
  persist(
    (set, get) => ({
      items: demoItems,
      actions: demoActions,
      purchaseDecisions: [],
      pet: demoPet,
      petReaction: createPetReaction("waiting", "Koko is ready to help with today's rescue."),
      addManualItem: (draft) => {
        const item = toInventoryItem(draft);
        const nextItems = [item, ...get().items];
        set({
          items: nextItems,
          pet: get().pet,
          petReaction: createPetReaction("wave", `${item.name} added. Koko is ready to plan it.`),
          lastToast: `${item.name} added for planning.`,
        });
      },
      updateInventoryItem: (item, patch, today = todayIso()) => {
        const now = new Date().toISOString();
        const adjustmentActions: FoodAction[] = [];
        if (
          patch.suggestedUseByDate !== undefined &&
          patch.suggestedUseByDate !== item.suggestedUseByDate
        ) {
          adjustmentActions.push({
            id: createId("action"),
            itemId: item.id,
            type: "date_adjusted",
            quantity: item.quantity,
            unit: item.unit,
            occurredAt: actionOccurredAt(today),
            note: "Suggested use date adjusted from inventory editor.",
          });
        }
        if (
          patch.quantity !== undefined &&
          Number(patch.quantity) !== item.quantity
        ) {
          adjustmentActions.push({
            id: createId("action"),
            itemId: item.id,
            type: "quantity_adjusted",
            quantity: Number(patch.quantity),
            unit: item.unit,
            occurredAt: actionOccurredAt(today),
            note: "Quantity adjusted from inventory editor.",
          });
        }
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
        const nextActions = [...adjustmentActions, ...get().actions];
        set({
          items: nextItems,
          actions: nextActions,
          pet: calculatePetState({
            current: get().pet,
            items: nextItems,
            actions: nextActions,
            today,
          }),
          petReaction: createPetReaction("review", `${patch.name ?? item.name} updated. Koko is watching the change.`),
          lastToast: `${patch.name ?? item.name} updated.`,
        });
      },
      recordAction: (item, type, quantity, note, today = todayIso()) => {
        const usage = applyInventoryAction(item, type, quantity);
        const effectiveType =
          type === "partially_used" && usage.item.status === "used" ? "used" : type;
        const action: FoodAction = {
          id: createId("action"),
          itemId: item.id,
          type: effectiveType,
          quantity: usage.actionQuantity,
          unit: item.unit,
          occurredAt: actionOccurredAt(today),
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
          today,
        });
        const label =
          effectiveType === "partially_used"
            ? `${item.name} check-in saved. ${describeActionReward(effectiveType)}`
            : effectiveType === "used"
              ? `${item.name} rescued. ${describeActionReward(effectiveType)}`
              : effectiveType === "frozen"
                ? `${item.name} frozen. ${describeActionReward(effectiveType)}`
                : effectiveType === "shared"
                  ? `${item.name} shared. ${describeActionReward(effectiveType)}`
                  : effectiveType === "checked"
                    ? `${item.name} checked. ${describeActionReward(effectiveType)}`
                    : `${item.name} discarded. Pet mood -12`;
        const reaction = reactionIntentForAction(effectiveType, item.name);
        set({
          items: nextItems,
          actions: nextActions,
          pet: nextPet,
          petReaction: createPetReaction(reaction.mode, reaction.label),
          lastToast: label,
        });
      },
      recordPurchaseDecision: (input, today = todayIso()) => {
        const decision: PurchaseDecisionEvent = {
          id: createId("purchase"),
          itemName: input.itemName,
          decision: input.decision,
          reason: input.reason,
          occurredAt: actionOccurredAt(today),
        };
        const currentDecisions = get().purchaseDecisions ?? [];
        const nextPet = applyPetEffect(
          get().pet,
          purchaseDecisionEffects[input.decision],
        );
        const label =
          input.decision === "skipped_duplicate"
            ? `${input.itemName} skipped. Duplicate purchase avoided. Pet trust +6`
            : input.decision === "reduced_quantity"
              ? `${input.itemName} reduced. Pet trust +5`
              : input.decision === "checked_inventory"
                ? `${input.itemName} flagged for fridge check. Pet trust +3`
                : input.decision === "bought_anyway"
                  ? `${input.itemName} bought anyway. Pet mood -3`
                  : `${input.itemName} approved for planned shop.`;
        const reaction = reactionIntentForPurchaseDecision(input.decision, input.itemName);
        set({
          purchaseDecisions: [decision, ...currentDecisions],
          pet: nextPet,
          petReaction: createPetReaction(reaction.mode, reaction.label),
          lastToast: label,
        });
      },
      recalculatePet: (today = todayIso()) => {
        set({
          pet: calculatePetState({
            current: get().pet,
            items: get().items,
            actions: get().actions,
            today,
          }),
        });
      },
      resetDemo: () =>
        set({
          items: demoItems,
          actions: demoActions,
          purchaseDecisions: [],
          pet: demoPet,
          petReaction: createPetReaction("wave", "Demo pantry restored. Koko is ready."),
          lastToast: "Demo pantry restored.",
        }),
      clearAll: () =>
        set({
          items: [],
          actions: [],
          purchaseDecisions: [],
          pet: demoPet,
          petReaction: createPetReaction("waiting", "The pantry is clear. Koko is waiting for a fresh start."),
          lastToast: "Local inventory cleared.",
        }),
      dismissToast: () => set({ lastToast: undefined }),
    }),
    {
      name: "pet-mvp-store",
    },
  ),
);
