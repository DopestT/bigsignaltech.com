#!/bin/sh
set -eu

if [ -z "${COBALT_API_KEY:-}" ]; then
  echo "COBALT_API_KEY is required" >&2
  exit 1
fi

cat > /tmp/keys.json <<EOF
{
  "${COBALT_API_KEY}": {
    "name": "BigSignal Vercel",
    "limit": "unlimited"
  }
}
EOF

export API_KEY_URL="file:///tmp/keys.json"
export API_AUTH_REQUIRED="1"

exec "$@"
