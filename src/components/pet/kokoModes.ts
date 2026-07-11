import type { PetReactionMode, PetState } from "../../types/domain";

export type KokoMode =
  | "idle"
  | "happy"
  | "sad"
  | "bored"
  | "review"
  | "ill"
  | "energetic"
  | "waiting";

export type KokoFrame = {
  row: number;
  column: number;
};

const baseFrames: Record<KokoMode, KokoFrame> = {
  idle: { row: 0, column: 0 },
  happy: { row: 3, column: 0 },
  sad: { row: 5, column: 1 },
  bored: { row: 8, column: 1 },
  review: { row: 8, column: 2 },
  ill: { row: 5, column: 5 },
  energetic: { row: 4, column: 1 },
  waiting: { row: 6, column: 0 },
};

const reactionFrames: Partial<Record<KokoMode, KokoFrame>> = {
  happy: { row: 3, column: 2 },
  sad: { row: 5, column: 3 },
  bored: { row: 8, column: 4 },
  review: { row: 8, column: 4 },
  ill: { row: 5, column: 4 },
  energetic: { row: 4, column: 2 },
  waiting: { row: 6, column: 3 },
};

export function getKokoMode(
  visualState: PetState["visualState"],
  energy: number,
): KokoMode {
  if (visualState === "sick") return "ill";
  if (visualState === "sad") return "sad";
  if (visualState === "tired") return "bored";
  if (visualState === "hungry") return "waiting";
  if (visualState === "happy" && energy >= 82) return "energetic";
  if (visualState === "happy") return "happy";
  return "idle";
}

export function reactionToMode(mode: PetReactionMode): KokoMode {
  if (mode === "jump") return "energetic";
  if (mode === "wave") return "happy";
  return mode;
}

export function getKokoFrame(mode: KokoMode, isReaction: boolean): KokoFrame {
  return (isReaction && reactionFrames[mode]) || baseFrames[mode];
}
