import type {
  FoodCategory,
  InventoryItem,
  InventoryItemDraft,
  PurchaseGuardResult,
  QuantityUnit,
} from "../../types/domain";
import { getRiskLevel } from "../planning/planning";

const highRiskCategories = new Set<FoodCategory>([
  "produce",
  "dairy",
  "meat",
  "seafood",
  "prepared",
]);

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(fresh|organic|org|large|small)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameFoodName(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export type ShoppingPlanDecision = "skip" | "reduce" | "check" | "ok";

export type ShoppingPlanReviewItem = {
  id: string;
  draft: InventoryItemDraft;
  decision: ShoppingPlanDecision;
  existingItemIds: string[];
  message: string;
  petLine: string;
  nextStep: string;
};

export function evaluatePurchaseGuard(input: {
  draft: InventoryItemDraft;
  activeItems: InventoryItem[];
}): PurchaseGuardResult {
  const duplicateItems = input.activeItems.filter((item) =>
    isSameFoodName(item.name, input.draft.name),
  );
  const duplicateQuantity =
    duplicateItems.reduce((total, item) => total + item.quantity, 0) +
    input.draft.quantity;

  if (duplicateItems.length > 0 && duplicateQuantity >= 2) {
    const first = duplicateItems[0];
    return {
      blocked: true,
      reasonCode: "DUPLICATE_ACTIVE_ITEM",
      existingItemIds: duplicateItems.map((item) => item.id),
      suggestedAction:
        first.category === "meat" || first.category === "seafood"
          ? "freeze_existing"
          : "use_existing",
      message: `Hold on. We already have ${duplicateItems
        .map((item) => `${item.quantity} ${item.unit} ${item.name}`)
        .join(", ")} in inventory. Try using or freezing what we have before adding more.`,
    };
  }

  if (highRiskCategories.has(input.draft.category)) {
    const sameCategoryItems = input.activeItems.filter(
      (item) => item.category === input.draft.category,
    );
    const categoryQuantity =
      sameCategoryItems.reduce((total, item) => total + item.quantity, 0) +
      input.draft.quantity;
    if (sameCategoryItems.length >= 3 || categoryQuantity >= 8) {
      return {
        blocked: true,
        reasonCode: "TOO_MUCH_HIGH_RISK_CATEGORY",
        existingItemIds: sameCategoryItems.map((item) => item.id),
        suggestedAction: "review_inventory",
        message: `Wait a second. We already have several ${input.draft.category} items waiting. Review the inventory before adding more.`,
      };
    }
  }

  return { blocked: false };
}

export function reviewShoppingPlan(input: {
  text: string;
  activeItems: InventoryItem[];
  today: string;
}): ShoppingPlanReviewItem[] {
  return parseShoppingLines(input.text, input.today).map((draft, index) => {
    const guard = evaluatePurchaseGuard({ draft, activeItems: input.activeItems });
    const duplicateItems = input.activeItems.filter((item) =>
      isSameFoodName(item.name, draft.name),
    );

    if (guard.blocked && guard.reasonCode === "DUPLICATE_ACTIVE_ITEM") {
      const urgentDuplicate = duplicateItems.find((item) =>
        ["past_suggested_date", "use_today"].includes(getRiskLevel(item, input.today)),
      );
      return {
        id: `shopping-${index}-${normalizeName(draft.name)}`,
        draft,
        decision: draft.quantity > 1 ? "reduce" : "skip",
        existingItemIds: guard.existingItemIds,
        message: urgentDuplicate
          ? `Pause. You already have ${urgentDuplicate.name} marked for use today. Skip this purchase or check the fridge first.`
          : guard.message,
        petLine: urgentDuplicate
          ? `Pause on ${draft.name}. We already have ${urgentDuplicate.name} at the waste-risk moment.`
          : `Pause on ${draft.name}. We already have it, so this is the easiest waste to prevent.`,
        nextStep:
          draft.quantity > 1
            ? "Default: reduce the amount. Override only if you know the existing food is not enough."
            : "Default: skip this purchase. Override only if you checked and still need it.",
      };
    }

    if (guard.blocked) {
      return {
        id: `shopping-${index}-${normalizeName(draft.name)}`,
        draft,
        decision: "check",
        existingItemIds: guard.existingItemIds,
        message: guard.message,
        petLine: `Let's check before buying more ${draft.category}. This is where overbuying becomes waste.`,
        nextStep: "Default: check inventory first, then buy only what you will use soon.",
      };
    }

    if (duplicateItems.length > 0) {
      return {
        id: `shopping-${index}-${normalizeName(draft.name)}`,
        draft,
        decision: "check",
        existingItemIds: duplicateItems.map((item) => item.id),
        message: `You may already have ${duplicateItems
          .map((item) => `${item.quantity} ${item.unit} ${item.name}`)
          .join(", ")}.`,
        petLine: `I am not blocking ${draft.name}, but a quick fridge check can prevent a duplicate buy.`,
        nextStep: "Default: check whether the existing item is opened, almost gone, or still enough.",
      };
    }

    return {
      id: `shopping-${index}-${normalizeName(draft.name)}`,
      draft,
      decision: "ok",
      existingItemIds: [],
      message: `${draft.name} does not look like a duplicate against current inventory.`,
      petLine: `Looks okay if ${draft.name} fits today's plan.`,
      nextStep: highRiskCategories.has(draft.category)
        ? "Default: buy only what you can use in the next few days."
        : "Add it if it is part of the planned shop.",
    };
  });
}

function parseShoppingLines(text: string, today: string): InventoryItemDraft[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseShoppingLine(line, today));
}

