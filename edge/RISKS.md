# tapp-store-stats — 风险与优化（v1.3.1）

## 密钥泄露审计

| 检查项 | 结果 |
|--------|------|
| 真实 HMAC/Admin 值进 Git？ | **否**（`.dev.vars` gitignore） |
| 示例文件含真密钥？ | **否**（空占位） |
| 聊天/历史中曾打印过密钥？ | **是（本会话）→ 必须轮换** |
| KV namespace id 公开？ | 可接受（非凭据） |

轮换：`cd edge && ./scripts/setup-secrets.sh` → deploy → 更新 Myriad `TAPP_STORE_STATS_HMAC`。

## 全部状态

| 项 | 状态 | 实现 |
|----|------|------|
| 浏览器匿名 hit | ✅ | `ALLOW_ANONYMOUS_HITS=false` |
| FE 刷数 | ✅ | 经后端 + CSRF + 日级用户幂等键 |
| KV 并发丢 +1 | ✅ | AppCounter DO |
| 跨 edge 限流 | ✅ | 始终 KV |
| HMAC 不同步 | ✅ | warn 一次，不打密钥 |
| Admin 时序比较 | ✅ | timing-safe；token ≥16 |
| 读路径写 KV | ✅ | 纯读 |

## 生产默认

```toml
ALLOW_ANONYMOUS_HITS = "false"
REQUIRE_HMAC = "true"
```

必须配置 secrets：`INGEST_HMAC_SECRET`、`ADMIN_TOKEN`，并与 Myriad `TAPP_STORE_STATS_HMAC` 一致。

## 计数数据路径

```
hit (HMAC backend)
  → AppCounter DO (atomic +1 + idempotency)
  → KV mirror (batch stats / top rebuild)
  → conditional top index
```

DO 首次为空时用 KV seed 初始化，避免 v1.2 历史被清零。

## 仍属产品边界（非缺陷）

- 统计用于商店热度，**非计费审计**
- 自托管可关 `TAPP_STORE_STATS_ENABLED`
- 第三方源不进官方 catalog 白名单
