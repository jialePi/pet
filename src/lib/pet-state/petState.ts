import type {
  FoodAction,
  InventoryItem,
  PetState,
  PurchaseDecisionType,
} from "../../types/domain";
import { getRiskLevel } from "../planning/planning";

type PetStateInput = {
  current: PetState;
  items: InventoryItem[];
  actions: FoodAction[];
  today: string;
};

export const actionEffects: Record<
  FoodAction["type"],
  Partial<Pick<PetState, "health" | "mood" | "energy" | "trust">>
> = {
  used: { health: 10, mood: 10, energy: 6, trust: 6 },
  partially_used: { health: 5, mood: 6, energy: 3, trust: 4 },
  frozen: { health: 7, mood: 6, energy: 12, trust: 5 },
  shared: { health: 6, mood: 12, energy: 3, trust: 8 },
  discarded: { health: -10, mood: -12, energy: -6, trust: -4 },
  checked: { mood: 2, trust: 3 },
  date_adjusted: { mood: 2, trust: 3 },
  quantity_adjusted: { trust: 2 },
};

export const purchaseDecisionEffects = {
  skipped_duplicate: { mood: 4, trust: 6 },
  reduced_quantity: { mood: 3, trust: 5 },
  checked_inventory: { trust: 3 },
  bought_anyway: { mood: -3, trust: -2 },
  approved: { trust: 1 },
} satisfies Record<
  PurchaseDecisionType,
  Partial<Pick<PetState, "health" | "mood" | "energy" | "trust">>
>;

export function describeActionReward(type: FoodAction["type"]): string {
  if (type === "used") return "Pet health +10";
  if (type === "partially_used") return "Pet mood +6";
  if (type === "frozen") return "Pet energy +12";
  if (type === "shared") return "Pet mood +12";
  if (type === "checked" || type === "date_adjusted") return "Pet trust +3";
  if (type === "quantity_adjusted") return "Pet trust +2";
  return "Pet needs care";
}

export function applyPetEffect(
  current: PetState,
  effect: Partial<Pick<PetState, "health" | "mood" | "energy" | "trust">>,
): PetState {
  const next = {
    ...current,
    health: clamp(current.health + (effect.health ?? 0)),
    mood: clamp(current.mood + (effect.mood ?? 0)),
    energy: clamp(current.energy + (effect.energy ?? 0)),
    trust: clamp(current.trust + (effect.trust ?? 0)),
    lastUpdatedAt: new Date().toISOString(),
  };

  return {
    ...next,
    visualState: getVisualState(next, false),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getVisualState(
  state: Pick<PetState, "health" | "mood" | "energy">,
  hasHighRiskItems: boolean,
): PetState["visualState"] {
  const average = (state.health + state.mood + state.energy) / 3;
  if (state.health < 45 || average < 42) return "sick";
  if (state.mood < 50) return "sad";
  if (state.energy < 50) return "tired";
  if (hasHighRiskItems) return "hungry";
  if (average >= 75) return "happy";
  return "calm";
}

export function calculatePetState(input: PetStateInput): PetState {
  const actionsToday = input.actions.filter((action) =>
    action.occurredAt.startsWith(input.today),
  );
  const scoredActionIds = new Set(input.current.lastScoredActionIds ?? []);
  const unscoredActionsToday = actionsToday.filter(
    (action) => !scoredActionIds.has(action.id),
  );
  const highRiskItems = input.items.filter((item) => {
    const risk = getRiskLevel(item, input.today);
    return (
      item.status === "active" &&
      (risk === "past_suggested_date" || risk === "use_today")
    );
  });

  let health = input.current.health;
  let mood = input.current.mood;
  let energy = input.current.energy;
  let trust = input.current.trust;

  for (const action of unscoredActionsToday) {
    const effect = actionEffects[action.type];
    health += effect.health ?? 0;
    mood += effect.mood ?? 0;
    energy += effect.energy ?? 0;
    trust += effect.trust ?? 0;
  }

  const rescueActionToday = actionsToday.some((action) =>
    ["used", "partially_used", "frozen", "shared"].includes(action.type),
  );
  const engagedToday = actionsToday.some((action) =>
    ["used", "partially_used", "frozen", "shared", "checked"].includes(action.type),
  );
  const shouldApplyRiskPenalty =
    highRiskItems.length > 0 &&
    !engagedToday &&
    input.current.lastRiskPenaltyDate !== input.today;

  if (shouldApplyRiskPenalty) {
    const urgencyPressure = Math.min(highRiskItems.length, 3);
    mood -= 6 + urgencyPressure * 2;
    energy -= 4 + urgencyPressure * 2;
    trust -= 2 + urgencyPressure;
  }

  const pastSuggestedCount = highRiskItems.filter(
    (item) => getRiskLevel(item, input.today) === "past_suggested_date",
  ).length;
  if (pastSuggestedCount > 0 && shouldApplyRiskPenalty) {
    health -= Math.min(pastSuggestedCount * 5, 15);
  }

  const nextStreak = rescueActionToday
    ? input.current.lastStreakDate === input.today
      ? input.current.streakDays
      : input.current.streakDays + 1
    : highRiskItems.length === 0
      ? input.current.streakDays
      : 0;

  const next = {
    ...input.current,
    health: clamp(health),
    mood: clamp(mood),
    energy: clamp(energy),
    trust: clamp(trust),
    streakDays: nextStreak,
    lastUpdatedAt: new Date().toISOString(),
    lastScoredActionIds: [
      ...new Set([
        ...(input.current.lastScoredActionIds ?? []),
        ...unscoredActionsToday.map((action) => action.id),
      ]),
    ].slice(-200),
    lastStreakDate: rescueActionToday
      ? input.today
      : highRiskItems.length === 0
        ? input.current.lastStreakDate
        : undefined,
    lastRiskPenaltyDate: shouldApplyRiskPenalty
      ? input.today
      : input.current.lastRiskPenaltyDate,
  };

  return {
    ...next,
    visualState: getVisualState(next, highRiskItems.length > 0),
  };
}

export function initialPetState(now = new Date().toISOString()): PetState {
  return {
    id: "pet-main",
    health: 70,
    mood: 70,
    energy: 60,
    trust: 50,
    streakDays: 0,
    stage: "baby",
    visualState: "calm",
    lastUpdatedAt: now,
  };
}
