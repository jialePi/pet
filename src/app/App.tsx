import { useMemo, useState } from "react";
import { addDays, parseISO } from "date-fns";
import type { MissionCard } from "../types/domain";
import { usePetStore } from "../lib/storage/usePetStore";
import { toIsoDate, todayIso } from "../lib/dates/dates";
import { generatePlan } from "../lib/planning/planning";
import { createMissionCard } from "../lib/planning/missions";
import { calculateImpact } from "../lib/impact/impact";
import { Topbar } from "../components/layout/Topbar";
import { Toast } from "../components/ui/Toast";
import { Dashboard } from "../features/dashboard/Dashboard";
import { AddItems } from "../features/add-items/AddItems";
import { Inventory } from "../features/inventory/Inventory";
import { Impact } from "../features/impact/Impact";
import type { View } from "./types";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [today, setToday] = useState(todayIso());
  const {
    items,
    actions,
    purchaseDecisions,
    pet,
    lastToast,
    addManualItem,
    updateInventoryItem,
    recordAction,
    recordPurchaseDecision,
    resetDemo,
    clearAll,
    dismissToast,
  } = usePetStore();
  const availableItems = items.filter((item) =>
    item.status === "active" || item.status === "frozen",
  );
  const plan = useMemo(
    () => generatePlan({ items, actions, today }),
    [items, actions, today],
  );
  const missions = plan.today
    .map((planItem) => {
      const item = items.find((candidate) => candidate.id === planItem.itemId);
      return item ? createMissionCard(planItem, item) : undefined;
    })
    .filter((mission): mission is MissionCard => Boolean(mission));
  const impact = calculateImpact({ items, actions, purchaseDecisions, pet });

  return (
    <div className="app-shell">
      <Topbar
        view={view}
        today={today}
        onNavigate={setView}
        onNextDay={() => setToday((current) => toIsoDate(addDays(parseISO(current), 1)))}
        onResetToday={() => setToday(todayIso())}
      />

      <main>
        {view === "dashboard" && (
          <Dashboard
            items={items}
            availableItems={availableItems}
            missions={missions}
            pet={pet}
            today={today}
            onRecordAction={recordAction}
            onNavigate={setView}
            onResetDemo={resetDemo}
          />
        )}
        {view === "add" && (
          <AddItems
            items={availableItems}
            onAdd={addManualItem}
            onNavigate={setView}
            onRecordPurchaseDecision={recordPurchaseDecision}
          />
        )}
        {view === "inventory" && (
          <Inventory
            items={items}
            today={today}
            onUpdateItem={updateInventoryItem}
            onRecordAction={recordAction}
            onClearAll={clearAll}
          />
        )}
        {view === "impact" && <Impact impact={impact} pet={pet} />}
      </main>

      <Toast message={lastToast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
