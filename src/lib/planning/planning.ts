import type {
  FoodAction,
  FoodCategory,
  InventoryItem,
  PlanItem,
  PlanReasonCode,
  RiskLevel,
  SuggestedAction,
} from "../../types/domain";
import { daysUntil } from "../dates/dates";

type PlanningInput = {
  items: InventoryItem[];
  actions: FoodAction[];
  today: string;
};

type PlanningOutput = {
  today: PlanItem[];
  week: PlanItem[];
  review: PlanItem[];
};

const categoryRisk: Record<FoodCategory, number> = {
  produce: 15,
  dairy: 12,
  meat: 18,
  seafood: 20,
  bakery: 10,
  pantry: 2,
  frozen: 0,
  prepared: 16,
  beverage: 2,
  other: 5,
};

const terminalActionTypes = new Set<FoodAction["type"]>([
  "used",
  "partially_used",
  "frozen",
  "shared",
  "discarded",
]);

export function getRiskLevel(item: InventoryItem, today: string): RiskLevel {
  const dateConfidence = item.confidence.suggestedUseByDate ?? 0;
  if (!item.suggestedUseByDate || dateConfidence < 0.5) return "unknown";

  const daysLeft = daysUntil(item.suggestedUseByDate, today);
  if (daysLeft < 0) return "past_suggested_date";
  if (daysLeft <= 1) return "use_today";
  if (daysLeft <= 4) return "use_soon";
  return "stable";
}

export function calculatePriorityScore(
  item: InventoryItem,
  actions: FoodAction[],
  today: string,
): number {
  const risk = getRiskLevel(item, today);
  const dateUrgency = {
    past_suggested_date: 50,
    use_today: 40,
    use_soon: 25,
    stable: 10,
    unknown: 8,
  } satisfies Record<RiskLevel, number>;

  const quantityPressure =
    item.quantity >= 5 ? 8 : item.quantity >= 2 ? 4 : 0;
  const skipCount = actions.filter(
    (action) => action.itemId === item.id && action.type === "date_adjusted",
  ).length;
  const skipPenalty = Math.min(skipCount * 5, 15);
  const checkedTodayBoost = wasCheckedToday(item.id, actions, today) ? 12 : 0;
  const dateConfidence = item.confidence.suggestedUseByDate ?? 0;
  const confidenceAdjustment =
    dateConfidence >= 0.8 ? 0 : dateConfidence >= 0.5 ? -4 : -8;
  const actionFriction =
    item.category === "pantry" ? 0 : item.category === "frozen" ? 2 : -2;

  return (
    dateUrgency[risk] +
    categoryRisk[item.category] +
    quantityPressure +
    skipPenalty +
    checkedTodayBoost +
    confidenceAdjustment -
    actionFriction
  );
}

export function getReasonCodes(
  item: InventoryItem,
  actions: FoodAction[],
  today: string,
): PlanReasonCode[] {
  const risk = getRiskLevel(item, today);
  const codes: PlanReasonCode[] = [];

  if (risk === "past_suggested_date") codes.push("PAST_SUGGESTED_DATE");
  if (risk === "use_today" || risk === "use_soon") codes.push("DATE_SOON");
  if (["produce", "dairy", "meat", "seafood", "prepared"].includes(item.category)) {
    codes.push("HIGH_RISK_CATEGORY");
  }
  if (item.quantity >= 5) codes.push("LARGE_QUANTITY");
  if (risk === "unknown") codes.push("UNKNOWN_DATE");
  if (wasCheckedToday(item.id, actions, today)) codes.push("CHECKED_TODAY");
  if (actions.some((action) => action.itemId === item.id && action.type === "date_adjusted")) {
    codes.push("SKIPPED_BEFORE");
  }
  if (["bakery", "produce", "dairy"].includes(item.category)) {
    codes.push("EASY_ACTION");
  }
  return codes;
}

export function getSuggestedAction(
  item: InventoryItem,
  risk: RiskLevel,
  checkedToday = false,
): SuggestedAction {
  if ((risk === "unknown" || risk === "past_suggested_date") && !checkedToday) {
    return risk === "unknown" ? "add_date" : "check_quality";
  }
  if (needsQualityCheckBeforeRescue(item, risk) && !checkedToday) {
    return "check_quality";
  }
  if (item.category === "meat" || item.category === "seafood") return "freeze";
  return "use_now";
}

function needsQualityCheckBeforeRescue(
  item: InventoryItem,
  risk: RiskLevel,
): boolean {
  return (
    (risk === "use_today" || risk === "use_soon") &&
    ["meat", "seafood", "prepared"].includes(item.category)
  );
}

export function explainPlanItem(
  item: InventoryItem,
  risk: RiskLevel,
  reasonCodes: PlanReasonCode[],
): string {
  const lowerName = item.name.toLowerCase();
  const verb = lowerName.endsWith("s") && !lowerName.endsWith("ss") ? "are" : "is";
  if (reasonCodes.includes("CHECKED_TODAY")) {
    return `${item.name} ${verb} checked. Choose a follow-up action now so the decision actually prevents waste.`;
  }
  if (risk === "unknown") {
    return `${item.name} ${verb} missing a confident suggested use date.`;
  }
  if (risk === "past_suggested_date") {
    return `${item.name} ${verb} past the suggested use date. Check quality before deciding what to do.`;
  }
  if (reasonCodes.includes("DATE_SOON") && reasonCodes.includes("HIGH_RISK_CATEGORY")) {
    return `${item.name} ${verb} a higher-priority ${item.category} item and the suggested use date is soon.`;
  }
  if (reasonCodes.includes("DATE_SOON")) {
    return `${item.name} ${verb} coming up soon on the suggested use plan.`;
  }
  return `${item.name} ${verb} stable, but can help round out this week's plan.`;
}

export function generatePlan(input: PlanningInput): PlanningOutput {
  const activeItems = input.items.filter((item) => item.status === "active");
  const completedToday = new Set(
    input.actions
      .filter(
        (action) =>
          action.occurredAt.startsWith(input.today) &&
          terminalActionTypes.has(action.type),
      )
      .map((action) => action.itemId),
  );

  const planItems = activeItems
    .filter((item) => !completedToday.has(item.id))
    .map((item): PlanItem => {
      const riskLevel = getRiskLevel(item, input.today);
      const reasonCodes = getReasonCodes(item, input.actions, input.today);
      const checkedToday = reasonCodes.includes("CHECKED_TODAY");
      return {
        id: `plan-${item.id}`,
        itemId: item.id,
        priorityScore: calculatePriorityScore(item, input.actions, input.today),
        riskLevel,
        reasonCodes,
        explanation: explainPlanItem(item, riskLevel, reasonCodes),
        suggestedAction: getSuggestedAction(item, riskLevel, checkedToday),
        plannedFor: input.today,
        status: "open",
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    today: planItems.slice(0, 5),
    week: planItems.slice(0, 12),
    review: planItems.filter((item) => item.riskLevel === "unknown"),
  };
}

function wasCheckedToday(
  itemId: string,
  actions: FoodAction[],
  today: string,
): boolean {
  return actions.some(
    (action) =>
      action.itemId === itemId &&
      action.type === "checked" &&
      action.occurredAt.startsWith(today),
  );
}
