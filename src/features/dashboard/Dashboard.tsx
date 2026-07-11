import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChefHat,
  MessageCircle,
  PackagePlus,
  PawPrint,
  Play,
  RotateCcw,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import type {
  FoodActionType,
  InventoryItem,
  IsoDate,
  MissionCard,
  PetState,
  PetReaction,
} from "../../types/domain";
import type { View } from "../../app/types";
import { remoteAiEnabled } from "../../app/demoConfig";
import type {
  AiDailyPlanError,
  AiDailyPlanResponse,
  AiUsageTask,
} from "../../lib/ai/dailyPlan";
import { normalizeDailyPlanResponse } from "../../lib/ai/dailyPlan";
import { KokoPet } from "../../components/pet/KokoPet";
import {
  createUserAiHeaders,
  type UserAiSettings,
} from "../../lib/ai/userAiSettings";

type DashboardProps = {
  items: InventoryItem[];
  availableItems: InventoryItem[];
  missions: MissionCard[];
  pet: PetState;
  petReaction?: PetReaction;
  today: IsoDate;
  onRecordAction: (
    item: InventoryItem,
    type: FoodActionType,
    quantity?: number,
    note?: string,
  ) => void;
  onNavigate: (view: View) => void;
  onResetDemo: () => void;
  userAiSettings?: UserAiSettings;
};

