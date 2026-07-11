import type {
  FoodAction,
  ImpactMetrics,
  InventoryItem,
  PetState,
  PurchaseDecisionEvent,
} from "../../types/domain";

export function calculateImpact(input: {
  items: InventoryItem[];
  actions: FoodAction[];
  purchaseDecisions?: PurchaseDecisionEvent[];
  pet: PetState;
}): ImpactMetrics {
  const savedActions = input.actions.filter((action) =>
    ["used", "partially_used"].includes(action.type),
  );
  const frozenActions = input.actions.filter((action) => action.type === "frozen");
  const sharedActions = input.actions.filter((action) => action.type === "shared");
  const discardedActions = input.actions.filter((action) => action.type === "discarded");
  const purchaseDecisions = input.purchaseDecisions ?? [];
  const avoidedDecisions = purchaseDecisions.filter((event) =>
    ["skipped_duplicate", "reduced_quantity"].includes(event.decision),
  );
  const checkDecisions = purchaseDecisions.filter(
    (event) => event.decision === "checked_inventory",
  );
  const buyAnywayDecisions = purchaseDecisions.filter(
    (event) => event.decision === "bought_anyway",
  );

  return {
    savedItemCount: savedActions.length,
    discardedItemCount: discardedActions.length,
    frozenItemCount: frozenActions.length,
    sharedItemCount: sharedActions.length,
    duplicatePurchaseAvoidedCount: avoidedDecisions.length,
    buyAnywayCount: buyAnywayDecisions.length,
    shoppingCheckCount: purchaseDecisions.length,
    estimatedSavedWeightGrams:
      savedActions.length * 250 +
      frozenActions.length * 200 +
      avoidedDecisions.length * 300 +
      checkDecisions.length * 100,
    streakDays: input.pet.streakDays,
  };
}
