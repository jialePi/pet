export type IsoDate = string;
export type IsoDateTime = string;

export type FoodCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "seafood"
  | "bakery"
  | "pantry"
  | "frozen"
  | "prepared"
  | "beverage"
  | "other";

export type QuantityUnit =
  | "item"
  | "bag"
  | "box"
  | "bottle"
  | "can"
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "serving"
  | "unknown";

export type StorageLocation =
  | "fridge"
  | "freezer"
  | "pantry"
  | "counter"
  | "unknown";

export type LabelDateType =
  | "best_if_used_by"
  | "use_by"
  | "sell_by"
  | "freeze_by"
  | "unknown";

export type ItemSource =
  | "manual"
  | "receipt_ocr"
  | "food_photo"
  | "barcode"
  | "demo_seed";

export type InventoryStatus =
  | "active"
  | "used"
  | "frozen"
  | "shared"
  | "discarded"
  | "deleted";

export type FoodActionType =
  | "used"
  | "partially_used"
  | "frozen"
  | "shared"
  | "discarded"
  | "checked"
  | "date_adjusted"
  | "quantity_adjusted";

export type ConfidenceMap = {
  name?: number;
  category?: number;
  quantity?: number;
  purchaseDate?: number;
  suggestedUseByDate?: number;
  storageLocation?: number;
};

export type RecognitionEvidence = {
  kind: "ocr_text" | "image_label" | "barcode" | "user_input";
  value: string;
  confidence?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  normalizedName?: string;
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  storageLocation: StorageLocation;
  purchaseDate?: IsoDate;
  suggestedUseByDate?: IsoDate;
  labelDate?: IsoDate;
  labelDateType?: LabelDateType;
  openedDate?: IsoDate;
  source: ItemSource;
  confidence: ConfidenceMap;
  status: InventoryStatus;
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type InventoryItemDraft = {
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  storageLocation: StorageLocation;
  purchaseDate?: IsoDate;
  suggestedUseByDate?: IsoDate;
  notes?: string;
};

export type RecognitionCandidate = {
  id: string;
  sourceImageId?: string;
  rawText?: string;
  proposedName: string;
  proposedCategory?: FoodCategory;
  proposedQuantity?: number;
  proposedUnit?: QuantityUnit;
  proposedPurchaseDate?: IsoDate;
  proposedSuggestedUseByDate?: IsoDate;
  notes?: string;
  confidence: ConfidenceMap;
  evidence: RecognitionEvidence[];
  status: "pending" | "accepted" | "rejected" | "edited";
};

export type FoodAction = {
  id: string;
  itemId: string;
  type: FoodActionType;
  quantity: number;
  unit: QuantityUnit;
  occurredAt: IsoDateTime;
  note?: string;
};

export type PurchaseDecisionType =
  | "skipped_duplicate"
  | "reduced_quantity"
  | "checked_inventory"
  | "bought_anyway"
  | "approved";

export type PurchaseDecisionEvent = {
  id: string;
  itemName: string;
  decision: PurchaseDecisionType;
  reason: string;
  occurredAt: IsoDateTime;
};

export type RiskLevel =
  | "past_suggested_date"
  | "use_today"
  | "use_soon"
  | "stable"
  | "unknown";

export type PlanReasonCode =
  | "DATE_SOON"
  | "PAST_SUGGESTED_DATE"
  | "HIGH_RISK_CATEGORY"
  | "LARGE_QUANTITY"
  | "SKIPPED_BEFORE"
  | "UNKNOWN_DATE"
  | "CHECKED_TODAY"
  | "EASY_ACTION";

export type SuggestedAction =
  | "use_now"
  | "freeze"
  | "share"
  | "check_quality"
  | "add_date";

export type PlanItem = {
  id: string;
  itemId: string;
  priorityScore: number;
  riskLevel: RiskLevel;
  reasonCodes: PlanReasonCode[];
  explanation: string;
  suggestedAction: SuggestedAction;
  plannedFor: IsoDate;
  status: "open" | "done" | "skipped" | "expired";
};

export type MissionCard = {
  id: string;
  planItemId: string;
  itemId: string;
  phaseLabel: string;
  title: string;
  itemName: string;
  reason: string;
  suggestedAction: string;
  rewardPreview: string;
  urgencyLabel: "Today" | "Soon" | "Review" | "Stable";
  primaryActionLabel: string;
  primaryActionType: FoodActionType;
  secondaryActionLabel?: string;
  secondaryActionType?: FoodActionType;
};

export type PetState = {
  id: string;
  health: number;
  mood: number;
  energy: number;
  trust: number;
  streakDays: number;
  stage: "egg" | "baby" | "grown";
  visualState: "happy" | "calm" | "hungry" | "tired" | "sad" | "sick";
  lastUpdatedAt: IsoDateTime;
  lastScoredActionIds?: string[];
  lastStreakDate?: IsoDate;
  lastRiskPenaltyDate?: IsoDate;
};

export type PetReactionMode = "wave" | "jump" | "review" | "sad" | "waiting" | "ill";

export type PetReaction = {
  id: string;
  mode: PetReactionMode;
  label: string;
  durationMs?: number;
};

export type ImpactMetrics = {
  savedItemCount: number;
  discardedItemCount: number;
  frozenItemCount: number;
  sharedItemCount: number;
  duplicatePurchaseAvoidedCount: number;
  buyAnywayCount: number;
  shoppingCheckCount: number;
  estimatedSavedWeightGrams?: number;
  streakDays: number;
};

export type PurchaseGuardResult =
  | {
      blocked: false;
    }
  | {
      blocked: true;
      reasonCode: "DUPLICATE_ACTIVE_ITEM" | "TOO_MUCH_HIGH_RISK_CATEGORY";
      message: string;
      existingItemIds: string[];
      suggestedAction: "use_existing" | "freeze_existing" | "review_inventory";
    };