export function Dashboard({
  items,
  availableItems,
  missions,
  pet,
  petReaction,
  today,
  onRecordAction,
  onNavigate,
  onResetDemo,
  userAiSettings,
}: DashboardProps) {
  const [petLine, setPetLine] = useState("Tap the pet for a kitchen clue.");
  const [dailyPlan, setDailyPlan] = useState<
    | { kind: "idle" }
    | { kind: "loading"; message: string }
    | { kind: "success"; response: AiDailyPlanResponse }
    | { kind: "error"; message: string; fallback: AiDailyPlanResponse }
  >({ kind: "idle" });
  const [completedRecipeSteps, setCompletedRecipeSteps] = useState<Record<string, boolean>>(
    {},
  );
  const activePlanItems = useMemo(
    () => availableItems.filter((item) => item.status === "active"),
    [availableItems],
  );
  const frozenItems = useMemo(
    () => availableItems.filter((item) => item.status === "frozen"),
    [availableItems],
  );
  const activePlanItemsKey = useMemo(
    () =>
      activePlanItems
        .map((item) => `${item.id}:${item.quantity}:${item.status}`)
        .sort()
        .join("|"),
    [activePlanItems],
  );
  const useToday = missions.filter((mission) => mission.urgencyLabel === "Today").length;
  const thisWeek = missions.filter((mission) => mission.urgencyLabel !== "Stable").length;
  const wasteBrief = createWasteBrief(missions);
  const petContext = { availableItems, activePlanItems, frozenItems, missions, pet };
  const hasUrgentMissions = useToday > 0;
  const displayVisualState = getDisplayVisualState(
    pet.visualState,
    hasUrgentMissions,
  );

  useEffect(() => {
    setDailyPlan((current) => {
      if (current.kind !== "success" && current.kind !== "error") return current;
      const response = current.kind === "success" ? current.response : current.fallback;
      const synced = normalizeDailyPlanResponse(response, activePlanItems);
      if (isSameDailyPlan(response, synced)) return current;
      const nextResponse = {
        ...synced,
        planSummary:
          synced.usageTasks.length > 0
            ? `${synced.planSummary} Inventory changed, so completed or frozen items were removed from this plan.`
            : "Inventory changed. This AI plan no longer has active rescue tasks.",
      };
      setPetLine("Inventory changed, so I synced the AI plan.");
      return current.kind === "success"
        ? { kind: "success", response: nextResponse }
        : { ...current, fallback: nextResponse };
    });
  }, [activePlanItemsKey, activePlanItems]);

  async function askDailyPlan() {
    if (!remoteAiEnabled || !userAiSettings) {
      const fallback = createLocalDailyPlan(petContext);
      setPetLine(fallback.petLine);
      setCompletedRecipeSteps({});
      setDailyPlan({ kind: "success", response: fallback });
      return;
    }

    setDailyPlan({ kind: "loading", message: "Building today's recipe and usage tasks..." });
    try {
      const response = await fetch("/api/daily-plan", {
        method: "POST",
        headers: createUserAiHeaders(userAiSettings),
        body: JSON.stringify({
          activeItems: activePlanItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            storageLocation: item.storageLocation,
            suggestedUseByDate: item.suggestedUseByDate,
            notes: item.notes,
          })),
          missions: missions.slice(0, 8).map((mission) => ({
            itemId: mission.itemId,
            itemName: mission.itemName,
            reason: mission.reason,
            suggestedAction: mission.suggestedAction,
            urgencyLabel: mission.urgencyLabel,
          })),
          pet: {
            health: pet.health,
            mood: pet.mood,
            energy: pet.energy,
            trust: pet.trust,
            visualState: pet.visualState,
          },
          today,
        }),
      });
      const payload = (await response.json()) as AiDailyPlanResponse | AiDailyPlanError;
      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "AI daily plan returned an unexpected response.",
        );
      }
      const normalized = normalizeDailyPlanResponse(payload, activePlanItems);
      if (normalized.usageTasks.length === 0) {
        throw new Error("AI returned no actionable inventory tasks.");
      }
      setPetLine(normalized.petLine);
      setCompletedRecipeSteps({});
      setDailyPlan({ kind: "success", response: normalized });
    } catch (error) {
      const fallback = createLocalDailyPlan(petContext);
      setPetLine(fallback.petLine);
      setCompletedRecipeSteps({});
      setDailyPlan({
        kind: "error",
        message:
          error instanceof Error
            ? `${error.message} Using rule-based daily plan instead.`
            : "Using rule-based daily plan instead.",
        fallback,
      });
    }
  }

  function toggleRecipeStep(recipeId: string, stepIndex: number, step: string) {
    const stepId = `${recipeId}-${stepIndex}`;
    setCompletedRecipeSteps((current) => {
      const next = { ...current, [stepId]: !current[stepId] };
      const doneCount = Object.values(next).filter(Boolean).length;
      setPetLine(
        next[stepId]
          ? `Step ${stepIndex + 1} done: ${step} I am tracking the rescue.`
          : "Step reopened. I will wait before updating inventory.",
      );
      if (doneCount > 0 && doneCount % 2 === 0) {
        setPetLine(`Nice progress: ${doneCount} kitchen steps are done.`);
      }
      return next;
    });
  }

  function completeUsageTask(task: AiUsageTask) {
    const item = activePlanItems.find((candidate) => candidate.id === task.itemId);
    if (!item) return;
    const actionType = task.quantity >= item.quantity ? "used" : "partially_used";
    onRecordAction(
      item,
      actionType,
      actionType === "partially_used" ? task.quantity : undefined,
      task.note,
    );
    setDailyPlan((current) => {
      if (current.kind !== "success" && current.kind !== "error") return current;
      const response = current.kind === "success" ? current.response : current.fallback;
      const nextResponse = {
        ...response,
        usageTasks: response.usageTasks.filter((candidate) => candidate.id !== task.id),
      };
      return current.kind === "success"
        ? { kind: "success", response: nextResponse }
        : { ...current, fallback: nextResponse };
    });
  }

  return (
    <section className="dashboard-grid">
      <section className="waste-brief" aria-label="Waste prevention brief">
        <div>
          <span className="eyebrow">Waste decision brief</span>
          <h1>Today: {wasteBrief.riskCount} waste risks</h1>
          <p>{wasteBrief.summary}</p>
        </div>
        <div className="waste-brief-metrics">
          <WasteBriefMetric label="Potential waste avoided" value={wasteBrief.itemsLabel} />
          <WasteBriefMetric label="Best action" value={wasteBrief.bestAction} />
        </div>
        <button className="primary" onClick={() => onNavigate("add")}>
          <ShoppingBasket aria-hidden="true" /> Run shopping check
        </button>
      </section>

      <section className={`pet-room ${displayVisualState}`} aria-label="Pet room">
        <div className="room-scene">
          <div className="fridge">
            <span>today</span>
            <strong>{useToday}</strong>
          </div>
          <button
            className="pet-avatar"
            onClick={() => setPetLine(getPetMessage("mission", petContext))}
            aria-label="Ask pet for current reminder"
          >
            <KokoPet
              visualState={displayVisualState}
              energy={pet.energy}
              reaction={petReaction}
              onInteract={() => setPetLine(getPetMessage("mission", petContext))}
            />
            <span className="pet-shadow" />
          </button>
        </div>
        <PetStatusPanel
          pet={pet}
          hasUrgentMissions={hasUrgentMissions}
          visualState={displayVisualState}
        />
        <div className="pet-copy">
          <p aria-live="polite">{petLine}</p>
          <div className="pet-actions" aria-label="Pet interaction choices">
            <button onClick={() => setPetLine(getPetMessage("mission", petContext))}>
              <MessageCircle aria-hidden="true" /> Today's clue
            </button>
            <button onClick={() => setPetLine(getPetMessage("shopping", petContext))}>
              <ShoppingBasket aria-hidden="true" /> Shopping check
            </button>
            <button onClick={() => void askDailyPlan()}>
              <ChefHat aria-hidden="true" /> Rescue plan
            </button>
          </div>
          {dailyPlan.kind !== "idle" && (
            <section
              className={`ai-coach ${dailyPlan.kind}`}
              role={dailyPlan.kind === "error" ? "alert" : "status"}
              aria-label="AI daily recipe plan"
            >
              {dailyPlan.kind === "loading" ? (
                <p>{dailyPlan.message}</p>
              ) : (
                <AiDailyPlanPanel
                  response={
                    dailyPlan.kind === "success" ? dailyPlan.response : dailyPlan.fallback
                  }
                  message={dailyPlan.kind === "error" ? dailyPlan.message : undefined}
                  completedSteps={completedRecipeSteps}
                  onToggleStep={toggleRecipeStep}
                  onCompleteTask={completeUsageTask}
                />
              )}
            </section>
          )}
        </div>
      </section>

      <section className="mission-panel" aria-labelledby="missions-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Waste blockers</span>
            <h1 id="missions-title">Today's rescue decisions</h1>
          </div>
          <button className="icon-button" onClick={onResetDemo} title="Reload demo pantry">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
        {missions.length === 0 ? (
          <MissionEmptyState
            availableCount={availableItems.length}
            frozenCount={frozenItems.length}
            onAdd={() => onNavigate("add")}
            onInventory={() => onNavigate("inventory")}
          />
        ) : (
          <div className="mission-list">
            {missions.slice(0, 3).map((mission) => {
              const item = items.find((candidate) => candidate.id === mission.itemId);
              if (!item) return null;
              return (
                <MissionCardView
                  key={mission.id}
                  mission={mission}
                  item={item}
                  onRecordAction={onRecordAction}
                />
              );
            })}
          </div>
        )}
      </section>

      <aside className="pulse-panel" aria-label="Waste blocker pulse">
        <span className="eyebrow">Waste blocker pulse</span>
        <div className="pulse-stat">
          <strong>{availableItems.length}</strong>
          <span>available items</span>
        </div>
        <div className="pulse-row">
          <span>Use today</span>
          <strong>{useToday}</strong>
        </div>
        <div className="pulse-row">
          <span>This week</span>
          <strong>{thisWeek}</strong>
        </div>
        <button className="primary wide" onClick={() => onNavigate("add")}>
          <ShieldCheck aria-hidden="true" /> Shopping check
        </button>
        <button className="wide" onClick={() => onNavigate("inventory")}>
          <PackagePlus aria-hidden="true" /> Review food
        </button>
      </aside>
    </section>
  );
}

