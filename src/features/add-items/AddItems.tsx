import { useState, type DragEvent } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  ScanSearch,
  ShieldAlert,
  ShoppingBasket,
} from "lucide-react";
import type {
  FoodCategory,
  InventoryItem,
  InventoryItemDraft,
  PurchaseDecisionType,
  PurchaseGuardResult,
  QuantityUnit,
  RecognitionCandidate,
  StorageLocation,
} from "../../types/domain";
import type { View } from "../../app/types";
import { remoteAiEnabled } from "../../app/demoConfig";
import {
  mockPhotoCandidates,
  mockReceiptCandidates,
} from "../../lib/recognition/mockRecognition";
import type {
  RecognitionMode,
  RecognizeImageError,
  RecognizeImageResponse,
} from "../../lib/recognition/aiRecognition";
import {
  evaluatePurchaseGuard,
  reviewShoppingPlan,
  type ShoppingPlanReviewItem,
} from "../../lib/purchase-guard/purchaseGuard";
import { todayIso } from "../../lib/dates/dates";
import {
  createUserAiHeaders,
  type UserAiSettings,
} from "../../lib/ai/userAiSettings";

const categoryOptions: FoodCategory[] = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "pantry",
  "frozen",
  "prepared",
  "beverage",
  "other",
];

const storageOptions: StorageLocation[] = [
  "fridge",
  "freezer",
  "pantry",
  "counter",
  "unknown",
];

const unitOptions: QuantityUnit[] = [
  "item",
  "bag",
  "box",
  "bottle",
  "can",
  "g",
  "kg",
  "ml",
  "l",
  "serving",
  "unknown",
];

type AddItemsProps = {
  items: InventoryItem[];
  onAdd: (draft: InventoryItemDraft) => void;
  onNavigate: (view: View) => void;
  onRecordPurchaseDecision: (input: {
    itemName: string;
    decision: PurchaseDecisionType;
    reason: string;
  }) => void;
  userAiSettings?: UserAiSettings;
};

