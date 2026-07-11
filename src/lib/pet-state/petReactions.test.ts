import { describe, expect, it } from "vitest";
import {
  reactionIntentForAction,
  reactionIntentForPurchaseDecision,
} from "./petReactions";

describe("pet reaction intents", () => {
  it("maps rescue actions to distinct Koko responses", () => {
    expect(reactionIntentForAction("used", "Bananas").mode).toBe("jump");
    expect(reactionIntentForAction("partially_used", "Bananas").mode).toBe("wave");
    expect(reactionIntentForAction("frozen", "Bananas").mode).toBe("waiting");
    expect(reactionIntentForAction("checked", "Bananas").mode).toBe("review");
    expect(reactionIntentForAction("discarded", "Bananas").mode).toBe("sad");
  });

  it("makes purchase decisions visible in the pet response", () => {
    expect(reactionIntentForPurchaseDecision("skipped_duplicate", "Milk").mode).toBe("jump");
    expect(reactionIntentForPurchaseDecision("checked_inventory", "Milk").mode).toBe("review");
    expect(reactionIntentForPurchaseDecision("bought_anyway", "Milk").mode).toBe("sad");
  });
});