function createWasteBrief(missions: MissionCard[]): {
  riskCount: number;
  itemsLabel: string;
  bestAction: string;
  summary: string;
} {
  const priorityMissions = missions.filter((mission) =>
    ["Today", "Soon"].includes(mission.urgencyLabel),
  );
  const todayMissions = priorityMissions.filter(
    (mission) => mission.urgencyLabel === "Today",
  );
  const riskMissions = todayMissions.length > 0 ? todayMissions : priorityMissions;
  const savedNames = riskMissions.slice(0, 2).map((mission) => mission.itemName);
  const [firstMission] = riskMissions;

  if (!firstMission) {
    return {
      riskCount: 0,
      itemsLabel: "None urgent",
      bestAction: "Check before buying",
      summary:
        "No urgent rescue is waiting. The highest-value waste prevention move is checking the shopping list before buying more.",
    };
  }

  return {
    riskCount: riskMissions.length,
    itemsLabel: savedNames.join(" + "),
    bestAction: `${firstMission.primaryActionLabel} ${firstMission.itemName}`,
    summary: `${firstMission.itemName} is the clearest waste-risk item right now. Act on it before buying more food. ${firstMission.reason}`,
  };
}

function WasteBriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="waste-brief-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type PetMessageKind = "mission" | "shopping" | "mood";

type PetInteractionContext = {
  availableItems: InventoryItem[];
  activePlanItems: InventoryItem[];
  frozenItems: InventoryItem[];
  missions: MissionCard[];
  pet: PetState;
};

