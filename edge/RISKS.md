# tapp-store-stats — 风险与优化（v1.3.0）

## 全部残余项状态

| 原残余 | 状态 | 实现 |
|--------|------|------|
| 浏览器匿名 hit 刷榜 | ✅ | `ALLOW_ANONYMOUS_HITS=false`；FE 改走 Myriad `/api/tapps/store/stats-report` |
| KV 并发丢 +1 | ✅ | 每 app **Durable Object** 串行计数；KV 仅镜像 |
| 多 edge 限流松 | ✅ | 限流 **始终写 KV**（跨 colo） |
| HMAC 密钥不同步 | ✅ | 401 只 warn 一次；health 暴露 `hmac_required_for_backend` |
| 公开 seed 写放大 | ✅ | 已删除；仅 admin |
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
