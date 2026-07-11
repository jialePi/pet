# 状态和存储

## 状态分类

| 类型 | 示例 | 当前存储位置 |
| --- | --- | --- |
| 持久领域数据 | 库存、行动历史、宠物状态 | Zustand persist / localStorage |
| 派生数据 | Today missions、风险等级、AI daily plan、影响指标 | 内存计算 |
| UI 状态 | 表单输入、当前 view、modal、AI plan step progress | React state |
| 用户偏好 | demo date、默认储存位置等 | 当前为 React/local state；后续可持久化 |

## Source of Truth

当前 source of truth 是：

- `InventoryItem[]`
- `FoodAction[]`
- `PetState`
- demo `today`

以下数据不应作为权威状态长期保存：

- `RiskLevel`
- `PlanItem`
- `MissionCard`
- `AiDailyPlanResponse`
- AI recipe step completion
- impact metrics

这些数据应由 source of truth 重新计算。

## 当前实现

当前实现使用 `zustand` + `persist`：

```text
lib/storage/usePetStore.ts
```

持久化内容：

- `items`
- `actions`
- `pet`
- `lastToast`

注意：

- 公开 MVP 为本地 demo，不处理账号、多设备同步或服务端持久化。
- `lastToast` 可以后续排除出持久化，目前对 demo 影响很小。
- demo date 当前在 `App` state 中，不持久化。

## 状态迁移规则

库存动作应通过 `lib/storage/inventoryUsage.ts` 处理：

- `partially_used`: 扣减数量；剩余为 0 时转为 `used`。
- `checked`: 不改变库存状态或数量，只记录用户完成质量/日期检查。
- `date_adjusted`: 不改变库存状态，记录建议使用日期被修正。
- `quantity_adjusted`: 不改变库存状态，记录数量被修正。
- `used`: 转为 `used`。
- `frozen`: 转为 `frozen`，数量不变，`storageLocation` 改为 `freezer`。
- `shared`: 转为 `shared`。
- `discarded`: 转为 `discarded`。

不要在 UI 组件中手写这些迁移。

## 派生数据同步

### Today missions

由 `generatePlan({ items, actions, today })` 派生。

- 只使用 `active` items。
- `frozen` items 保留在 inventory，但不进入 urgent missions。
- `checked` 不会移除 mission；它让同一个 active item 在重算后进入后续决策。

### AI daily plan

AI daily plan 是临时执行层：

- 生成时读取当前 active items 和 missions。
- 库存变化后必须重新归一化。
- 引用已 frozen/used/shared/discarded item 的 usage task 必须移除。

### Pet state

宠物状态由 action 和 active high-risk items 推导更新：

- 冻结食物提升 energy/trust，但不继续制造 hungry 状态。
- 检查食物提升 trust，但不是 rescue completion，不增加 streak。
- 修正日期或数量提升 trust，但不是 rescue completion，不增加 streak。
- 添加新物品只创建 planning 输入，不直接改变 pet score。
- 没有 active high-risk item 时不惩罚用户。

## 清除数据

UI 应提供：

- 清空本地库存和行动。
- 恢复 demo 数据。
- 重置宠物状态。

清除操作只影响当前浏览器。

## 后续 IndexedDB 迁移

如果后续需要 IndexedDB/Dexie，应新增 schema：

```text
inventoryItems: id, status, category, suggestedUseByDate, storageLocation, updatedAt
foodActions: id, itemId, type, occurredAt
petState: id, lastUpdatedAt
settings: key
```

迁移要求：

- 增加版本号。
- 写迁移逻辑。
- 保留旧 demo 数据兼容。
- 更新 [../DATA_MODEL.md](../DATA_MODEL.md) 和测试计划。

## 图片存储

MVP 默认不持久化图片二进制。

可选策略：

- 只保留文件名和识别结果。
- 使用 object URL 做本次会话预览。
- 增强版再使用对象存储。

小票原图可能包含隐私信息，不应默认长期保存。
