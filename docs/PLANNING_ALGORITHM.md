# 使用规划算法

## 目标

根据库存信息生成一个用户愿意执行的计划，而不是只按日期排序。算法需要同时考虑临期风险、数量、类别、用户行动成本和宠物反馈。

## 输入

- 已确认库存项。
- 当前日期。
- 储存位置。
- 建议使用日期。
- 食物类别。
- 数量。
- 用户偏好。
- 历史延后次数。
- 最近行动记录。

## 输出

- 今日计划。
- 本周计划。
- 每项推荐原因。
- 风险等级。
- 宠物状态影响预估。

## 风险等级

```ts
type RiskLevel =
  | "past_suggested_date"
  | "use_today"
  | "use_soon"
  | "stable"
  | "unknown";
```

建议规则：

- `past_suggested_date`: 当前日期晚于建议使用日期。
- `use_today`: 建议使用日期是今天或明天。
- `use_soon`: 建议使用日期在 2 到 4 天内。
- `stable`: 建议使用日期在 5 天之后。
- `unknown`: 缺少日期或置信度太低。

## 优先级评分

基础公式：

```text
priorityScore =
  dateUrgency
  + categoryRisk
  + quantityPressure
  + checkedTodayBoost
  + confidenceAdjustment
  - actionFriction
```

### dateUrgency

```text
past suggested date: +50
0-1 days left:       +40
2-4 days left:       +25
5-7 days left:       +10
unknown:             +8
```

### categoryRisk

```text
produce:   +15
dairy:     +12
meat:      +18
seafood:   +20
prepared:  +16
bakery:    +10
pantry:    +2
frozen:    +0
```

### quantityPressure

```text
large quantity: +8
medium:         +4
small:          +0
```

### checkedTodayBoost

当天已经 `checked` 但还没有完成 use/freeze/share/discard 后续决策时：`+12`。

### confidenceAdjustment

低置信日期不应强行高优先级：

```text
date confidence >= 0.8: +0
0.5 - 0.79:             -4
< 0.5 or missing:       -8 and mark as Review
```

### actionFriction

```text
requires cooking:       -5
requires long prep:     -8
ready to eat:           +3
easy to freeze:         +2
```

## 推荐原因

每个计划项必须给出可读解释。

原因代码：

- `DATE_SOON`
- `PAST_SUGGESTED_DATE`
- `HIGH_RISK_CATEGORY`
- `LARGE_QUANTITY`
- `UNKNOWN_DATE`
- `CHECKED_TODAY`
- `EASY_ACTION`

示例：

```text
Use spinach today because it is a high-priority produce item and its suggested use date is tomorrow.
```

## 今日计划生成

步骤：

1. 过滤 `active` 库存。`frozen` 属于 preserved/paused inventory，不进入今日 urgent mission。
2. 计算风险等级。
3. 计算优先级分数。
4. 排除用户今天已完成终止行动的物品：`used`、`partially_used`、`frozen`、`shared`、`discarded`。
5. 选择最高分 1 到 5 项。
6. 为每项生成行动建议。

`checked` 不是终止行动。它表示用户已经检查质量或日期，但还没有真正阻止浪费。当天检查过的物品仍保留在计划里，并提高优先级，下一步建议必须变成明确决策：

- 如果可以吃：`use_now`。
- 如果不现实当天烹饪，且适合保存：`freeze`。
- 如果不能吃或不安全：记录 `discarded`。

重要规则：不确定、过建议日期、或临期的 meat/seafood/prepared food 不能在同一张卡上同时要求 `check` 和 `freeze`。先显示 `Step 1: Check`；用户检查后，重新生成 `Step 2: Decide`。

## AI coach 增强

MVP 中计划优先级仍由规则引擎决定，AI 不直接覆盖排序或食品安全边界。配置 `GOOGLE_AI_API_KEY` 后，Dashboard 的 `AI coach` 会把 active 库存、规则生成的 missions 和宠物状态发送到本地 `/api/coach`，生成：

- 更自然的宠物台词。
- 一句今日计划总结。
- 1 到 3 个轻量行动建议。

AI coach 只能做表达和建议增强：

- 不能改变库存状态。
- 不能直接完成任务。
- 不能绕过购买防护。
- 不能承诺食物一定安全。
- 对不确定或过建议日期的物品必须提醒用户结合气味、外观、包装、储存情况和当地食品安全建议判断。

未配置 key 或调用失败时，UI 使用本地规则兜底文案。

## AI daily plan 同步

`AI daily plan` 不是计划权威来源，而是 Today missions 的执行层。

生成输入：

- 当前 demo date。
- 当前宠物状态。
- 当前 Today missions。
- 当前 `active` 食物。

输出：

- 1 到 3 个菜谱。
- 可逐步完成的 recipe steps。
- 可提交的 usage tasks。

同步规则：

- 如果库存或 mission 改变，客户端必须重新归一化 AI plan。
- 如果 usage task 引用的 item 已经不再 `active`，该 task 必须移除。
- 如果所有 usage tasks 被移除，UI 显示 synced empty state，而不是保留失效的 submit 按钮。
- AI 不能直接改变库存；只有用户提交 usage task 或 mission action 才能写入 `FoodAction`。

行动建议：

- `use_now`
- `freeze`
- `share`
- `check_quality`
- `add_date`

## 本周计划生成

本周计划应避免每天推荐太多。

建议：

- 每天最多 3 个重点物品。
- 同类食材尽量组合。
- 高风险物品提前到本周前半段。
- 低置信物品优先请求用户补充信息。

## 重新规划

用户可以选择：

- 今天不吃这个。
- 没时间做饭。
- 已经吃完但忘记记录。
- 这个物品看起来不安全。

系统响应：

- 重新排序。
- 更新物品状态或备注。
- 宠物状态小幅变化，不做重惩罚。

## 示例

输入：

```json
[
  { "name": "Spinach", "category": "produce", "daysLeft": 1, "quantity": 1 },
  { "name": "Yogurt", "category": "dairy", "daysLeft": 3, "quantity": 4 },
  { "name": "Rice", "category": "pantry", "daysLeft": 90, "quantity": 1 }
]
```

输出：

```text
1. Spinach: use today.
2. Yogurt: plan for this week.
3. Rice: stable, no action needed.
```
