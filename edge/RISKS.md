# tapp-store-stats — model (v1.5, no secrets)

| Rule | Detail |
|------|--------|
| Who writes | Myriad backend only |
| Cap | 1 / instance / app / event / UTC day |
| Rate limit | IP + instance_hash |
| Allowlist | Official catalog |
| Secrets | **None** |
| Local Myriad | Stats off by default |

No `ADMIN_TOKEN`, no HMAC. Top rebuild happens when needed on read path (cooldown) / new installs.
