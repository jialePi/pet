import { describe, expect, it } from "vitest";
import { getKokoFrame, getKokoMode, reactionToMode } from "./kokoModes";

describe("Koko behavior mapping", () => {
  it("keeps stable base emotions deterministic", () => {
    expect(getKokoMode("happy", 85)).toBe("energetic");
    expect(getKokoMode("happy", 70)).toBe("happy");
    expect(getKokoMode("tired", 35)).toBe("bored");
    expect(getKokoMode("sick", 70)).toBe("ill");
    expect(getKokoMode("hungry", 70)).toBe("waiting");
  });

  it("maps concrete behavior reactions to animation modes", () => {
    expect(reactionToMode("jump")).toBe("energetic");
    expect(reactionToMode("wave")).toBe("happy");
    expect(reactionToMode("review")).toBe("review");
    expect(reactionToMode("sad")).toBe("sad");
    expect(reactionToMode("ill")).toBe("ill");
  });

  it("uses only populated atlas cells for every stable and reaction pose", () => {
    const modes = ["idle", "happy", "sad", "bored", "review", "ill", "energetic", "waiting"] as const;
    for (const mode of modes) {
      const stable = getKokoFrame(mode, false);
      const reaction = getKokoFrame(mode, true);
      expect(stable.row).toBeGreaterThanOrEqual(0);
      expect(stable.row).toBeLessThan(11);
      expect(stable.column).toBeGreaterThanOrEqual(0);
      expect(stable.column).toBeLessThan(6);
      expect(reaction.row).toBeGreaterThanOrEqual(0);
      expect(reaction.row).toBeLessThan(11);
      expect(reaction.column).toBeGreaterThanOrEqual(0);
      expect(reaction.column).toBeLessThan(6);
    }
  });
});
