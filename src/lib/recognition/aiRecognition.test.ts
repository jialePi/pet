import { describe, expect, it } from "vitest";
import type { RecognitionCandidate } from "../../types/domain";
import { normalizeRecognizedCandidates } from "./aiRecognition";

function candidate(
  patch: Partial<RecognitionCandidate> & Pick<RecognitionCandidate, "proposedName">,
): RecognitionCandidate {
  return {
    id: "",
    rawText: patch.proposedName,
    proposedCategory: "other",
    proposedQuantity: 1,
    proposedUnit: "item",
    proposedPurchaseDate: "2026-07-11",
    proposedSuggestedUseByDate: "2026-07-15",
    notes: undefined,
    confidence: {
      name: 0.8,
      category: 0.8,
      quantity: 0.8,
      purchaseDate: 0.8,
      suggestedUseByDate: 0.8,
    },
    evidence: [],
    status: "pending",
    ...patch,
  };
}

describe("AI recognition normalization", () => {
  it("uses a detected litre package size when AI reports the unit as item", () => {
    const [milk] = normalizeRecognizedCandidates(
      [
        candidate({
          rawText: "Coles Full Cream Milk 3L",
          proposedName: "Coles Full Cream Milk 3L",
          proposedCategory: "dairy",
          proposedQuantity: 3,
          proposedUnit: "item",
          notes: "3L bottle",
        }),
      ],
      "receipt",
    );

    expect(milk.proposedQuantity).toBe(3);
    expect(milk.proposedUnit).toBe("l");
  });

  it("uses a detected gram package size when there is no separate purchase count", () => {
    const [pork] = normalizeRecognizedCandidates(
      [
        candidate({
          rawText: "Pork Mince 500g",
          proposedName: "Pork Mince 500g",
          proposedCategory: "meat",
          proposedQuantity: 1,
          proposedUnit: "item",
        }),
      ],
      "receipt",
    );

    expect(pork.proposedQuantity).toBe(500);
    expect(pork.proposedUnit).toBe("g");
  });

  it("keeps purchased count as items and preserves package size in notes", () => {
    const [beef] = normalizeRecognizedCandidates(
      [
        candidate({
          rawText: "Beef Mince 500g 2 at $7.50 each",
          proposedName: "Beef Mince",
          proposedCategory: "meat",
          proposedQuantity: 2,
          proposedUnit: "item",
        }),
      ],
      "receipt",
    );

    expect(beef.proposedQuantity).toBe(2);
    expect(beef.proposedUnit).toBe("item");
    expect(beef.notes).toContain("500g each");
  });

  it("reads count-times-package-size as item count", () => {
    const [yogurt] = normalizeRecognizedCandidates(
      [
        candidate({
          rawText: "Greek Yoghurt 2 x 500g",
          proposedName: "Greek Yoghurt",
          proposedCategory: "dairy",
          proposedQuantity: 2,
          proposedUnit: "item",
        }),
      ],
      "receipt",
    );

    expect(yogurt.proposedQuantity).toBe(2);
    expect(yogurt.proposedUnit).toBe("item");
    expect(yogurt.notes).toContain("500g each");
  });
});