function getPetMessage(kind: PetMessageKind, context: PetInteractionContext): string {
  const [firstMission] = context.missions;

  if (kind === "mission") {
    if (firstMission) {
      return `Let's help ${firstMission.itemName} first. ${firstMission.rewardPreview}.`;
    }
    if (context.frozenItems.length > 0) {
      return "No urgent rescue right now. Frozen food is parked safely in inventory.";
    }
    return "The kitchen is calm. Add new food when you shop.";
  }

  if (kind === "shopping") {
    if (context.availableItems.length === 0) {
      return "Inventory is empty enough for a thoughtful restock.";
    }
    if (firstMission) {
      return `Before shopping, rescue ${firstMission.itemName}. If you scan a duplicate, I will ask you to pause.`;
    }
    return `We still have ${context.availableItems.length} available items. Check the list before buying more.`;
  }

  if (context.pet.visualState === "happy" || context.pet.visualState === "calm") {
    return "I feel steady. Keep the plan small and realistic.";
  }
  if (context.pet.visualState === "hungry") {
    return "I am watching the urgent items. One rescue today would help.";
  }
  if (context.pet.visualState === "tired") {
    return "I am low on energy. Freezing one risky item is enough progress.";
  }
  if (context.pet.visualState === "sad") {
    return "I am worried about forgotten food. Pick one easy item to save.";
  }
  return "I may need a careful fridge check. Use your senses and local food safety guidance.";
}

function PetStatusPanel({
  pet,
  hasUrgentMissions,
  visualState,
}: {
  pet: PetState;
  hasUrgentMissions: boolean;
  visualState: PetState["visualState"];
}) {
  const average = Math.round((pet.health + pet.mood + pet.energy + pet.trust) / 4);
  const reaction = getPetReaction(pet, hasUrgentMissions, visualState);

  return (
    <section className={`pet-status-panel ${visualState}`} aria-label="Pet status">
      <div className="pet-status-main">
        <span className="eyebrow">Pet status</span>
        <strong>{reaction.title}</strong>
        <p>{reaction.message}</p>
      </div>
      <div className="pet-status-score" aria-label={`Pet balance ${average} out of 100`}>
        <strong>{average}</strong>
        <span>balance</span>
      </div>
      <div className="pet-stat-chips" aria-label="Pet signals">
        <PetStatChip label="Health" value={pet.health} />
        <PetStatChip label="Mood" value={pet.mood} />
        <PetStatChip label="Energy" value={pet.energy} />
        <PetStatChip label="Trust" value={pet.trust} />
      </div>
    </section>
  );
}

function PetStatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className={`pet-stat-chip ${getStatTone(value)}`}>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function getPetReaction(
  pet: PetState,
  hasUrgentMissions: boolean,
  visualState: PetState["visualState"],
): { title: string; message: string } {
  if (visualState === "sick") {
    return {
      title: "Needs care",
      message: "Use, freeze, or share one risky item to help the pet recover.",
    };
  }
  if (visualState === "sad") {
    return {
      title: "Worried",
      message: "The pet reacts to forgotten food. One rescue action is enough.",
    };
  }
  if (visualState === "tired") {
    return {
      title: "Low energy",
      message: "A no-time fallback like freezing still counts as progress.",
    };
  }
  if (hasUrgentMissions || visualState === "hungry") {
    return {
      title: "Asking for help",
      message: "The pet is pointing at today's most waste-risky food.",
    };
  }
  if (visualState === "happy") {
    return {
      title: "Happy",
      message: "Good rescue habits are keeping the pet bright.",
    };
  }
  return {
    title: "Steady",
    message: "Keep shopping checks small and rescue one item at a time.",
  };
}

function getStatTone(value: number): "good" | "watch" | "low" {
  if (value >= 70) return "good";
  if (value >= 45) return "watch";
  return "low";
}

function getDisplayVisualState(
  visualState: PetState["visualState"],
  hasUrgentMissions: boolean,
): PetState["visualState"] {
  if (
    hasUrgentMissions &&
    (visualState === "happy" || visualState === "calm")
  ) {
    return "hungry";
  }
  return visualState;
}

