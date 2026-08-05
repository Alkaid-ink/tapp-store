# Security — tapp-store-stats

## No secrets

Install counting does **not** use API keys, HMAC, or admin tokens.

Write path accepts only server-side Myriad backends:

- `client: "myriad-backend"`
- `User-Agent: Myriad-Store-Stats/*`
- no browser `Origin`
- `instance_hash` (site identity)
- 1 count / instance / app / event / UTC day
- catalog allowlist + IP / instance rate limits

Myriad never stores a stats secret.

## Residual abuse

Fake `instance_hash` can still +1 once per day per fabricated id; rate limits reduce spray volume. This is site-heat popularity, not billing.
