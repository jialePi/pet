import type {
  FoodActionType,
  PetReactionMode,
  PurchaseDecisionType,
} from "../../types/domain";

export type PetReactionIntent = {
  mode: PetReactionMode;
  label: string;
};

export function reactionIntentForAction(
  type: FoodActionType,
  itemName: string,
): PetReactionIntent {
  const reactions: Record<FoodActionType, [PetReactionMode, string]> = {
    used: ["jump", `${itemName} was rescued. Koko celebrates!`],
    partially_used: ["wave", `${itemName} is moving in the right direction.`],
    frozen: ["waiting", `${itemName} is safely parked for later.`],
    shared: ["wave", `${itemName} found another table. Koko is happy.`],
    discarded: ["sad", `${itemName} was discarded. Koko feels the loss.`],
    checked: ["review", `Koko is checking ${itemName} with you.`],
    date_adjusted: ["review", `Koko is watching the new date for ${itemName}.`],
    quantity_adjusted: ["review", `Koko noticed the quantity change for ${itemName}.`],
  };
  const [mode, label] = reactions[type];
  return { mode, label };
}

export function reactionIntentForPurchaseDecision(
  decision: PurchaseDecisionType,
  itemName: string,
): PetReactionIntent {
  const reactions: Record<PurchaseDecisionType, [PetReactionMode, string]> = {
    skipped_duplicate: ["jump", `${itemName} was already here. Koko cheers for avoiding waste.`],
    reduced_quantity: ["wave", `A smaller ${itemName} shop keeps Koko happy.`],
    checked_inventory: ["review", `Koko is checking the pantry before ${itemName}.`],
    bought_anyway: ["sad", `${itemName} came home anyway. Koko is worried about waste.`],
    approved: ["wave", `${itemName} fits the plan. Koko approves.`],
  };
  const [mode, label] = reactions[decision];
  return { mode, label };
}
