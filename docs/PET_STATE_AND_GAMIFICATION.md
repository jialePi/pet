# 宠物状态和游戏化设计

## 设计目标

宠物不是惩罚工具，而是把抽象的食物浪费变成可见反馈。用户应该感到“我有一个可以恢复的小伙伴”，而不是“我被系统责备”。

## 状态维度

```ts
type PetMetric = {
  health: number; // 0-100
  mood: number;   // 0-100
  energy: number; // 0-100
  trust: number;  // 0-100
};
```

推荐初始值：

```json
{
  "health": 70,
  "mood": 70,
  "energy": 60,
  "trust": 50
}
```

## 视觉状态

| 条件 | visualState | 表现 |
| --- | --- | --- |
| 平均状态 >= 80 | happy | 活泼、亮色、轻微跳动 |
| 平均状态 60-79 | calm | 平稳、正常 |
| energy < 40 | tired | 困、动作变慢 |
| mood < 40 | sad | 低落、颜色变暗 |
| health < 35 | sick | 虚弱，需要用户关注 |
| 今日有高风险物品 | hungry | 提醒用户处理食物 |

## 宠物房间

宠物应出现在一个轻量的厨房、冰箱或食品柜场景里。房间状态跟随宠物状态变化：

| visualState | 房间表现 |
| --- | --- |
| happy | 明亮厨房，宠物活跃，有小奖励元素 |
| calm | 正常厨房，宠物平稳 |
| hungry | 冰箱旁出现提醒便签 |
| tired | 背景稍暗，动作变慢 |
| sad | 宠物低落，但显示补救任务 |
| sick | 温和提示“需要关注”，避免恐吓 |

## 行动影响

| 行动 | health | mood | energy | trust |
| --- | ---: | ---: | ---: | ---: |
| 按计划使用物品 | +6 | +8 | +4 | +4 |
| 使用临期高风险物品 | +10 | +10 | +6 | +5 |
| 冷冻临期物品 | +5 | +4 | +8 | +3 |
| 分享/捐赠 | +4 | +10 | +2 | +6 |
| 添加库存 | +1 | +2 | 0 | +2 |
| 丢弃已过建议日期物品 | -4 | -5 | -2 | 0 |
| 丢弃未临期物品 | -8 | -10 | -4 | -3 |
| 连续一天无行动且有高风险物品 | -3 | -4 | -3 | -1 |
| 接受宠物购买防护建议 | +2 | +4 | 0 | +5 |
| 覆盖购买防护仍然添加 | 0 | -2 | 0 | -1 |

数值必须 clamp 到 `0-100`。

## 连续完成

Streak 规则：

- 每天完成至少一个推荐行动，`streakDays + 1`。
- 如果当天没有高风险物品，允许自动保持 streak。
- 如果有高风险物品但没有任何行动，streak 重置为 0。

奖励：

- 3 天：宠物配饰。
- 7 天：新背景。
- 14 天：宠物成长阶段。

其他奖励：

- 第一次冷冻临期物品：freezer badge。
- 第一次分享/捐赠：heart badge。
- 完成 10 个 rescue 任务：冰箱贴。

## 防挫败机制

- 宠物状态最低不低于一个可恢复展示状态，避免不可逆失败。
- 用户完成补救行动后，应明显恢复。
- 不使用羞辱性文案。
- 丢弃记录也应被视为有价值数据，不应让用户隐瞒浪费。

## 宠物状态计算

推荐每日 tick：

```text
if high-risk active items exist and no action today:
  mood -= 4
  energy -= 3

if past suggested date items exist:
  health -= min(count * 2, 8)

if user completed plan today:
  mood += 5
  trust += 3
```

## 和计划系统的关系

计划项在 UI 中应包装成 `Mission`，并显示宠物影响预估：

- “Use this today: +10 health”
- “Freeze this: +8 energy”
- “Share this: +10 mood”

但不要让用户为了宠物而吃不安全食物。对过期或存疑食物，建议行动应是 `check_quality` 或 `discard_if_unsafe`。

状态口径：

- `active` 食物会进入 mission 和 AI daily plan。
- `frozen` 食物仍然是库存，但属于 paused/preserved 状态，不会让宠物进入 hungry，也不会生成今日 urgent mission。
- 宠物可以提醒用户“冷冻食物已安全停放”，但不应把它当成已吃完或已浪费。
- Dashboard 空状态必须区分“没有任何库存”和“有库存但今天没有紧急任务”。

## 互动规则

### 点击宠物

点击宠物时显示一句短文本：

- “我们今天先救菠菜，好不好？”
- “冰箱里有个东西快被遗忘了。”
- “干得好，我感觉精神多了。”
- “如果不确定安全性，我们可以先检查再决定。”
- “等一下，我们已经有一些了。先处理现有库存会更好。”

### AI coach

配置 `GOOGLE_AI_API_KEY` 后，宠物可以通过 `AI coach` 生成更灵活的计划文案和台词。AI 输入只包含必要的 active 库存、当前 mission 和宠物数值，不包含 API key 或图片。

AI coach 输出：

- `petLine`: 宠物说的一句短提醒。
- `planSummary`: 今日计划总结。
- `suggestedActions`: 1 到 3 个轻量行动建议。

约束：

- AI 只增强表达，不负责最终优先级。
- 规则引擎仍负责 mission 排序、状态变化和购买防护。
- AI 文案不得羞辱用户。
- AI 文案不得给出确定食品安全判断。
- AI 不可要求用户为了宠物去吃存疑食物。

### 购买防护

宠物在用户准备添加重复或过量物品时，可以进入 `guarding` 语气状态。该状态不是新的持久化 visualState，而是一次交互提示。

提示规则：

- 说明阻止原因。
- 指出已有库存数量或临期物品。
- 给出先处理现有库存的路径。
- 允许用户二次确认后继续添加。

推荐文案：

- “Hold on. We already have bananas waiting on the counter.”
- “Let's rescue spinach before adding another bag.”
- “I can add it if you really need it, but this may increase waste risk.”

### 完成任务

完成任务后：

- 宠物状态立即更新。
- 切换到一次性的 reaction 姿势；默认状态保持稳定，不自动抖动或循环扫过图集。
- 显示奖励 toast。
- 任务移动到 completed 区域。

Koko 图集适配约束：

- 每个 `visualState` 使用一个稳定的、已确认非透明的静态帧。
- `used`、`frozen`、`shared`、`checked`、`discarded` 和购买防护分别选择
  不同的已确认帧；reaction 结束后回到当前基线状态。
- 不使用整行 spritesheet 的连续 background-position 动画；图集的透明占位格
  不得被渲染，否则宠物会间歇性消失。

### 拖动互动

增强版可以支持拖动：

- 食物任务卡拖到宠物身边：表示使用。
- 物品拖到 freezer 区域：表示冷冻。
- 物品拖到 share basket：表示分享/捐赠。

拖动不能是唯一操作，必须保留按钮。

## 演示建议

Hackathon 演示可以准备 3 个状态：

- 新用户：宠物刚孵化，等待添加食物。
- 积极用户：完成计划后宠物开心。
- 忽略库存：临期物品堆积，宠物疲惫；用户处理后恢复。