function AiDailyPlanPanel({
  response,
  message,
  completedSteps,
  onToggleStep,
  onCompleteTask,
}: {
  response: AiDailyPlanResponse;
  message?: string;
  completedSteps: Record<string, boolean>;
  onToggleStep: (recipeId: string, stepIndex: number, step: string) => void;
  onCompleteTask: (task: AiUsageTask) => void;
}) {
  const totalSteps = response.recipes.reduce(
    (total, recipe) => total + recipe.steps.length,
    0,
  );
  const completedCount = response.recipes.reduce(
    (total, recipe) =>
      total +
      recipe.steps.filter((_, index) => completedSteps[`${recipe.id}-${index}`])
        .length,
    0,
  );
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);
  const canSubmitTasks = totalSteps === 0 || completedCount === totalSteps;

  return (
    <div className="daily-plan">
      {message && <p>{message}</p>}
      <span className="eyebrow">
        {response.provider === "rules" ? "Rule daily plan" : `AI daily plan · ${response.model}`}
      </span>
      <p>{response.planSummary}</p>
      <div className="kitchen-progress" aria-label="AI kitchen progress">
        <div>
          <strong>{progressPercent}%</strong>
          <span>
            {completedCount} of {totalSteps} recipe steps done
          </span>
        </div>
        <progress value={completedCount} max={Math.max(totalSteps, 1)} />
      </div>
      <div className="recipe-list">
        {response.recipes.map((recipe) => (
          <article key={recipe.id} className="recipe-card">
            <div className="recipe-heading">
              <strong>{recipe.title}</strong>
              <span>{recipe.timeMinutes} min</span>
            </div>
            <ol className="interactive-steps">
              {recipe.steps.map((step, index) => (
                <li
                  key={`${recipe.id}-${step}`}
                  className={completedSteps[`${recipe.id}-${index}`] ? "done" : ""}
                >
                  <button
                    type="button"
                    onClick={() => onToggleStep(recipe.id, index, step)}
                    aria-pressed={Boolean(completedSteps[`${recipe.id}-${index}`])}
                  >
                    {completedSteps[`${recipe.id}-${index}`] ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Play aria-hidden="true" />
                    )}
                    {step}
                  </button>
                </li>
              ))}
            </ol>
            <small>{recipe.expectedLeftovers}</small>
          </article>
        ))}
      </div>
      <div className="usage-task-list" aria-label="AI inventory usage tasks">
        {response.usageTasks.length === 0 ? (
          <p>All AI tasks from this plan are submitted.</p>
        ) : (
          response.usageTasks.map((task) => (
            <article key={task.id} className="usage-task">
              <div>
                <strong>{task.actionLabel}</strong>
                <span>
                  Use {formatQuantity(task.quantity)} {task.unit} {task.itemName}
                </span>
                <small>{task.note}</small>
              </div>
              <button
                className="primary"
                disabled={!canSubmitTasks}
                onClick={() => onCompleteTask(task)}
              >
                <Sparkles aria-hidden="true" /> Submit rescue
              </button>
            </article>
          ))
        )}
      </div>
      {!canSubmitTasks && response.usageTasks.length > 0 && (
        <p className="progress-hint">Complete the recipe steps to unlock inventory update.</p>
      )}
    </div>
  );
}

function createLocalDailyPlan(context: PetInteractionContext): AiDailyPlanResponse {
  const prioritizedItems = context.missions
    .slice(0, 3)
    .map((mission) =>
      context.activePlanItems.find((item) => item.id === mission.itemId),
    )
    .filter((item): item is InventoryItem => Boolean(item));
  const fallbackItems =
    prioritizedItems.length > 0 ? prioritizedItems : context.activePlanItems.slice(0, 2);

  return {
    petLine:
      fallbackItems.length > 0
        ? `I found a simple plan for ${fallbackItems[0].name}.`
        : "Add food first and I can build today's plan.",
    planSummary:
      fallbackItems.length > 0
        ? `Use ${fallbackItems.map((item) => item.name).join(", ")} before shopping again.`
        : "No active food is available for a recipe plan yet.",
    recipes:
      fallbackItems.length > 0
        ? [
            {
              id: "local-recipe-1",
              title: `Quick ${fallbackItems[0].name} rescue bowl`,
              usesItemIds: fallbackItems.map((item) => item.id),
              timeMinutes: 15,
              steps: [
                "Check quality before using any uncertain food.",
                `Prepare ${fallbackItems.map((item) => item.name).join(" and ")}.`,
                "Combine with a pantry base such as rice, noodles, toast, or eggs.",
              ],
              expectedLeftovers: "Submit the tasks below so the remaining quantities update.",
            },
          ]
        : [],
    usageTasks: fallbackItems.map((item) => ({
      id: `local-task-${item.id}`,
      itemId: item.id,
      itemName: item.name,
      actionLabel: `Use ${item.name}`,
      quantity: Math.min(1, item.quantity),
      unit: item.unit,
      note: "Rule-based task. Adjust the item manually if you used a different amount.",
    })),
    provider: "rules",
    model: "local-rules",
  };
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}

