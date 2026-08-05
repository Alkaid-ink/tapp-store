#!/usr/bin/env bash
# Generate + apply Cloudflare Worker secrets for tapp-store-stats.
#
# Usage:
#   ./scripts/setup-secrets.sh              # generate, write .dev.vars, apply if logged in
#   ./scripts/setup-secrets.sh --print      # also print values to stdout (avoid in shared logs)
#   ./scripts/setup-secrets.sh --from-env   # use existing INGEST_HMAC_SECRET + ADMIN_TOKEN
#
# NEVER commit .dev.vars or paste secrets into git / issues / chat.
set -euo pipefail
cd "$(dirname "$0")/.."

PRINT=0
FROM_ENV=0
for a in "$@"; do
  case "$a" in
    --print) PRINT=1 ;;
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

if [[ ${#HMAC} -lt 32 || ${#ADMIN} -lt 16 ]]; then
  echo "Secrets too short" >&2
  exit 1
fi

umask 077
cat > .dev.vars <<EOF
INGEST_HMAC_SECRET=$HMAC
ADMIN_TOKEN=$ADMIN
EOF
chmod 600 .dev.vars 2>/dev/null || true
echo "Wrote edge/.dev.vars (mode 600, gitignored)"

if [[ "$PRINT" == "1" ]]; then
  echo "INGEST_HMAC_SECRET=$HMAC"
  echo "ADMIN_TOKEN=$ADMIN"
  echo "TAPP_STORE_STATS_HMAC=$HMAC"
else
  echo "Secrets generated (not printed). Use: cat .dev.vars"
  echo "Myriad: set TAPP_STORE_STATS_HMAC from INGEST_HMAC_SECRET in .dev.vars"
fi

if ! npx wrangler whoami &>/dev/null; then
  echo "Wrangler not logged in. After 'npx wrangler login':"
  echo "  ./scripts/setup-secrets.sh --from-env   # re-read .dev.vars into env first"
  echo "  # or: source <(sed 's/^/export /' .dev.vars) && ./scripts/setup-secrets.sh --from-env"
  exit 0
fi

# Apply without echoing secret values
set -a
# shellcheck disable=SC1091
source .dev.vars
set +a
printf '%s' "$INGEST_HMAC_SECRET" | npx wrangler secret put INGEST_HMAC_SECRET
printf '%s' "$ADMIN_TOKEN" | npx wrangler secret put ADMIN_TOKEN
echo "Secrets applied to Cloudflare. Redeploy: npx wrangler deploy"
