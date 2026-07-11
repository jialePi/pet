import { useEffect, useState } from "react";
import type { PetReaction, PetState } from "../../types/domain";
import { getKokoMode, reactionToMode, type KokoMode } from "./kokoModes";

type KokoPetProps = {
  visualState: PetState["visualState"];
  energy: number;
  reaction?: PetReaction;
  onInteract?: () => void;
};

const modeCopy: Record<KokoMode, string> = {
  idle: "Koko is calm",
  happy: "Koko is happy and waving",
  sad: "Koko is feeling sad",
  bored: "Koko is bored and thinking",
  review: "Koko is checking the kitchen with you",
  ill: "Koko is feeling ill and needs care",
  energetic: "Koko is full of energy",
  waiting: "Koko is waiting for a food rescue",
};

export function KokoPet({ visualState, energy, reaction, onInteract }: KokoPetProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeReaction, setActiveReaction] = useState<PetReaction | undefined>();
  const mode = getKokoMode(visualState, energy);

  useEffect(() => {
    if (!reaction) return;
    setActiveReaction(reaction);
    const timer = window.setTimeout(
      () => setActiveReaction(undefined),
      reaction.durationMs ?? 2200,
    );
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const activeMode = isInteracting
    ? "happy"
    : activeReaction
      ? reactionToMode(activeReaction.mode)
      : mode;

  useEffect(() => {
    if (!isInteracting) return;
    const timer = window.setTimeout(() => setIsInteracting(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isInteracting]);

  function handleInteract() {
    setIsInteracting(true);
    onInteract?.();
  }

  return (
    <span
      className={`koko-pet koko-pet-${activeMode}`}
      role="img"
      aria-label={activeReaction?.label ?? modeCopy[activeMode]}
      onClick={(event) => {
        event.stopPropagation();
        handleInteract();
      }}
    >
      <span className="koko-sprite" aria-hidden="true" />
      <span className="koko-spark" aria-hidden="true" />
    </span>
  );
}
