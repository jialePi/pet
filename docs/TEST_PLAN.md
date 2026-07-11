# 测试计划

## 测试目标

验证 `pet` 的核心闭环是否可靠：

```text
添加物品 -> 确认库存 -> 生成计划 -> 完成行动 -> 宠物状态变化 -> 成果统计
```

## 测试分层

| 层级 | 目标 | 工具建议 |
| --- | --- | --- |
| Unit | 算法、状态计算、数据校验 | Vitest |
| Component | 表单、列表、宠物组件 | Testing Library |
| Integration | 添加物品到计划生成 | Vitest + local storage/store mock |
| E2E | 用户完整路径 | Playwright |
| Manual demo | hackathon 演示稳定性 | 预置样本和脚本 |

## 单元测试

### 计划算法

必须覆盖：

- 临期物品排在稳定物品前。
- 高风险类别在同日期下优先级更高。
- 低置信日期不会被强行排到最高。
- 已使用、已分享、已丢弃物品不进入 active 计划。
- 延后次数会提高后续优先级。
- 缺少日期的物品进入 `Review`。

示例用例：

```text
Given spinach has 1 day left and rice has 90 days left
When today plan is generated
Then spinach appears before rice
```

### 宠物状态

必须覆盖：

- 完成计划提升 health、mood、energy 或 trust。
- 丢弃未临期物品降低状态。
- 数值不会超过 100 或低于 0。
- 连续完成天数按规则增加。
- 没有高风险物品时不会惩罚用户。

### 数据校验

必须覆盖：

- 数量不能为负数。
- 日期字段必须是有效日期。
- 未确认候选项不能进入库存。
- 置信度必须在 `0-1`。

## 组件测试

### 添加物品表单

- 必填字段缺失时显示错误。
- 用户可修改识别候选项。
- 用户可拒绝识别候选项。
- 批量确认只加入未拒绝候选项。
- 编辑候选项时仍会经过购买防护。
- 候选项可编辑 quantity、unit 和 notes，避免把 `3L`、`500g`、购买件数混淆。
- 低置信字段显示“请确认”。
- 非食物条目可删除。

### 库存列表

- 按建议使用日期排序。
- 可按风险和名称排序。
- 默认显示 available 物品，即 `active + frozen`。
- 可按 used、frozen、shared、discarded 等状态筛选。
- 风险标签和文字同时显示。
- frozen 物品显示 `frozen pause`，不显示 `use soon`。
- 行动按钮可用。
- 编辑入口可修改名称、数量、储存位置和建议使用日期。
- 空状态显示添加入口。

### 宠物组件

- 不同状态显示不同文案和视觉状态。
- 状态变化后 UI 更新。
- 动画不是唯一反馈。
- 点击宠物显示当前状态文案。
- 购物检查能提示先查看库存、处理临期或重复风险。
- AI coach 配置成功时显示 AI 计划建议。
- AI coach 未配置或失败时显示规则兜底，不阻塞任务。
- 完成任务后显示奖励反馈。
- reduced motion 下核心反馈仍可见。

### 任务卡片

- 每张任务卡显示标题、物品、原因、行动和奖励预览。
- 每张任务卡显示阶段标签：`Step 1: Check`、`Step 2: Decide` 或 `Waste blocker`。
- `rescue`、`freeze`、`review` 至少各有一个组件测试。
- 主按钮能完成任务。
- 次按钮能跳过、冷冻或重新规划。
- `review/check` 卡片不能同时提供 freeze 按钮。
- 点击 `Checked` 后 item 仍为 `active`，mission 不消失，并在下一次重算中变成 use/freeze/share/discard 后续决策。
- `Checked` 提升 pet trust，但不计入 rescue streak，也不计入 avoided waste impact。

### AI daily plan

- AI daily plan 基于当前 Today missions 和 active items 生成。
- recipe steps 必须逐步完成后才能提交 usage task。
- 提交 usage task 后库存数量减少；数量为 0 时 item 变成 `used`。
- 如果 usage task 消耗剩余全部数量，记录 `used` action；否则记录 `partially_used` action。
- 如果 Today mission 先把同一个 item 标记为 `frozen`、`used`、`shared` 或 `discarded`，AI daily plan 中引用该 item 的 task 必须自动移除。
- stale task 移除后 UI 必须显示已同步提示，不允许保留卡住的 submit 按钮。

### 购买防护