export function AddItems({
  items,
  onAdd,
  onNavigate,
  onRecordPurchaseDecision,
  userAiSettings,
}: AddItemsProps) {
  const [draft, setDraft] = useState<InventoryItemDraft>({
    name: "",
    category: "produce",
    quantity: 1,
    unit: "item",
    storageLocation: "fridge",
    purchaseDate: todayIso(),
    suggestedUseByDate: todayIso(),
  });
  const [mockMode, setMockMode] = useState<"receipt" | "photo" | undefined>();
  const [aiMode, setAiMode] = useState<RecognitionMode>("receipt");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<RecognitionCandidate[]>([]);
  const [recognitionStatus, setRecognitionStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading"; message: string }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [candidateDrafts, setCandidateDrafts] = useState<InventoryItemDraft[]>([]);
  const [shoppingPlanText, setShoppingPlanText] = useState(
    "spinach\nmilk\nice cream",
  );
  const [shoppingPlanResults, setShoppingPlanResults] = useState<
    ShoppingPlanReviewItem[]
  >([]);
  const [resolvedShoppingIds, setResolvedShoppingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rejectedCandidateIds, setRejectedCandidateIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [guard, setGuard] = useState<
    | {
        result: Extract<PurchaseGuardResult, { blocked: true }>;
        draft: InventoryItemDraft;
      }
    | undefined
  >();

  function guardedAdd(
    nextDraft: InventoryItemDraft,
    override = false,
    options: { navigate: boolean } = { navigate: true },
  ) {
    if (!override) {
      const result = evaluatePurchaseGuard({
        draft: nextDraft,
        activeItems: items,
      });
      if (result.blocked) {
        setGuard({ result, draft: nextDraft });
        return;
      }
    }
    onAdd(nextDraft);
    setGuard(undefined);
    if (options.navigate) {
      onNavigate("dashboard");
    }
    return true;
  }

  function checkShoppingPlan() {
    const results = reviewShoppingPlan({
      text: shoppingPlanText,
      activeItems: items,
      today: todayIso(),
    });
    setShoppingPlanResults(results);
    setResolvedShoppingIds(new Set());
    setGuard(undefined);
  }

  function resolveShoppingDecision(id: string) {
    setResolvedShoppingIds((current) => new Set(current).add(id));
  }

  function recordShoppingDecision(
    result: ShoppingPlanReviewItem,
    decision: PurchaseDecisionType,
  ) {
    onRecordPurchaseDecision({
      itemName: result.draft.name,
      decision,
      reason: result.message,
    });
    resolveShoppingDecision(result.id);
  }

  function submit() {
    if (!draft.name.trim()) return;
    const nextDraft = { ...draft, name: draft.name.trim() };
    const added = guardedAdd(nextDraft);
    if (added) {
      setDraft({ ...draft, name: "", quantity: 1 });
    }
  }

  function overrideGuardAdd() {
    if (!guard) return;
    onRecordPurchaseDecision({
      itemName: guard.draft.name,
      decision: "bought_anyway",
      reason: guard.result.message,
    });
    guardedAdd(guard.draft, true);
  }

  function loadCandidates(mode: "receipt" | "photo") {
    const candidates = mode === "receipt" ? mockReceiptCandidates : mockPhotoCandidates;
    setMockMode(mode);
    setAiCandidates([]);
    setCandidateDrafts(candidates.map(candidateToDraft));
    setRejectedCandidateIds(new Set());
    setGuard(undefined);
    setRecognitionStatus({ kind: "idle" });
  }

  async function recognizeImage(file: File) {
    setMockMode(undefined);
    setAiCandidates([]);
    setCandidateDrafts([]);
    setRejectedCandidateIds(new Set());
    setGuard(undefined);
    setRecognitionStatus({
      kind: "loading",
      message: `Recognizing ${aiMode === "receipt" ? "receipt" : "food photo"}...`,
    });

    if (!remoteAiEnabled || !userAiSettings) {
      loadCandidates(aiMode);
      setRecognitionStatus({
        kind: "success",
        message: `${file.name} accepted. Static QR demo uses stable mock recognition so every judge gets the same flow.`,
      });
      return;
    }

    try {
      const imageDataUrl = await fileToDataUrl(file);
      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: createUserAiHeaders(userAiSettings),
        body: JSON.stringify({
          mode: aiMode,
          imageDataUrl,
          today: todayIso(),
        }),
      });
      const payload = (await response.json()) as
        | RecognizeImageResponse
        | RecognizeImageError;

      if (!response.ok || "error" in payload) {
        const fallback =
          "Use mock recognition for a stable demo, or configure GOOGLE_AI_API_KEY.";
        throw new Error(
          "error" in payload
            ? `${payload.error} ${payload.detail ?? fallback}`
            : fallback,
        );
      }

      setAiCandidates(payload.candidates);
      setCandidateDrafts(payload.candidates.map(candidateToDraft));
      setRecognitionStatus({
        kind: "success",
        message: `${payload.candidates.length} AI candidate${
          payload.candidates.length === 1 ? "" : "s"
        } returned by ${payload.model}. Review before adding.`,
      });
    } catch (error) {
      setRecognitionStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "AI recognition failed.",
      });
    }
  }

  function updateCandidateDraft(index: number, patch: Partial<InventoryItemDraft>) {
    setCandidateDrafts((current) =>
      current.map((candidateDraft, candidateIndex) =>
        candidateIndex === index ? { ...candidateDraft, ...patch } : candidateDraft,
      ),
    );
  }

  function rejectCandidate(candidateId: string) {
    setRejectedCandidateIds((current) => new Set(current).add(candidateId));
  }

  function confirmAllCandidates(candidates: RecognitionCandidate[]) {
    for (const [index, candidate] of candidates.entries()) {
      if (rejectedCandidateIds.has(candidate.id)) continue;
      const candidateDraft = candidateDrafts[index];
      if (!candidateDraft?.name.trim()) continue;
      const added = guardedAdd(
        { ...candidateDraft, name: candidateDraft.name.trim() },
        false,
        { navigate: false },
      );
      if (!added) return;
    }
    onNavigate("dashboard");
  }

  return (
    <section className="add-layout">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Waste prevention entry</span>
          <h1>Shopping Check first</h1>
        </div>
      </div>

      <section className="shopping-plan-panel" aria-labelledby="shopping-plan-title">
        <div className="shopping-plan-copy">
          <span className="eyebrow">Pet purchase guard</span>
          <h2 id="shopping-plan-title">Check the cart before buying</h2>
          <p>
            Paste a planned shop before buying. The pet looks for the decisions
            most likely to create waste: duplicates, too much high-risk food, or
            items that should be used before you shop again.
          </p>
        </div>
        <div className="shopping-plan-input">
          <label>
            Planned purchases
            <textarea
              value={shoppingPlanText}
              onChange={(event) => setShoppingPlanText(event.target.value)}
              rows={4}
              placeholder="spinach&#10;2 milk&#10;ice cream"
            />
          </label>
          <button
            className="primary"
            onClick={checkShoppingPlan}
            disabled={!shoppingPlanText.trim()}
          >
            <ShoppingBasket aria-hidden="true" /> Check for waste risks
          </button>
        </div>
        {shoppingPlanResults.length > 0 && (
          <div className="shopping-results" aria-label="Shopping plan review">
            {shoppingPlanResults.map((result) => (
              <ShoppingPlanCard
                key={result.id}
                result={result}
                resolved={resolvedShoppingIds.has(result.id)}
                onResolve={(decision) => recordShoppingDecision(result, decision)}
                onAddAnyway={() => {
                  onRecordPurchaseDecision({
                    itemName: result.draft.name,
                    decision: result.decision === "ok" ? "approved" : "bought_anyway",
                    reason: result.message,
                  });
                  guardedAdd(result.draft, true);
                }}
                onReviewInventory={() => {
                  recordShoppingDecision(result, "checked_inventory");
                  onNavigate("inventory");
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="upload-grid">
        <AiImageDropzone
          aiMode={aiMode}
          isDragging={isDraggingImage}
          onModeChange={setAiMode}
          onDraggingChange={setIsDraggingImage}
          onFile={(file) => void recognizeImage(file)}
        />
        <button className="upload-card" onClick={() => loadCandidates("receipt")}>
          <ClipboardList aria-hidden="true" />
          <strong>Mock receipt</strong>
          <span>Preview OCR candidates from a receipt.</span>
        </button>
        <button className="upload-card" onClick={() => loadCandidates("photo")}>
          <Camera aria-hidden="true" />
          <strong>Mock food photo</strong>
          <span>Preview image recognition candidates.</span>
        </button>
      </div>

      {recognitionStatus.kind !== "idle" && (
        <section
          className={`recognition-status ${recognitionStatus.kind}`}
          role={recognitionStatus.kind === "error" ? "alert" : "status"}
        >
          {recognitionStatus.message}
        </section>
      )}

      {guard && (
        <section className="purchase-guard" role="alert" aria-live="polite">
          <div className="guard-icon">
            <ShieldAlert aria-hidden="true" />
          </div>
          <div>
            <span className="eyebrow">Pet purchase guard</span>
            <h2>Pause. This could become waste.</h2>
            <p>{guard.result.message}</p>
            <p className="privacy-note">
              Default path: use, freeze, share, reduce, or check what is already
              there. Buying anyway is allowed, but recorded as an override.
            </p>
            <div className="action-row">
              <button className="primary" onClick={() => onNavigate("inventory")}>
                Review existing inventory
              </button>
              <button className="override-button" onClick={overrideGuardAdd}>
                Buy anyway override
              </button>
              <button onClick={() => setGuard(undefined)}>Cancel</button>
            </div>
          </div>
        </section>
      )}

      {(mockMode || aiCandidates.length > 0) && (
        <section className="candidate-panel">
          <h2>{getCandidatePanelTitle(mockMode, aiCandidates.length, aiMode)}</h2>
          <p className="privacy-note">
            Review every AI or OCR suggestion before adding it. Suggested dates are planning hints, not safety guarantees.
          </p>
          <div className="candidate-list">
            {getVisibleCandidates(mockMode, aiCandidates).map((candidate, index) => (
                <CandidateEditor
                  key={candidate.id}
                  candidate={candidate}
                  draft={candidateDrafts[index] ?? candidateToDraft(candidate)}
                  rejected={rejectedCandidateIds.has(candidate.id)}
                  onChange={(patch) => updateCandidateDraft(index, patch)}
                  onReject={() => rejectCandidate(candidate.id)}
                  onConfirm={() => {
                    const candidateDraft = candidateDrafts[index] ?? candidateToDraft(candidate);
                    guardedAdd({
                      ...candidateDraft,
                      name: candidateDraft.name.trim(),
                    });
                  }}
                />
              ))}
          </div>
          <div className="action-row">
            <button
              className="primary"
              onClick={() =>
                confirmAllCandidates(getVisibleCandidates(mockMode, aiCandidates))
              }
            >
              Confirm all active candidates
            </button>
          </div>
        </section>
      )}

      <section className="manual-form" aria-label="Manual item form">
        <h2>Add after check</h2>
        <label>
          Name
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Spinach"
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value as FoodCategory })
              }
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              value={draft.quantity}
              onChange={(event) =>
                setDraft({ ...draft, quantity: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Unit
            <select
              value={draft.unit}
              onChange={(event) =>
                setDraft({ ...draft, unit: event.target.value as QuantityUnit })
              }
            >
              {unitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Storage
            <select
              value={draft.storageLocation}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  storageLocation: event.target.value as StorageLocation,
                })
              }
            >
              {storageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purchase date
            <input
              type="date"
              value={draft.purchaseDate}
              onChange={(event) =>
                setDraft({ ...draft, purchaseDate: event.target.value })
              }
            />
          </label>
          <label>
            Suggested use date
            <input
              type="date"
              value={draft.suggestedUseByDate}
              onChange={(event) =>
                setDraft({ ...draft, suggestedUseByDate: event.target.value })
              }
            />
          </label>
        </div>
        <button className="primary" onClick={submit} disabled={!draft.name.trim()}>
          <PackagePlus aria-hidden="true" /> Add checked item
        </button>
      </section>
    </section>
  );
}

function ShoppingPlanCard({
  result,
  resolved,
  onResolve,
  onAddAnyway,
  onReviewInventory,
}: {
  result: ShoppingPlanReviewItem;
  resolved: boolean;
  onResolve: (decision: PurchaseDecisionType) => void;
  onAddAnyway: () => void;
  onReviewInventory: () => void;
}) {
  const decisionLabel = {
    skip: "Skip",
    reduce: "Reduce",
    check: "Check first",
    ok: "Looks ok",
  } satisfies Record<ShoppingPlanReviewItem["decision"], string>;

  return (
    <article className={`shopping-result-card ${result.decision} ${resolved ? "resolved" : ""}`}>
      <div className="shopping-result-topline">
        <span className="risk-chip">{decisionLabel[result.decision]}</span>
        {resolved && (
          <span className="status-chip">
            <CheckCircle2 aria-hidden="true" /> Decision made
          </span>
        )}
      </div>
      <h3>{result.draft.name}</h3>
      <p>{result.petLine}</p>
      <p className="suggestion">{result.nextStep}</p>
      <small>{result.message}</small>
      <div className="action-row">
        {result.decision === "ok" ? (
          <button className="primary" onClick={onAddAnyway}>
            Add after buying
          </button>
        ) : (
          <>
            <button
              className="primary"
              onClick={() =>
                onResolve(
                  result.decision === "reduce"
                    ? "reduced_quantity"
                    : result.decision === "check"
                      ? "checked_inventory"
                      : "skipped_duplicate",
                )
              }
            >
              {result.decision === "reduce"
                ? "Reduce quantity"
                : result.decision === "check"
                  ? "Check inventory first"
                  : "Skip purchase"}
            </button>
            <button onClick={onReviewInventory}>Check inventory</button>
            <button className="override-button" onClick={onAddAnyway}>
              Buy anyway override
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function AiImageDropzone({
  aiMode,
  isDragging,
  onModeChange,
  onDraggingChange,
  onFile,
}: {
  aiMode: RecognitionMode;
  isDragging: boolean;
  onModeChange: (mode: RecognitionMode) => void;
  onDraggingChange: (dragging: boolean) => void;
  onFile: (file: File) => void;
}) {
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    onDraggingChange(false);
    const file = Array.from(event.dataTransfer.files).find((candidate) =>
      candidate.type.startsWith("image/"),
    );
    if (file) onFile(file);
  }

  return (
    <div className="upload-card real-upload">
      <ScanSearch aria-hidden="true" />
      <strong>AI image recognition</strong>
      <span>Drop or upload a receipt, food pile, pantry shelf, or fridge photo.</span>
      <div className="real-upload-controls">
        <label>
          Image type
          <select
            value={aiMode}
            onChange={(event) => onModeChange(event.target.value as RecognitionMode)}
          >
            <option value="receipt">receipt</option>
            <option value="photo">food or fridge photo</option>
          </select>
        </label>
        <div
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          aria-label="AI image upload dropzone"
          onDragEnter={(event) => {
            event.preventDefault();
            onDraggingChange(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDraggingChange(true);
          }}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={handleDrop}
        >
          <label>
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = "";
              }}
            />
          </label>
          <p>
            Fridge photos work best when items are visible. AI may miss hidden,
            stacked, or heavily cropped food.
          </p>
        </div>
      </div>
    </div>
  );
}

function candidateToDraft(candidate: RecognitionCandidate): InventoryItemDraft {
  return {
    name: candidate.proposedName,
    category: candidate.proposedCategory ?? "other",
    quantity: candidate.proposedQuantity ?? 1,
    unit: candidate.proposedUnit ?? "item",
    storageLocation: "fridge",
    purchaseDate: candidate.proposedPurchaseDate,
    suggestedUseByDate: candidate.proposedSuggestedUseByDate,
    notes: candidate.notes,
  };
}

function getVisibleCandidates(
  mockMode: "receipt" | "photo" | undefined,
  aiCandidates: RecognitionCandidate[],
): RecognitionCandidate[] {
  if (aiCandidates.length > 0) return aiCandidates;
  if (mockMode === "receipt") return mockReceiptCandidates;
  if (mockMode === "photo") return mockPhotoCandidates;
  return [];
}

function getCandidatePanelTitle(
  mockMode: "receipt" | "photo" | undefined,
  aiCandidateCount: number,
  aiMode: RecognitionMode,
): string {
  if (aiCandidateCount > 0) {
    return aiMode === "receipt" ? "AI receipt candidates" : "AI photo candidates";
  }
  return mockMode === "receipt" ? "Receipt candidates" : "Photo candidates";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function CandidateEditor({
  candidate,
  draft,
  rejected,
  onChange,
  onReject,
  onConfirm,
}: {
  candidate: RecognitionCandidate;
  draft: InventoryItemDraft;
  rejected: boolean;
  onChange: (patch: Partial<InventoryItemDraft>) => void;
  onReject: () => void;
  onConfirm: () => void;
}) {
  const nameConfidence = candidate.confidence.name ?? 0;
  const dateConfidence = candidate.confidence.suggestedUseByDate ?? 0;

  return (
    <article
      className={`candidate-card editable ${rejected ? "rejected" : ""}`}
      aria-label={`${candidate.proposedName} candidate`}
    >
      <div className="candidate-header">
        <div>
          <strong>{candidate.proposedName}</strong>
          <span>
            name confidence {Math.round(nameConfidence * 100)}%
            {dateConfidence < 0.7 ? " · date needs review" : ""}
          </span>
        </div>
        {candidate.rawText && <code>{candidate.rawText}</code>}
      </div>
      <div className="candidate-edit-grid">
        <label>
          Name
          <input
            value={draft.name}
            disabled={rejected}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label>
          Category
          <select
            value={draft.category}
            disabled={rejected}
            onChange={(event) =>
              onChange({ category: event.target.value as FoodCategory })
            }
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={draft.quantity}
            disabled={rejected}
            onChange={(event) => onChange({ quantity: Number(event.target.value) })}
          />
        </label>
        <label>
          Unit
          <select
            value={draft.unit}
            disabled={rejected}
            onChange={(event) => onChange({ unit: event.target.value as QuantityUnit })}
          >
            {unitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Suggested use date
          <input
            type="date"
            value={draft.suggestedUseByDate ?? ""}
            disabled={rejected}
            onChange={(event) =>
              onChange({ suggestedUseByDate: event.target.value })
            }
          />
        </label>
        <label className="candidate-notes">
          Notes
          <input
            value={draft.notes ?? ""}
            disabled={rejected}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="500g each, 2-pack, or receipt detail"
          />
        </label>
      </div>
      <div className="action-row">
        <button
          className="primary"
          disabled={rejected || !draft.name.trim()}
          onClick={onConfirm}
        >
          Confirm {candidate.proposedName} candidate
        </button>
        <button disabled={rejected} onClick={onReject}>
          Reject {candidate.proposedName} candidate
        </button>
      </div>
    </article>
  );
}