function parseShoppingLine(line: string, today: string): InventoryItemDraft {
  const quantityMatch = line.match(/^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
  const rawUnit = quantityMatch?.[2]?.toLowerCase();
  const name = (quantityMatch ? quantityMatch[3] : line).trim();
  const unit = toUnit(rawUnit);
  const category = guessCategory(name);

  return {
    name,
    category,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
    storageLocation: category === "pantry" ? "pantry" : "fridge",
    purchaseDate: today,
    suggestedUseByDate: today,
    notes: "Planned purchase checked by pet guard.",
  };
}

function toUnit(value: string | undefined): QuantityUnit {
  if (!value) return "item";
  if (["bag", "bags"].includes(value)) return "bag";
  if (["box", "boxes"].includes(value)) return "box";
  if (["bottle", "bottles"].includes(value)) return "bottle";
  if (["can", "cans"].includes(value)) return "can";
  if (["g", "gram", "grams"].includes(value)) return "g";
  if (["kg", "kilo", "kilos"].includes(value)) return "kg";
  if (["ml"].includes(value)) return "ml";
  if (["l", "liter", "liters", "litre", "litres"].includes(value)) return "l";
  if (["serving", "servings"].includes(value)) return "serving";
  return "item";
}

function guessCategory(name: string): FoodCategory {
  const normalized = normalizeName(name);
  if (/\b(spinach|lettuce|salad|banana|apple|tomato|berry|berries|carrot|broccoli|avocado)\b/.test(normalized)) {
    return "produce";
  }
  if (/\b(milk|yogurt|yoghurt|cheese|cream|ice cream|butter)\b/.test(normalized)) {
    return "dairy";
  }
  if (/\b(chicken|beef|pork|meat|turkey|ham)\b/.test(normalized)) {
    return "meat";
  }
  if (/\b(fish|salmon|tuna|shrimp|prawn|seafood)\b/.test(normalized)) {
    return "seafood";
  }
  if (/\b(bread|bagel|muffin|cake|croissant|bakery)\b/.test(normalized)) {
    return "bakery";
  }
  if (/\b(rice|pasta|noodle|cereal|sauce|oil|flour|sugar|beans)\b/.test(normalized)) {
    return "pantry";
  }
  if (/\b(frozen)\b/.test(normalized)) {
    return "frozen";
  }
  if (/\b(leftover|meal|pizza|soup|prepared)\b/.test(normalized)) {
    return "prepared";
  }
  if (/\b(juice|drink|soda|water|tea|coffee)\b/.test(normalized)) {
    return "beverage";
  }
  return "other";
}
