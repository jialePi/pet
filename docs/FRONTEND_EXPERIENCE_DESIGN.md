# 前端体验设计

## 体验定位

`pet` 的前端不应像传统库存表，也不应像营销页。它应像一个“冰箱任务中心 + 宠物房间”：

- 库存和计划是底层逻辑。
- 用户第一眼看到的是宠物、今日任务和浪费减少成果。
- 任务语气轻松、有趣，但不牺牲可解释性和可操作性。

## 第一屏布局

### Desktop

```text
┌────────────────────────────────────────────────────────────┐
│ Header: pet / Home / Check & Add / Inventory / Results / AI │
├───────────────────────┬───────────────────┬────────────────┤
│ Pet Room              │ Food to save      │ Kitchen snapshot│
│                       │                   │                │
│ animated pet          │ mission cards     │ use today: 2   │
│ kitchen/fridge scene  │ primary actions   │ this week: 5   │
│ status bars           │ reward preview    │ saved: 8       │
└───────────────────────┴───────────────────┴────────────────┘
```

### Mobile

```text
┌────────────────────┐
│ Pet Room           │
├────────────────────┤
│ Food to save       │
├────────────────────┤
│ Kitchen snapshot   │
├────────────────────┤
│ Bottom Navigation  │
└────────────────────┘
```

## 视觉方向

风格关键词：

- warm utility
- playful but not childish
- kitchen companion
- task board

推荐视觉元素：

- 小厨房、冰箱、食品柜、餐桌。
- 冰箱贴、便签、任务卡。
- 宠物在厨房或冰箱旁活动。
- 食物卡片像轻量任务板。

避免：

- 纯表格首页。
- 大面积营销 hero。
- 过度幼稚的低龄化 UI。
- 只有绿色的单色环保主题。
- 宠物动画遮挡任务信息。

## 配色建议

基础色：

- Warm white: 背景。
- Fresh green: 成功、使用、健康。
- Tomato red: 高风险提醒。
- Freezer blue: 冷冻行动。
- Sun yellow: 奖励和连续完成。
- Ink gray: 正文。

颜色规则：

- 风险不能只靠颜色表达，必须配文字和图标。
- 高风险提醒使用克制的红色，不要制造恐慌。
- 宠物状态可以改变背景亮度和配饰，但不要影响可读性。

## 核心页面

### Home

必须显示：

- 宠物房间。
- 今日任务 1 到 3 个。
- Check & Add 入口。
- 库存风险摘要。
- 减少浪费成果。

首屏目标：用户 5 秒内知道今天要先做什么。

### Check & Add

三个区块：

- Before buying: 检查购物清单，优先阻止重复购买。
- Scan food: 上传小票或照片。
- Add food: 手动添加。

识别结果必须进入确认页，不能直接入库。

### Inventory

显示真实库存管理能力：

- 风险筛选。
- 储存位置筛选。
- 编辑。
- 行动记录。

### Plan

显示更完整的今日/本周计划：

- Today
- This week
- Review needed
- Backup ideas

### Impact

展示：

- 已拯救物品数。
- 冷冻物品数。
- 分享/捐赠数。
- 连续完成天数。
- 宠物成长记录。

## 任务公布机制

任务不直接叫“计划项”，而是叫 `Mission`。

任务类型：

- `rescue`: 使用临期物品。
- `freeze`: 冷冻以延长可用窗口。
- `share`: 分享或捐赠。
- `review`: 确认日期或识别结果。
- `cleanup`: 记录已丢弃或不安全物品。

任务卡片字段：

```ts
type MissionCard = {
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
  secondaryActionLabel?: string;
};
```

示例：

```text
拯救菠菜
原因：它已经在冰箱里 5 天了，建议优先处理。
建议：加到鸡蛋、面条或三明治里。
奖励：宠物 +10 健康
按钮：我用掉了 / 我冷冻了 / 今天不想吃
```

检查类任务示例：

```text
Step 1: Check
检查鸡胸肉
原因：它已经过了建议使用日期，需要先判断质量。
建议：检查气味、外观、包装和储存情况。
按钮：已检查

Step 2: Decide
检查后的鸡胸肉
原因：已经检查过，现在需要真正避免浪费。
建议：如果通过检查但今天不做饭，立即冷冻。
按钮：已冷冻 / 用了一些
```

## 任务命名文案

推荐：

- “今日救援”
- “冰箱侦察报告”
- “宠物请求”
- “厨房提醒”
- “库存小任务”

示例：

- “紧急小任务：菠菜快没精神了”
- “冰箱侦察报告：酸奶需要这周处理”
- “宠物请求：今天帮我拯救 2 个食材”
- “厨房提醒：香蕉进入最佳处理窗口”

避免：

- “你浪费了”
- “失败”
- “惩罚”
- “必须马上吃”

## 宠物互动

### 点击宠物

点击宠物时显示一句短文案：

- “我们今天先救菠菜，好不好？”
- “冰箱里有个东西快被遗忘了。”
- “干得好，我感觉精神多了。”
- “如果不确定安全性，我们可以先检查再决定。”

### 完成任务反馈

完成任务后：

- 宠物做 1 秒以内轻量动画。
- 状态条变化。
- 出现奖励 toast。
- 任务卡片移动到 completed 区域。

示例：

```text
Spinach rescued
Pet health +10
Waste-less streak: 3 days
```

### 拖动互动

增强版可以支持：

- 把食物任务卡拖到宠物身边，表示完成使用。
- 把物品拖到 freezer 区域，表示冷冻。
- 把物品拖到 share basket，表示分享/捐赠。

拖动不能是唯一操作，必须保留按钮。

### 宠物房间变化

状态映射：

- happy: 明亮厨房，宠物活跃。
- calm: 正常厨房，宠物平稳。
- hungry: 冰箱旁出现提醒便签。
- tired: 背景稍暗，宠物动作变慢。
- sad: 宠物低落，但仍提供补救任务。
- sick: 显示“需要关注”的温和提醒。

## 奖励系统

奖励应围绕宠物和房间，不使用复杂经济系统。

奖励类型：

- 宠物配饰。
- 小厨房背景。
- 冰箱贴。
- 连续完成徽章。
- 宠物动作。

解锁规则：

- 3 天连续完成：配饰。
- 7 天连续完成：背景。
- 14 天连续完成：成长阶段。
- 第一次分享/捐赠：爱心徽章。
- 第一次冷冻临期物品：freezer badge。

## 可访问性要求

- 所有互动都有按钮形式。
- 宠物点击反馈也要显示文本。
- 动画不超过必要时长，并支持 reduced motion。
- 颜色状态有文字标签。
- 任务卡片标题、原因、行动和奖励应能被屏幕阅读器读取。

## MVP 验收

MVP 前端至少做到：

- Dashboard 有宠物房间。
- 今日任务以 mission card 展示。
- 点击宠物有状态文案。
- 完成任务后宠物视觉状态或状态条变化。
- 至少 4 种宠物视觉状态。
- 至少 3 种任务类型：rescue、freeze、review。
- 所有宠物互动都有非拖动、非动画的替代按钮。
