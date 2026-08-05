#!/usr/bin/env bash
# Generate + apply Cloudflare Worker secrets for tapp-store-stats.
# Usage:
#   ./scripts/setup-secrets.sh           # generate + wrangler secret put
#   ./scripts/setup-secrets.sh --print   # only print values (no CF API)
#   ./scripts/setup-secrets.sh --from-env # use existing env vars
set -euo pipefail
cd "$(dirname "$0")/.."

PRINT_ONLY=0
FROM_ENV=0
for a in "$@"; do
  case "$a" in
    --print) PRINT_ONLY=1 ;;
    --from-env) FROM_ENV=1 ;;
  esac
done

if [[ "$FROM_ENV" == "1" ]]; then
  HMAC="${INGEST_HMAC_SECRET:-}"
  ADMIN="${ADMIN_TOKEN:-}"
  if [[ -z "$HMAC" || -z "$ADMIN" ]]; then
    echo "Need INGEST_HMAC_SECRET and ADMIN_TOKEN in env" >&2
    exit 1
  fi
else
  HMAC="$(openssl rand -hex 32)"
  ADMIN="$(openssl rand -hex 24)"
fi

echo "=== tapp-store-stats secrets ==="
echo "INGEST_HMAC_SECRET=$HMAC"
echo "ADMIN_TOKEN=$ADMIN"
echo
echo "Myriad backend (same HMAC):"
echo "  TAPP_STORE_STATS_URL=https://stats.store.myriad.you"
echo "  TAPP_STORE_STATS_ENABLED=true"
echo "  TAPP_STORE_STATS_HMAC=$HMAC"
echo

# Write local .dev.vars (gitignored)
cat > .dev.vars <<EOF
INGEST_HMAC_SECRET=$HMAC
ADMIN_TOKEN=$ADMIN
EOF
echo "Wrote edge/.dev.vars (local only, gitignored)"

if [[ "$PRINT_ONLY" == "1" ]]; then
  exit 0
fi

if ! npx wrangler whoami &>/dev/null; then
  echo
  echo "Wrangler not logged in. Apply secrets after 'npx wrangler login':"
  echo "  printf '%s' '$HMAC' | npx wrangler secret put INGEST_HMAC_SECRET"
  echo "  printf '%s' '$ADMIN' | npx wrangler secret put ADMIN_TOKEN"
  echo "  npx wrangler deploy"
  exit 0
fi

printf '%s' "$HMAC" | npx wrangler secret put INGEST_HMAC_SECRET
printf '%s' "$ADMIN" | npx wrangler secret put ADMIN_TOKEN
echo "Secrets applied. Redeploy: npx wrangler deploy"
