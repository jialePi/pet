import type { InventoryItem, MissionCard, PlanItem } from "../../types/domain";
import { describeActionReward } from "../pet-state/petState";

export function createMissionCard(plan: PlanItem, item: InventoryItem): MissionCard {
  const isReview = plan.suggestedAction === "add_date" || plan.suggestedAction === "check_quality";
  const checkedToday = plan.reasonCodes.includes("CHECKED_TODAY");
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
      ? checkedToday
        ? `Freeze ${item.name} after check`
        : `Freeze ${item.name}`
      : isReview
        ? `Check ${item.name}`
        : `Rescue ${item.name}`;
  const suggestedAction =
    plan.suggestedAction === "freeze"
      ? checkedToday
        ? "If it passed your quality check and you are not cooking today, freeze it now."
        : "Check quality first if uncertain, then freeze it if you are not cooking today."
      : plan.suggestedAction === "check_quality"
        ? "Check smell, appearance, packaging, and storage before deciding."
        : plan.suggestedAction === "add_date"
          ? "Confirm a suggested use date so planning gets smarter."
          : "Use some today, or pick a fallback if cooking is not realistic.";
  const rewardPreview =
    plan.suggestedAction === "freeze"
      ? describeActionReward("frozen")
    : plan.suggestedAction === "share"
        ? describeActionReward("shared")
        : isReview
          ? describeActionReward("checked")
          : describeActionReward("partially_used");

  return {
    id: `mission-${plan.id}`,
    planItemId: plan.id,
    itemId: item.id,
    phaseLabel: isReview
      ? "Step 1: Check"
      : checkedToday
        ? "Step 2: Decide"
        : "Waste blocker",
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
    primaryActionType:
      plan.suggestedAction === "freeze"
        ? "frozen"
        : isReview
          ? "checked"
          : "partially_used",
    secondaryActionLabel:
      plan.suggestedAction === "freeze"
        ? "Used some instead"
        : isReview
          ? undefined
          : "No time: freeze",
    secondaryActionType:
      plan.suggestedAction === "freeze"
        ? "partially_used"
        : isReview
          ? undefined
          : "frozen",
  };
}
