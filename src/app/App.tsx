import { useEffect, useMemo, useState } from "react";
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
import { AiSettings } from "../features/settings/AiSettings";
import {
  clearUserAiSettings,
  loadUserAiSettings,
  saveUserAiSettings,
  type UserAiSettings,
} from "../lib/ai/userAiSettings";
import type { View } from "./types";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [today, setToday] = useState(todayIso());
  const [userAiSettings, setUserAiSettings] = useState<UserAiSettings | undefined>(
    loadUserAiSettings,
  );
  const {
    items,
    actions,
    purchaseDecisions,
    pet,
    petReaction,
    lastToast,
    addManualItem,
    updateInventoryItem,
    recordAction,
    recordPurchaseDecision,
    recalculatePet,
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

  useEffect(() => {
    recalculatePet(today);
  }, [recalculatePet, today]);

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
            petReaction={petReaction}
            today={today}
            onRecordAction={(item, type, quantity, note) =>
              recordAction(item, type, quantity, note, today)
            }
            onNavigate={setView}
            onResetDemo={resetDemo}
            userAiSettings={userAiSettings}
          />
        )}
        {view === "add" && (
          <AddItems
            items={availableItems}
            onAdd={(draft) => addManualItem(draft, today)}
            onNavigate={setView}
            onRecordPurchaseDecision={(input) => recordPurchaseDecision(input, today)}
            userAiSettings={userAiSettings}
          />
        )}
        {view === "inventory" && (
          <Inventory
            items={items}
            today={today}
            onUpdateItem={(item, patch) => updateInventoryItem(item, patch, today)}
            onRecordAction={(item, type, quantity, note) =>
              recordAction(item, type, quantity, note, today)
            }
            onClearAll={clearAll}
          />
        )}
        {view === "impact" && <Impact impact={impact} pet={pet} />}
        {view === "settings" && (
          <AiSettings
            settings={userAiSettings}
            onSave={(settings) => {
              saveUserAiSettings(settings);
              setUserAiSettings(settings);
            }}
            onClear={() => {
              clearUserAiSettings();
              setUserAiSettings(undefined);
            }}
          />
        )}
      </main>

      <Toast message={lastToast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
