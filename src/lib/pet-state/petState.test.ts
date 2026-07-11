import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../../types/domain";
import { calculatePetState, initialPetState } from "./petState";

const urgentItem: InventoryItem = {
  id: "spinach",
  name: "Spinach",
  category: "produce",
  quantity: 1,
  unit: "bag",
  storageLocation: "fridge",
  purchaseDate: "2026-07-05",
  suggestedUseByDate: "2026-07-10",
  source: "manual",
  confidence: { suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
};

describe("pet state", () => {
  it("increases pet state when a plan action is completed", () => {
    const start = initialPetState("2026-07-10T00:00:00.000Z");
    const next = calculatePetState({
      current: start,
      items: [{ ...urgentItem, status: "used" }],
      actions: [
        {
          id: "action-1",
          itemId: urgentItem.id,
          type: "used",
          quantity: 1,
          unit: "bag",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(next.health).toBeGreaterThan(start.health);
    expect(next.mood).toBeGreaterThan(start.mood);
    expect(next.streakDays).toBe(1);
  });

  it("does not score the same action or streak twice on the same day", () => {
    const start = initialPetState("2026-07-10T00:00:00.000Z");
    const actions = [
      {
        id: "action-1",
        itemId: urgentItem.id,
        type: "used" as const,
        quantity: 1,
        unit: "bag" as const,
        occurredAt: "2026-07-10T10:00:00.000Z",
      },
    ];
    const first = calculatePetState({
      current: start,
      items: [{ ...urgentItem, status: "used" }],
      actions,
      today: "2026-07-10",
    });
    const second = calculatePetState({
      current: first,
      items: [{ ...urgentItem, status: "used" }],
      actions,
      today: "2026-07-10",
    });

    expect(second.health).toBe(first.health);
    expect(second.mood).toBe(first.mood);
    expect(second.streakDays).toBe(1);
  });

  it("records checked actions without consuming the item or completing the rescue streak", () => {
    const start = initialPetState("2026-07-10T00:00:00.000Z");
    const next = calculatePetState({
      current: start,
      items: [urgentItem],
      actions: [
        {
          id: "action-checked",
          itemId: urgentItem.id,
          type: "checked",
          quantity: 1,
          unit: "bag",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(next.trust).toBeGreaterThan(start.trust);
    expect(next.streakDays).toBe(0);
    expect(next.lastRiskPenaltyDate).toBeUndefined();
  });

  it("does not punish inactivity when there are no high-risk items", () => {
    const start = initialPetState("2026-07-10T00:00:00.000Z");
    const next = calculatePetState({
      current: start,
      items: [],
      actions: [],
      today: "2026-07-10",
    });

    expect(next.mood).toBe(start.mood);
    expect(next.energy).toBe(start.energy);
  });

  it("clamps values to 0-100", () => {
    const start = {
      ...initialPetState("2026-07-10T00:00:00.000Z"),
      health: 99,
      mood: 99,
      energy: 99,
      trust: 99,
    };
    const next = calculatePetState({
      current: start,
      items: [{ ...urgentItem, status: "used" }],
      actions: [
        {
          id: "action-1",
          itemId: urgentItem.id,
          type: "shared",
          quantity: 1,
          unit: "bag",
          occurredAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      today: "2026-07-10",
    });

    expect(next.health).toBeLessThanOrEqual(100);
    expect(next.mood).toBeLessThanOrEqual(100);
    expect(next.energy).toBeLessThanOrEqual(100);
    expect(next.trust).toBeLessThanOrEqual(100);
  });
});