function isSameDailyPlan(
  previous: AiDailyPlanResponse,
  next: AiDailyPlanResponse,
): boolean {
  return (
    previous.usageTasks.map((task) => `${task.id}:${task.itemId}:${task.quantity}`).join("|") ===
      next.usageTasks.map((task) => `${task.id}:${task.itemId}:${task.quantity}`).join("|") &&
    previous.recipes.map((recipe) => `${recipe.id}:${recipe.usesItemIds.join(",")}`).join("|") ===
      next.recipes.map((recipe) => `${recipe.id}:${recipe.usesItemIds.join(",")}`).join("|")
  );
}

export function MissionCardView({
  mission,
  item,
  onRecordAction,
}: {
  mission: MissionCard;
  item: InventoryItem;
  onRecordAction: (
    item: InventoryItem,
    type: FoodActionType,
    quantity?: number,
    note?: string,
  ) => void;
}) {
  const primaryAction = mission.primaryActionType;
  const secondaryAction = mission.secondaryActionType;
  const partialQuantity = Math.min(1, item.quantity);

  return (
    <article className={`mission-card ${mission.urgencyLabel.toLowerCase()}`}>
      <div className="mission-topline">
        <span className="risk-chip">{mission.phaseLabel}</span>
        <span>{mission.rewardPreview}</span>
      </div>
      <span className="urgency-label">{mission.urgencyLabel}</span>
      <h2>{mission.title}</h2>
      <p>
        <strong>Waste reason:</strong> {mission.reason}
      </p>
      <p className="suggestion">{mission.suggestedAction}</p>
      <p className="mission-impact">
        <strong>Impact:</strong> {getMissionImpact(mission)}
      </p>
      <div className="action-row">
        <button
          className="primary"
          onClick={() =>
            onRecordAction(
              item,
              primaryAction,
              primaryAction === "partially_used" ? partialQuantity : undefined,
              primaryAction === "partially_used"
                ? "Lightweight check-in: used some, not exact tracking."
                : primaryAction === "checked"
                  ? "Checked quality/date; inventory remains active."
                  : undefined,
            )
          }
        >
          <Check aria-hidden="true" /> {mission.primaryActionLabel}
        </button>
        {primaryAction === "partially_used" && (
          <button onClick={() => onRecordAction(item, "used", undefined, "Marked finished from mission.")}>
            Finished
          </button>
        )}
        {mission.secondaryActionLabel && secondaryAction && (
          <button
            onClick={() =>
              onRecordAction(
                item,
                secondaryAction,
                secondaryAction === "partially_used" ? partialQuantity : undefined,
                secondaryAction === "frozen"
                  ? "Fallback rescue: no time to cook, so frozen."
                  : "Used some instead of freezing.",
              )
            }
          >
            {mission.secondaryActionLabel}
          </button>
        )}
      </div>
    </article>
  );
}

function getMissionImpact(mission: MissionCard): string {
  if (mission.primaryActionType === "frozen") {
    return `Prevents ${mission.itemName} from becoming a waste risk if cooking is not realistic today.`;
  }
  if (mission.primaryActionType === "checked") {
    return `Check does not finish the rescue. It unlocks the next use, freeze, share, or discard decision.`;
  }
  return `Uses down ${mission.itemName} before it becomes forgotten food.`;
}

function MissionEmptyState({
  availableCount,
  frozenCount,
  onAdd,
  onInventory,
}: {
  availableCount: number;
  frozenCount: number;
  onAdd: () => void;
  onInventory: () => void;
}) {
  if (availableCount > 0) {
    return (
      <div className="empty-state">
        <PawPrint aria-hidden="true" />
        <h2>No urgent rescue right now</h2>
        <p>
          {frozenCount > 0
            ? `${frozenCount} frozen item is parked in inventory. Advance the demo date or review inventory when you want to cook it.`
            : "Available food is stable today. Advance the demo date to test future missions."}
        </p>
        <button className="primary" onClick={onInventory}>
          Review inventory
        </button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <PawPrint aria-hidden="true" />
      <h2>The pantry is quiet</h2>
      <p>Add a receipt, food photo, or manual item to create missions.</p>
      <button className="primary" onClick={onAdd}>
        Add food
      </button>
    </div>
  );
}
