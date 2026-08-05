# Security notes — tapp-store-stats

## Secrets (must not leak)

| Secret | Where | Notes |
|--------|--------|------|
| `INGEST_HMAC_SECRET` | CF Worker secret only | Signs backend hits |
| `ADMIN_TOKEN` | CF Worker secret only | Admin repair; min 16 chars |
| `TAPP_STORE_STATS_HMAC` | Myriad env only | **Same value** as `INGEST_HMAC_SECRET` |

**Never** commit into git, paste into issues/PRs/chat, or put in `wrangler.toml` `[vars]`.

Generate locally:

```bash
cd edge && ./scripts/setup-secrets.sh          # writes .dev.vars (gitignored)
# Rotate if exposed: re-run script, redeploy worker, update Myriad env
```

Public / non-secret IDs (OK in repo):

- KV namespace id in `wrangler.toml` (binding id, not a credential)
- Stats public URL `https://stats.store.myriad.you`

## Threat model

| Threat | Mitigation |
|--------|------------|
| Anonymous install spam | `ALLOW_ANONYMOUS_HITS=false` |
| Forged backend hits | HMAC on `myriad-backend` + `REQUIRE_HMAC` |
| Cookie CSRF to stats-report | Global Myriad CSRF middleware + FE `apiRequest` |
| Authenticated user spam | Daily per-user idempotency key |
| Admin token timing leak | Timing-safe compare; short tokens disabled |
| Secret in health/logs | Only boolean flags; never echo secrets |
| Double-count on retry | DO + idempotency_key 48h |

## Rotate after exposure

1. `./scripts/setup-secrets.sh` (new values)
2. `npx wrangler deploy`
3. Update all Myriad instances: `TAPP_STORE_STATS_HMAC=<new>`
4. Invalidate any shared notes that contained old values
