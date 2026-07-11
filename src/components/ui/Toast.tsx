import { useEffect, useMemo } from "react";

type ToastProps = {
  message?: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: ToastProps) {
  const scoreChange = useMemo(() => parseScoreChange(message), [message]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`toast${scoreChange ? ` toast-score ${scoreChange.tone}` : ""}`}
      role="status"
      aria-live="polite"
    >
      {scoreChange ? (
        <>
          <span className="toast-score-badge">
            {scoreChange.amount > 0 ? "+" : ""}
            {scoreChange.amount}
          </span>
          <span className="toast-copy">
            <strong>
              Koko score {scoreChange.amount > 0 ? "increased" : "decreased"}
            </strong>
            <span>{scoreChange.metric}</span>
            <small>{scoreChange.remainingMessage}</small>
          </span>
        </>
      ) : (
        <span>{message}</span>
      )}
      <button onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}

function parseScoreChange(
  message?: string,
): { metric: string; amount: number; tone: "positive" | "negative"; remainingMessage: string } | undefined {
  if (!message) return undefined;
  const match = message.match(/Pet (health|mood|energy|trust) ([+-]\d+)/i);
  if (!match) return undefined;
  const amount = Number(match[2]);
  return {
    metric: match[1],
    amount,
    tone: amount >= 0 ? "positive" : "negative",
    remainingMessage: message.replace(match[0], "").trim(),
  };
}
