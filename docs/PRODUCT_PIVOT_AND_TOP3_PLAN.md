# Product Pivot and Top 3 Plan

## 1. Executive Decision

This project should not be pitched as an AI fridge inventory manager.

The stronger product is:

> A pet-powered anti-overbuying and food rescue assistant that helps users avoid duplicate purchases and act on the few foods most likely to be wasted today.

This pivot keeps the hackathon theme, keeps the pet, keeps AI, and keeps the current codebase useful. It removes the weakest assumption: that users will precisely track every food item and every bite consumed.

## 2. Why the Old Framing Is Vulnerable

The original framing was:

> Upload photos and receipts, build an inventory, track food quantities, generate plans, and update a pet based on food usage.

Mentor-style objections are valid:

- Users will not reliably log how much ice cream, milk, sauce, rice, or snacks remain.
- Taking photos after eating is slow, awkward, and inaccurate.
- AI image recognition struggles with hidden items, packaging overlap, quantities, and units.
- A full fridge inventory becomes stale as soon as someone else eats something.
- If the product depends on accurate inventory, one bad state breaks trust.
- Recipe generation does not solve the core reason people waste food: they forget, overbuy, change plans, or do not want to cook.

The improved product must avoid requiring precise consumption tracking.

## 3. New Product Thesis

Food waste apps fail when they ask users to maintain a perfect inventory.

This project should instead focus on three high-leverage moments:

1. **Before buying**: prevent duplicate or excessive purchases.
2. **Before food is forgotten**: surface only the top 1-3 rescue decisions.
3. **When the user cannot cook**: offer low-effort fallbacks such as freeze, share, mark gone, or remind tomorrow.

The pet is not the core feature. The pet is the behavior feedback loop that makes these interventions feel immediate, memorable, and emotionally understandable.

## 4. Evidence-Based Positioning

The problem remains strong:

