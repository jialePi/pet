import { describe, expect, it } from "vitest";
import { getKokoMode, reactionToMode } from "./kokoModes";

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
});
