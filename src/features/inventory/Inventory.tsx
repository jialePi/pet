import { useState } from "react";
import { Pencil, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import type {
  FoodActionType,
  FoodCategory,
  InventoryItem,
  InventoryItemDraft,
  InventoryStatus,
  IsoDate,
  StorageLocation,
} from "../../types/domain";
import { getRiskLevel } from "../../lib/planning/planning";

type InventoryProps = {
  items: InventoryItem[];
  today: IsoDate;
  onUpdateItem: (item: InventoryItem, patch: Partial<InventoryItemDraft>) => void;
  onRecordAction: (
    item: InventoryItem,
    type: FoodActionType,
    quantity?: number,
    note?: string,
  ) => void;
  onClearAll: () => void;
};

type StatusFilter = "available" | "active" | "all" | InventoryStatus;
type CategoryFilter = "all" | FoodCategory;
type SortMode = "date" | "risk" | "name";

const statusOptions: StatusFilter[] = [
  "available",
  "active",
  "all",
  "used",
  "frozen",
  "shared",
  "discarded",
];

const categoryOptions: CategoryFilter[] = [
  "all",
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

const riskRank = {
  past_suggested_date: 5,
  use_today: 4,
  use_soon: 3,
  unknown: 2,
  stable: 1,
};

export function Inventory({
  items,
  today,
  onUpdateItem,
  onRecordAction,
  onClearAll,
}: InventoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("available");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editDraft, setEditDraft] = useState<Partial<InventoryItemDraft>>({});
  const visibleItems = items
    .filter((item) => matchesSearchQuery(item, searchQuery))
    .filter((item) => categoryFilter === "all" || item.category === categoryFilter)
    .filter((item) => matchesStatusFilter(item, statusFilter))
    .sort((a, b) => compareItems(a, b, sortMode, today));
  const filtersAreActive =
    searchQuery.trim().length > 0 ||
    categoryFilter !== "all" ||
    statusFilter !== "available" ||
    sortMode !== "date";

  function clearFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("available");
    setSortMode("date");
  }

  function startEditing(item: InventoryItem) {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      storageLocation: item.storageLocation,
      suggestedUseByDate: item.suggestedUseByDate,
    });
  }

  function cancelEditing() {
    setEditingId(undefined);
    setEditDraft({});
  }

  function saveEditing(item: InventoryItem) {
    if (!editDraft.name?.trim()) return;
    onUpdateItem(item, {
      ...editDraft,
      name: editDraft.name.trim(),
      quantity: Number(editDraft.quantity ?? item.quantity),
    });
    cancelEditing();
  }

  return (
    <section className="inventory-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Inventory</span>
          <h1>Food list</h1>
        </div>
        <button onClick={onClearAll}>
          <Trash2 aria-hidden="true" /> Clear local data
        </button>
      </div>
      <div className="inventory-controls" aria-label="Inventory controls">
        <label className="inventory-search">
          Search
          <span className="search-input-wrap">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search food names"
            />
          </span>
        </label>
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as CategoryFilter)
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
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="date">suggested date</option>
            <option value="risk">risk</option>
            <option value="name">name</option>
          </select>
        </label>
        <div className="inventory-results">
          <span className="inventory-count">
            {visibleItems.length} of {items.length} shown
          </span>
          {filtersAreActive && (
            <button className="clear-filters" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="inventory-list">
        {visibleItems.length === 0 ? (
          <div className="empty-state">
            <h2>{items.length === 0 ? "Your inventory is empty" : "No items found"}</h2>
            <p>
              {items.length === 0
                ? "Add food from a receipt, photo, or manual entry to get started."
                : "Try another search or clear the current filters."}
            </p>
            {items.length > 0 && filtersAreActive && (
              <button onClick={clearFilters}>
                <RotateCcw aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          visibleItems.map((item) => {
            const isEditing = editingId === item.id;
            const risk = getRiskLevel(item, today);
            const displayRisk = getDisplayRiskLabel(item, risk);
            return (
              <article
                key={item.id}
                className={`inventory-item ${item.status}`}
                aria-label={`${item.name} inventory item`}
              >
                <div className="inventory-main">
                  {isEditing ? (
                    <InventoryEditor
                      draft={editDraft}
                      onChange={setEditDraft}
                      onCancel={cancelEditing}
                      onSave={() => saveEditing(item)}
                    />
                  ) : (
                    <>
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity} {item.unit} · {item.storageLocation} ·{" "}
                        {item.suggestedUseByDate ?? "date needed"}
                      </span>
                      <div className="inventory-tags">
                        <span className="risk-chip">{displayRisk}</span>
                        <span className="status-chip">{item.status}</span>
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="inventory-actions">
                    <button onClick={() => startEditing(item)}>
                      <Pencil aria-hidden="true" /> Edit
                    </button>
                    {(item.status === "active" || item.status === "frozen") && (
                      <div className="action-row">
                        <button onClick={() => onRecordAction(item, "used")}>Used</button>
                        {item.status === "active" && (
                          <button onClick={() => onRecordAction(item, "frozen")}>Frozen</button>
                        )}
                        <button onClick={() => onRecordAction(item, "shared")}>Shared</button>
                        <button onClick={() => onRecordAction(item, "discarded")}>
                          Discarded
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function matchesSearchQuery(item: InventoryItem, searchQuery: string): boolean {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) return true;
  return item.name.toLocaleLowerCase().includes(query);
}

function getDisplayRiskLabel(
  item: InventoryItem,
  risk: ReturnType<typeof getRiskLevel>,
): string {
  if (item.status === "frozen") return "frozen pause";
  if (item.status !== "active") return "completed";
  return risk.replace(/_/g, " ");
}

function matchesStatusFilter(item: InventoryItem, statusFilter: StatusFilter): boolean {
  if (statusFilter === "all") return true;
  if (statusFilter === "available") {
    return item.status === "active" || item.status === "frozen";
  }
  return item.status === statusFilter;
}

function compareItems(
  a: InventoryItem,
  b: InventoryItem,
  sortMode: SortMode,
  today: string,
): number {
  if (sortMode === "name") {
    return a.name.localeCompare(b.name);
  }
  if (sortMode === "risk") {
    return riskRank[getRiskLevel(b, today)] - riskRank[getRiskLevel(a, today)];
  }
  return (a.suggestedUseByDate ?? "9999").localeCompare(
    b.suggestedUseByDate ?? "9999",
  );
}

function InventoryEditor({
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Partial<InventoryItemDraft>;
  onChange: (draft: Partial<InventoryItemDraft>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="inventory-edit-grid">
      <label>
        Name
        <input
          value={draft.name ?? ""}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Quantity
        <input
          type="number"
          min="1"
          value={draft.quantity ?? 1}
          onChange={(event) =>
            onChange({ ...draft, quantity: Number(event.target.value) })
          }
        />
      </label>
      <label>
        Storage
        <select
          value={draft.storageLocation ?? "unknown"}
          onChange={(event) =>
            onChange({
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
        Suggested use date
        <input
          type="date"
          value={draft.suggestedUseByDate ?? ""}
          onChange={(event) =>
            onChange({ ...draft, suggestedUseByDate: event.target.value })
          }
        />
      </label>
      <div className="action-row">
        <button className="primary" disabled={!draft.name?.trim()} onClick={onSave}>
          <Save aria-hidden="true" /> Save
        </button>
        <button onClick={onCancel}>
          <X aria-hidden="true" /> Cancel
        </button>
      </div>
    </div>
  );
}
