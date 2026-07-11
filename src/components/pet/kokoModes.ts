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
