# State and Interaction Model

This app has three separate state layers. Keeping them separate avoids confusing behavior.

## 1. Food Inventory State

Inventory state answers: where is the food and can it still be acted on?

| Status | Meaning | Quantity | Planning behavior | UI behavior |
| --- | --- | --- | --- | --- |
| `active` | Food is available for rescue, cooking, freezing, sharing, or discarding. | Remaining amount is editable and decremented by use tasks. | Included in missions and AI daily plan. | Shows risk label such as `use today`, `use soon`, `stable`. |
| `frozen` | Food has been preserved in the freezer. It is still inventory, not completed waste. | Quantity is kept. | Excluded from urgent rescue missions. | Shows `frozen pause` and remains in available inventory. |
| `used` | Food has been fully consumed or rescued. | Usually `0` after partial-use completion, or original amount for one-click legacy action. | Excluded from future planning. | Visible only in filtered or all views. |
| `shared` | Food was given away or donated. | Recorded in action history. | Excluded from future planning. | Visible only in filtered or all views. |
| `discarded` | Food was thrown away. | Recorded in action history. | Excluded from future planning. | Visible only in filtered or all views. |
| `deleted` | User removed the item from local inventory. | Not planned. | Excluded. | Hidden by default. |

Key rule: frozen food is still owned food. It must not look like it was used up.
Key rule: checking food is not an inventory status. It is an action that keeps the item `active` and pushes the user to a follow-up decision.

## 2. Mission and AI Plan State

Mission state answers: what should the user do today?

- Rule missions only use `active` items.
- Frozen items are deliberately paused, so they do not create urgent “use soon” missions.
- AI daily plan also receives only `active` items. This prevents the AI from asking the user to cook frozen food immediately unless the app later adds an explicit thaw workflow.
- If there are no missions but available frozen food exists, the dashboard should say there is no urgent rescue, not “add food”.
- `checked` actions are not terminal. A checked high-risk item stays in missions and should reappear as a follow-up decision: use, freeze, share, or discard.
- Uncertain, past-date, or urgent meat/seafood/prepared food should not show `check` and `freeze` as simultaneous actions. The correct flow is `Step 1: Check` followed by `Step 2: Decide`.

## 3. Pet State

Pet state answers: how is the companion reacting to the household’s waste risk?

The pet reacts to user actions and unresolved active risk:

| Trigger | Pet effect |
| --- | --- |
| Complete a use task | Health, mood, energy, and trust improve. |
| Partially use food | Smaller positive effect and inventory quantity decreases. |
| Freeze food | Energy and trust improve; item moves to `frozen`. |
| Share food | Mood and trust improve; item moves to `shared`. |
| Discard food | State decreases mildly, but the app still treats this as useful data. |
| Check food quality/date | Trust improves, but the rescue streak does not increase. |
| Active high-risk food with no action today | Mood, energy, and trust decrease. |

Frozen items do not create a hungry pet state by themselves. The pet can still mention frozen food as safely parked inventory.

## Synchronization Rules

## Pet Presentation State

`PetState.visualState` is the stable presentation baseline. It is derived from the
pet metrics and unresolved active risk; it must not be used as a per-click event
queue. A separate, transient `PetReaction` is created for a concrete user action.

| Layer | Lifetime | Examples | Rendering rule |
| --- | --- | --- | --- |
| `visualState` | Until metrics/risk change | `calm`, `hungry`, `sad`, `sick` | One populated atlas cell, held steadily. |
| `PetReaction` | One action, then expires | `used`, `frozen`, `checked`, `bought_anyway` | One different populated atlas cell held steadily. |
| Click interaction | One deliberate click | Ask for a clue, encourage, inspect | Show the current reaction copy and one short nudge. |

Presentation invariants:

- Never animate the background-position across an entire atlas row. Some source
  rows contain transparent layout cells after the authored poses.
- Every baseline and reaction pose must point to a validated non-empty cell.
- A reaction must be keyed by a unique event id, so re-rendering or restoring a
  persisted store does not replay an old reaction.
- When a reaction expires, return to the current `visualState`; do not fall back
  to a random or empty frame.
- Stable state is allowed to look calm. Variety comes from distinct state and
  reaction poses, not from an unbounded animation loop or automatic jitter.

| User action | Inventory update | FoodAction update | Mission update | Pet update |
| --- | --- | --- | --- | --- |
| Confirm recognized item | Add `active` item. | None. | New missions may appear. | Trust improves slightly. |
| Check quality/date | Keep item `active`. | Add `checked`. | Keep mission open and regenerate as a follow-up decision. | Trust improves; no rescue streak. |
| Submit AI usage task | Decrease quantity; if zero, set `used`; otherwise remain `active`. | Add `partially_used`. | Task disappears after submission. | Positive rescue effect. |
| Mark Used | Set `used`. | Add `used`. | Remove from missions. | Positive rescue effect. |
| Mark Frozen | Set `frozen`, set storage to `freezer`, keep quantity. | Add `frozen`. | Remove from urgent missions. | Energy/trust effect. |
| Mark Shared | Set `shared`. | Add `shared`. | Remove from missions. | Mood/trust effect. |
| Mark Discarded | Set `discarded`. | Add `discarded`. | Remove from missions. | Mild negative effect. |
| Next day | No inventory mutation. | None. | Recalculate missions against demo date. | Future daily tick can be simulated. |

## AI Plan Synchronization

AI daily plan is a transient execution layer, not the source of truth. It must be reconciled whenever inventory changes.

Rules:

- The source of truth is always `InventoryItem[] + FoodAction[] + today`.
- Today missions are recalculated from the source of truth.
- AI daily plan is generated from the current active items and current missions.
- If a mission action changes an item used by an AI task, the AI plan must be normalized again.
- If a task references an item that is now `frozen`, `used`, `shared`, `discarded`, or otherwise unavailable, remove that task from the AI plan.
- If all AI tasks are removed, show a synced empty state instead of leaving a stale submit button.

Example:

1. AI daily plan says “Use 1 bag Spinach”.
2. User freezes Spinach from Today missions.
3. Spinach changes from `active` to `frozen`.
4. AI plan removes the Spinach usage task.
5. UI says inventory changed and the plan was synced.

## UI Copy Rules

- Use “available” for `active + frozen`.
- Use “mission-ready” or “active” only for food the planner can schedule today.
- Do not show `use soon` on frozen food; show `frozen pause`.
- Do not show “pantry is quiet, add food” when frozen or stable food exists.
- Empty-state copy should distinguish:
  - no inventory,
  - inventory exists but no urgent missions,
  - food exists but all is frozen/paused.

## Future Enhancements

- Add an explicit `thawing` state for frozen food selected for tomorrow.
- Add “Plan thaw” action: frozen -> active with a future planned date.
- Add a daily tick simulation that applies pet penalties or streak changes when the user presses Next day.
