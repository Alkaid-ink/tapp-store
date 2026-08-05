# tapp-store-stats — 风险与优化清单（v1.2.1）

## 已处理

| 风险 | 缓解 |
|------|------|
| 读路径写 KV 浪费/放大 | v1.2 纯读；公开 `?seed=` 已移除 |
| 双路径双计 | BE 仅 store 成功；FE 仅 client-fallback 成功 |
| 重复 hit | `idempotency_key` 48h 去重 |
| 刷榜 | IP 限流；浏览器更严（默认 20/min）；catalog 白名单 |
| 后端假冒 | 可选 `INGEST_HMAC_SECRET`；`myriad-backend` 强制签名 |
| 运维写接口裸奔 | `ADMIN_TOKEN` Bearer；未配置则 404 |
| Catalog 宕机误伤 | 首次无缓存 fail-open；加载成功后 fail-closed |
| Top 丢失 | hit 条件写 top；admin `rebuild-top` + seed_apps |
| Stats 失败拖垮商店 | FE/BE 全 fire-and-forget / try-catch |
| 密钥进 Git | secrets 走 wrangler secret / `.dev.vars`（gitignore） |

## 残余风险（可接受 / 后续）

| 风险 | 等级 | 说明 | 后续 |
|------|------|------|------|
| 浏览器匿名 hit 仍可刷 | 中 | 无 HMAC；靠白名单+限流 | 上量后可强制仅后端打点 |
| KV 并发丢 +1 | 低 | 无 CAS；热度非计费 | Durable Object |
| Rate limit 多 edge 不严 | 低 | 内存优先，75% 后才 KV | 可接受 |
| Top 非全局精确 | 低 | 条件写可能漏冷门爬升 | 定期 admin rebuild |
| HMAC 与 Myriad 密钥不同步 | 中 | 配错则后端 hit 401 | 健康检查 + 文档 |
| 自托管实例可关 stats | 无 | env 禁用 | 预期行为 |
| 第三方商店源 | 无 | 仅官方 catalog 白名单 | 预期 |

## 配置清单（可选已落地）

| 项 | Edge | Myriad |
|----|------|--------|
| Stats URL | 自定义域 `stats.store.myriad.you` | `TAPP_STORE_STATS_URL` |
| HMAC | secret `INGEST_HMAC_SECRET` | `TAPP_STORE_STATS_HMAC` |
| Admin | secret `ADMIN_TOKEN` | — |
| 开关 | — | `TAPP_STORE_STATS_ENABLED` |
| FE URL | — | `VITE_TAPP_STORE_STATS_URL` |
| 浏览器限流 | `BROWSER_HIT_RATE_LIMIT_PER_MIN=20` | — |

## 优化项状态

| 项 | 状态 |
|----|------|
| 读路径不写 | ✅ |
| Top 条件写 | ✅ |
| 内存限流 | ✅ |
| Catalog 缓存 + fail-closed | ✅ |
| HMAC 后端 | ✅（需部署 secret） |
| Admin 修复 | ✅（需部署 secret） |
| FE 批量 + TTL 缓存 | ✅（含 0 缓存） |
| UI 仅 >0 展示 | ✅ |
| Durable Object 原子计数 | ❌ 未做（非必须） |
| Analytics Engine 时序 | ❌ 未做 |

## 运维命令

```bash
# 生成并写入本地 .dev.vars；登录 wrangler 后可同步到 CF
cd edge && ./scripts/setup-secrets.sh

# 修复 top（ADMIN_TOKEN）
curl -X POST https://stats.store.myriad.you/v1/admin/rebuild-top \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"seed_apps":["com.myriad.music-player"]}'

# 健康（含 hmac_required_for_backend / admin_enabled）
curl -s https://stats.store.myriad.you/health
```