- UNEP's Food Waste Index Report 2024 estimates 1.05 billion tonnes of food waste in 2022 across retail, food service, and households, with 60% happening at household level. Source: [UNEP Food Waste Index Report 2024](https://www.unep.org/resources/publication/food-waste-index-report-2024)
- EPA ranks preventing wasted food among the most preferred pathways because unused food carries the upstream impacts of production, processing, distribution, and preparation. Source: [US EPA Wasted Food Scale](https://www.epa.gov/sustainable-management-food/wasted-food-scale)
- EPA's household guidance emphasizes planning, shopping, storing, and using food before it becomes waste. Source: [US EPA Preventing Wasted Food at Home](https://www.epa.gov/recycle/preventing-wasted-food-home)
- Love Food Hate Waste emphasizes flexible meal planning, shopping lists, and simple habits rather than precision tracking. Source: [Love Food Hate Waste](https://www.lovefoodhatewaste.com/home-page)

Product implication:

> The app should support prevention and light decision support, not exact household inventory accounting.

## 5. Revised Product Name and One-Liner

Working name can remain `pet`, but the pitch name should be more specific.

Recommended:

- **WasteLess Pet**
- **Rescue Pet**
- **Pantry Pet**

One-liner:

> WasteLess Pet is a playful food rescue assistant that checks your planned purchases, reminds you about the few foods most likely to be wasted, and turns rescue actions into a pet feedback loop.

Short pitch:

> We do not ask users to track every bite. Instead, AI helps them quickly add receipts, photos, or shopping plans; the app flags overbuying and daily rescue opportunities; and the pet makes the cost of wasting food visible in a low-pressure way.

## 6. Target User After Pivot

Primary user:

- A student, young professional, or small household that buys groceries but often forgets what is already at home.
- Wants to waste less but will not maintain a spreadsheet-style inventory.
- Is willing to do occasional lightweight check-ins if the app only asks at meaningful moments.

Secondary user:

- Hackathon judges testing the app from a QR code.
- Campus sustainability teams demonstrating food waste behavior change.
- Families using the pet as a light educational tool for children.

Non-target user:

- Users who expect perfect food safety judgement.
- Users who want enterprise inventory management.
- Users who want automatic tracking without any confirmation.
- Users who want nutrition or diet coaching.

## 7. Revised Product Principles

| Principle | Meaning | Product Consequence |
| --- | --- | --- |
| Prevent first | Avoiding overbuying is stronger than logging waste afterward. | Purchase guard becomes core, not optional. |
| Track risk, not grams | The product should know what may be wasted, not exact remaining mass. | Use coarse states: unopened, opened, some left, almost gone, gone. |
| Ask less | Every user prompt must have a clear reason. | Daily plan shows max 1-3 actions. |
| Confirm AI | AI reduces typing but never silently mutates inventory. | All AI output becomes editable candidate items. |
| Explain interventions | Users accept blocking if the reason is clear. | Pet must explain: "You already have X." |
| Make fallback easy | Not cooking is normal. | Every mission has freeze/share/remind options. |
| Avoid shame | Guilt causes avoidance. | Pet feedback is urgent but not moralizing. |
| Demo stable first | Hackathon points come from clarity and reliability. | Mock/demo fallback remains the default public path. |

## 8. Product Scope Changes

### Keep

- Pet dashboard.
- Receipt/photo/manual add flows.
- Inventory list.
- Daily missions.
- Purchase guard.
- Impact page.
- QR demo.
- Local-first judge isolation.
- Optional AI recognition.

### Reduce

- Exact quantity tracking.
- Detailed recipe planning.
- Claims about automatic OCR accuracy.
- Claims about knowing exact consumption.
- Large weekly plans that look like chores.

### Add or emphasize

- Shopping intention check.
- Coarse item status.
- Low-confidence inventory states.
- Daily top 3 rescue decisions.
- Fallback actions when user cannot cook.
- Mentor objection response in pitch.

## 9. Revised Core User Flows

### Flow A: Shopping Guard

Goal: stop waste before it enters the home.

1. User opens `Check & Add`.
2. User types or uploads planned purchases.
3. AI/rules detect possible duplicate or overbuying.
4. Pet responds with a clear objection.
5. User chooses:
   - `Remove from list`
   - `Buy smaller amount`
   - `Check fridge first`
   - `Buy anyway`

Example pet response:

> I would pause on spinach. You already have one opened pack and one rescue mission for today. Buy milk if needed, but skip spinach unless you are cooking it tonight.

Acceptance criteria:

- The user can understand the warning in under 5 seconds.
- The warning cites current inventory, risk, or recent purchase history.
- Override is possible but recorded as a decision.

### Flow B: Daily Rescue Decisions

Goal: make today's food action obvious.

1. Dashboard shows max 1-3 rescue cards.
2. Each card explains the reason.
3. Each card has quick actions:
   - `Use some`
   - `Finished`
   - `Freeze`
   - `Share`
   - `Remind tomorrow`
   - `Discard`

Example:

> Check opened spinach today. It is a high-risk item and has been skipped once.

Acceptance criteria:

- No mission asks for exact grams unless the item is countable.
- The plan updates immediately after action.
- Pet state changes are visible and explained.

### Flow C: Lightweight Check-In

Goal: update uncertain inventory without asking for precision.

1. Pet asks about one high-risk item.
2. User chooses a coarse status:
   - `Still unopened`
   - `Opened`
   - `Some left`
   - `Almost gone`
   - `Finished`
   - `Not sure`
3. The item risk and future reminders update.

Acceptance criteria:

- Check-in takes one click.
- `Not sure` is allowed.
- The app does not punish uncertainty.

### Flow D: Food Rescue Fallback

Goal: avoid "I cannot cook, so I ignore it."

1. User opens a mission.
2. If they cannot cook, they choose `No time`.
3. Pet offers:
   - `Freeze it`
   - `Share it`
   - `Move to tomorrow`
   - `Mark gone`

Acceptance criteria:

- Every mission has a non-cooking path.
- Repeated deferral lowers priority confidence and nudges stronger action.

## 10. Data Model Changes

Add or emphasize these fields.

```ts
type ItemTrackingMode = "countable" | "container" | "bulk" | "leftover" | "unknown";

type ItemPresenceState =
  | "unopened"
  | "opened"
  | "some_left"
  | "almost_gone"
  | "finished"
  | "frozen"
  | "shared"
  | "discarded"
  | "unknown";

type ConfidenceLevel = "high" | "medium" | "low";

type PurchaseDecision =
  | "blocked_duplicate"
  | "reduced_quantity"
  | "checked_fridge"
  | "bought_anyway"
  | "approved";
```

Item rules:

- Countable items can still use quantity, for example eggs, yogurt cups, apples.
- Container and bulk items should use coarse states, for example ice cream, milk, rice, sauce.
- Unknown items default to `presenceState: "unknown"` and should not produce aggressive warnings.
- AI should output confidence; low-confidence items must be confirmed.

## 11. Planning Algorithm Changes

The algorithm should prioritize decisions, not full meal plans.

Inputs:

- Suggested use date.
- Category risk.
- Opened/unopened state.
- Skipped count.
- Purchase duplication risk.
- User action history.
- Confidence level.

Output:

- Max 3 daily rescue decisions.
- Each decision includes reason, urgency, and fallback.

Scoring sketch:

```txt
priority =
  dateRisk
  + openedRisk
  + categoryRisk
  + skippedPenalty
  + duplicatePurchaseRisk
  - lowConfidencePenalty
```

Rules:

- Never show more than 3 daily missions.
- If item confidence is low, mission should be "Check this item", not "Use this item".
- If a mission is deferred twice, offer freeze/share before another recipe.
- If an item is marked `some_left`, keep it eligible but reduce exact quantity assumptions.

## 12. Pet System Changes

The pet should reward prevented waste and useful decisions, not perfect logging.

Positive events:

- Duplicate purchase avoided.
- Quantity reduced.
- High-risk item checked.
- High-risk item used, frozen, or shared.
- User chose fallback instead of ignoring.

Negative events:

- Item discarded.
- Multiple high-risk items ignored.
- User repeatedly buys duplicates despite warnings.

Avoid:

- Punishing users for selecting `Not sure`.
- Making the pet look sick too easily.
- Shaming wording such as "you failed".

Recommended pet copy:

- "Good catch. Skipping duplicate spinach keeps me steady."
- "No time to cook is okay. Freezing is still a rescue."
- "I am unsure about this item. Can we check it quickly?"
- "Buying anyway is allowed. I will remember this for the impact view."

## 13. AI Role After Pivot

AI should be helpful but not load-bearing.

AI responsibilities:

- Parse receipts into candidate items.
- Identify visible food categories from photos.
- Convert messy shopping text into structured planned purchases.
- Suggest simple rescue options.
- Generate a friendly pet explanation.

AI must not:

- Decide food safety.
- Automatically mark food consumed.
- Claim exact remaining quantity from a normal photo.
- Mutate inventory without user confirmation.

Stable fallback:

- Mock recognition for public demo.
- Rule-based purchase guard.
- Rule-based daily rescue decisions.
- Rule-based pet state.

This makes the demo reliable even if API keys, network, or model output fail.

## 14. Frontend Changes Needed

### Dashboard

Change the main headline from inventory management to daily decisions.

Recommended sections:

1. Pet status and message.
2. Today's 1-3 rescue decisions.
3. Shopping guard entry point.
4. Impact summary.

### Add Page

Split Check & Add into:

- `Before buying`: shopping list check.
- `Scan food`: receipt/photo candidates.
- `Add food`: manual item form.

The Before buying section should be visually prominent because it supports prevention.

### Inventory Page

Change the list emphasis:

- Show status chips: unopened, opened, some left, almost gone, unknown.
- Show confidence chips.
- For bulk/container items, avoid exact quantity-first UI.
- Keep quantity for countable items only.

### Mission Cards

Each mission should show:

- Item name.
- Why now.
- Confidence.
- One primary action.
- Two fallback actions.
- Pet reward preview.

### Impact Page

Show estimates as estimates:

- Items rescued.
- Duplicate purchases avoided.
- Buy-anyway overrides.
- Discarded items.
- Estimated money saved.
- Estimated CO2e avoided.

Add copy:

> Impact is estimated from user actions and average item values. It is intended for behavior feedback, not formal measurement.

## 15. Hackathon Demo Strategy

The demo must directly answer mentor objections.

### 3-Minute Demo Script

1. **Problem**
   - "Most food waste at home is not because people hate food. It is because they forget, overbuy, or change plans."

2. **Reject perfect inventory**
   - "We intentionally do not ask users to track every gram or every bite."

3. **Add shopping plan**
   - User enters: `spinach, milk, ice cream`.
   - Pet blocks spinach because inventory already has an opened/high-risk spinach.

4. **Daily rescue**
   - Dashboard shows 2 missions, not a long list.
   - User marks spinach as `Use some` or `Freeze`.

5. **Fallback**
   - User clicks `No time`.
   - Pet suggests freezing or sharing.

6. **Impact**
   - Show duplicate purchase avoided and rescue action recorded.

7. **QR/demo isolation**
   - "Every judge gets isolated local data on their phone. No login, no shared backend, stable demo."

### Judge Takeaway

The app is not trying to be a perfect fridge database.

It is trying to interrupt the two behaviors that cause avoidable waste:

- buying what you already have;
- forgetting the foods most likely to be wasted today.

## 16. Top 3 Differentiation

To compete for top 3, the project needs a sharper story than "AI app for food waste".

### Differentiator 1: Honest Product Constraint

Say clearly:

> We avoid exact consumption tracking because it is unrealistic.

This sounds mature and product-aware.

### Differentiator 2: Prevention Before Recording

Many projects measure waste after it happens. This project prevents waste before purchase.

### Differentiator 3: Emotional Feedback Loop

The pet makes invisible waste consequences visible without requiring a complex dashboard.

### Differentiator 4: Demo Reliability

The app works offline/local-first with mock fallback. Judges can scan QR and test independently.

### Differentiator 5: AI With Guardrails

AI is used where it reduces friction, but not where it would create false trust.

## 17. Risks and Rebuttals

| Criticism | Strong Response |
| --- | --- |
| Users will not track every bite. | Correct. We do not ask them to. We track coarse status and high-risk decisions. |
| Photos cannot know exact quantities. | Correct. Photos create editable candidates, not truth. |
| Recipes do not solve food waste. | Recipes are secondary. The core is purchase guard and rescue reminders. |
| This is just a cute reminder app. | The pet is tied to purchase decisions, rescued items, discarded items, and override behavior. |
| Impact numbers are fake. | They are estimates for feedback, clearly labeled. The measurable signals are avoided duplicates and rescue actions. |
| A standalone app may not be sticky. | Hackathon MVP proves the behavior loop. Future versions can integrate with shopping lists, receipts, or campus programs. |
| Food safety is risky. | The app uses suggested use dates and check prompts, not safety guarantees. |

## 18. Implementation Priority

### Must Do for Stronger Demo

- Add shopping plan / purchase guard as a first-class flow.
- Add coarse status labels for inventory.
- Limit daily missions to 1-3.
- Add fallback buttons to missions.
- Update pet copy to explain anti-overbuying.
- Update pitch and README demo section.

### Should Do

- Add confidence chips for AI candidates.
- Add "unknown" state.
- Add impact metric for duplicate purchases avoided.
- Add demo seed data with opened/high-risk item and planned duplicate.

### Could Do

- Improve pet animation.
- Add AI-generated short rescue message.
- Add mobile QR polish.
- Add campus/household future roadmap slide.

### Do Not Do Before Demo

- Do not build exact weight/volume tracking.
- Do not build full meal planner.
- Do not build account system.
- Do not build multi-user sync.
- Do not rely on real OCR for the main demo.

## 19. Updated Success Metrics

### Demo Metrics

- A judge can understand the product in 30 seconds.
- A judge can trigger a purchase warning in under 20 seconds.
- A judge can complete a rescue action in under 10 seconds.
- The app shows pet, inventory, mission, and impact changes after one action.
- QR demo works independently on each judge phone.

### Product Metrics

- Duplicate purchase warnings shown.
- Duplicate purchases avoided.
- High-risk items checked.
- High-risk items rescued by use/freeze/share.
- Repeated deferrals.
- Buy-anyway override rate.
- Discarded item rate.

### Research Metrics for Future Validation

- Does the app reduce duplicate grocery purchases over one week?
- Does the app increase the number of high-risk items checked before shopping?
- Does the app reduce self-reported forgotten food?
- Do users prefer pet reminders over normal notifications?

## 20. Revised Roadmap

### Remaining Hackathon Work

1. Update product copy and pitch.
2. Make shopping guard more prominent.
3. Add coarse status wording to UI.
4. Add mission fallback actions.
5. Add impact metric for duplicate purchases avoided.
6. Verify QR/mobile demo.

### Post-Hackathon V1

- Browser notification for high-risk items.
- Shopping list import.
- Better receipt parser.
- Better item category/risk mapping.
- Lightweight weekly review.

### Post-Hackathon V2

- Optional household sync.
- Retail receipt integration.
- Calendar-aware planning.
- Campus leftover sharing mode.

## 21. Final Product Statement

The strongest version of this project is not a smart fridge replacement.

It is a low-friction behavior intervention:

> It helps users pause before buying food they already have, remember the few foods most likely to be wasted, and take one simple rescue action before waste happens.

That is more realistic, easier to demo, and harder for a mentor or judge to dismiss.
