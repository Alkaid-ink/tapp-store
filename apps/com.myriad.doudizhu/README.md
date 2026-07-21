# 斗地主

3 人 54 张牌斗地主（v1.2 交互产品级牌桌）。支持联邦 Room 创建/邀请/准备与实时出牌，也可一键单机练习。

## 功能

- **规则**：发牌 17/17/17 + 3 底牌，叫分 1–3，出牌/过牌
- **牌型**：单、对、三张、三带、顺子、连对、飞机、炸弹、王炸
- **提示**：出牌阶段「提示」枚举合法压牌/首出并循环选择；无牌可压时引导过牌
- **牌桌反馈**：分座最近叫分/出牌/过牌；1–2 张 **报牌** 警报；地主/农民；叫分与底牌揭示；终局摘要
- **主题**：跟随 Tapp `--tapp-primary` 与 light/dark（`.dark` / `Tapp.ui.onThemeChange`）
- **联机**：`Tapp.federation.createRoom` / `inviteMember` / `subscribeRoom`
- **协议**：`message_type: doudizhu`，房主分配全局 seq，成员发 intent
- **单机**：本地两位假对手

## 权限

- `federation:read` `federation:write` `federation:message`
- `storage`

## 使用

1. 从 Tapp 商店安装并授予联邦权限
2. 房主「创建房间」，邀请两位好友
3. 三人准备后「开始对局」
4. 或点「单机练习」

## 实时路径

房间消息 + Room WebSocket 扇出（无额外 ephemeral 通道）。

## 纯逻辑与测试

`logic/` 目录含可单测的规则与协议 TypeScript 源（与 `main.js` 内嵌引擎同构）：

```bash
cd apps/com.myriad.doudizhu
npx --yes tsx --test logic/*.test.ts
```
