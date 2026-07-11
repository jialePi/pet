import type { InventoryItem, MissionCard, PlanItem } from "../../types/domain";

export function createMissionCard(plan: PlanItem, item: InventoryItem): MissionCard {
  const isReview = plan.suggestedAction === "add_date" || plan.suggestedAction === "check_quality";
  const urgencyLabel =
    plan.riskLevel === "use_today" || plan.riskLevel === "past_suggested_date"
      ? "Today"
      : plan.riskLevel === "use_soon"
        ? "Soon"
        : isReview
          ? "Review"
          : "Stable";
  const title =
    plan.suggestedAction === "freeze"
      ? `Freeze ${item.name}`
      : isReview
        ? `Check ${item.name}`
        : `Rescue ${item.name}`;
  const suggestedAction =
    plan.suggestedAction === "freeze"
      ? "Freeze it if you are not cooking today."
      : plan.suggestedAction === "check_quality"
        ? "Check smell, appearance, packaging, and storage before deciding."
        : plan.suggestedAction === "add_date"
          ? "Confirm a suggested use date so planning gets smarter."
          : "Use some today, or pick a fallback if cooking is not realistic.";
  const rewardPreview =
    plan.suggestedAction === "freeze"
      ? "Pet energy +8"
      : plan.suggestedAction === "share"
        ? "Pet mood +10"
        : isReview
          ? "Pet trust +2"
          : "Pet health +6";

  return {
    id: `mission-${plan.id}`,
    planItemId: plan.id,
    itemId: item.id,
    title,
    itemName: item.name,
    reason: plan.explanation,
    suggestedAction,
    rewardPreview,
    urgencyLabel,
    primaryActionLabel:
      plan.suggestedAction === "freeze"
        ? "Frozen"
        : isReview
          ? "Checked"
          : "Used some",
    secondaryActionLabel:
      plan.suggestedAction === "freeze" ? "Used some instead" : "No time: freeze",
  };
}