- 添加与 active 库存同名物品时显示宠物阻止提示。
- 阻止提示包含原因和现有库存。
- “先处理现有库存”不会添加新物品，并返回 Dashboard 或 Inventory。
- “仍然添加”会添加物品，并显示覆盖提示。
- 不重复的物品可直接添加。

## 集成测试

### 小票到计划

```text
Given mock receipt returns spinach, yogurt, rice
When user accepts all candidates
Then inventory contains 3 active items
And today plan recommends spinach first
```

### 照片到库存

```text
Given mock image classifier returns banana with medium confidence
When user edits quantity and confirms
Then inventory stores the edited quantity
```

### 拖拽图片识别

```text
Given the user has a fridge or food photo file
When the image is dropped on the AI image recognition zone
Then the app calls recognition
And shows candidates or a recoverable API-key error
```

### 购物清单检查到库存

```text
Given inventory already contains bananas
When user tries to add bananas again
Then purchase guard appears
And the item is not added until user confirms override
```

### 行动到宠物

```text
Given today plan contains spinach
When user marks spinach as used
Then the item status becomes used
And pet mood increases
And impact saved count increases
```

### AI plan 与 mission 同步

```text
Given AI daily plan contains a task to use Spinach
When user freezes Spinach from Today missions
Then Spinach becomes frozen and storageLocation becomes freezer
And the AI daily plan removes the Spinach task
And the UI shows a synced-plan message
```

## E2E 测试

核心路径：

1. 新用户打开应用。
2. 点击“使用演示数据”或上传 mock 小票。
3. 确认候选物品。
4. 查看今日计划。
5. 完成一个计划项。
6. 验证宠物状态变化。
7. 刷新页面。
8. 验证库存和宠物状态仍存在。

当前自动化覆盖：

- Dashboard demo mission 完成。
- 宠物购物检查互动。
- 重复物品购买防护、查看现有库存和覆盖添加。
- 库存默认 available 过滤、编辑保存。
- mock receipt 候选项编辑后确认进入库存。
- 本地状态刷新后保持。
- frozen item 保留在 available inventory，并显示 frozen pause。
- AI daily plan 在 mission action 改变同一 item 后同步移除 stale task。

异常路径：

- 上传无法识别的图片。
- 拒绝所有识别候选。
- 手动添加日期缺失物品。
- 标记物品为丢弃。
- 删除所有库存。

## 手动演示验收

Hackathon 展示前必须手动跑通：

- 演示数据一键加载。
- 小票上传路径可展示。
- 照片上传路径可展示。
- 今日计划至少生成 3 个不同风险物品。
- 宠物至少有 happy、tired、sad 三种状态。
- Dashboard 呈现“宠物房间 + 今日任务卡片”。
- 点击宠物能出现提醒或鼓励文案。
- 完成任务后能看到宠物反馈和奖励 toast。
- 断网时 mock 版本仍可演示。

## 非功能测试

### 性能

- 首页首屏在普通笔记本上 2 秒内可交互。
- 100 个库存项列表滚动不卡顿。
- 计划生成在 100 个库存项内小于 100ms。

### 隐私

- 不在 console 输出小票全文。
- 不把图片上传到外部服务，除非用户明确选择真实 OCR 模式。
- 提供清除本地数据入口。

### 可访问性

- 键盘可完成主要流程。
- 风险状态有文字，不只靠颜色。
- 图片上传失败有明确错误信息。

### 参考说明和安全文案

- 日期标签说明可在添加或确认物品流程中看到。
- 食品安全免责声明可在设置、帮助或确认流程中看到。
- 文案不包含“这个食物一定安全”“过了这个日期必须丢弃”等确定性判断。
- 开启真实 OCR 模式前有图片上传到第三方服务的说明。

## 测试数据

建议维护：

```text
src/test/fixtures/
  inventory.ts
  actions.ts
  pet.ts
  recognition.ts
public/demo/
  receipts/
    clear-receipt.jpg
    blurry-receipt.jpg
    receipt-with-non-food.jpg
  food-photos/
    single-produce.jpg
    multi-item-fridge.jpg
    unknown-item.jpg
```

## 完成定义

一个功能只有同时满足以下条件才算完成：

- 有用户可见流程。
- 有数据持久化或明确不需要持久化。
- 有错误状态。
- 有至少一个测试。
- 如果公开 GitHub 最小仓库暂不包含测试，则必须至少有本地测试或手动验收记录。
- 文档中的需求、数据模型和测试计划已同步。
