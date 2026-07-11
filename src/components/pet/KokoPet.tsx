import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PetReaction, PetState } from "../../types/domain";
import {
  getKokoFrame,
  getKokoMode,
  reactionToMode,
  type KokoMode,
} from "./kokoModes";

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
  const hasMounted = useRef(false);
  const seenReactionId = useRef<string | undefined>(undefined);
  const mode = getKokoMode(visualState, energy);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      seenReactionId.current = reaction?.id;
      return;
    }
    if (!reaction || seenReactionId.current === reaction.id) return;
    seenReactionId.current = reaction.id;
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
  const isPlayingReaction = Boolean(isInteracting || activeReaction);
  const frame = getKokoFrame(activeMode, isPlayingReaction);
  const spriteStyle = {
    "--koko-frame-x": `${frame.column * -192}px`,
    "--koko-frame-y": `${frame.row * -208}px`,
  } as CSSProperties;

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
      className={`koko-pet koko-pet-${activeMode}${isPlayingReaction ? " koko-pet-reaction" : ""}`}
      role="img"
      aria-label={activeReaction?.label ?? modeCopy[activeMode]}
      onClick={(event) => {
        event.stopPropagation();
        handleInteract();
      }}
    >
      <span className="koko-sprite" style={spriteStyle} aria-hidden="true" />
    </span>
  );
}
