#!/usr/bin/env bash
# Upload an HTML report to Nikunj Khitha's portfolio artifact host.
#
# Usage:  host-file.sh <filepath> <slug> [remote-filename]
#
#   filepath         local HTML file to upload
#   slug              folder segment in the published URL:
#                      https://nikunj.codenex.dev/artifacts/<slug>/<remote-filename>
#   remote-filename   defaults to the local file's basename (must end .html)
#
# This POSTs straight to the portfolio's own /api/artifacts route (a plain
# bearer-token-authenticated JSON endpoint backed by Vercel Blob) — there is
# no MCP handshake, no argv-length ceiling, and no size cap beyond the
# platform's own request-body limit.
#
# Exit codes: 0 ok · 1 usage/precondition · 3 request failed
#             4 upload rejected · 5 live verification failed

set -uo pipefail

FILE="${1:-}"
SLUG="${2:-}"
REMOTE_NAME="${3:-}"

[ -n "$FILE" ] && [ -n "$SLUG" ] || {
  echo "usage: host-file.sh <filepath> <slug> [remote-filename]" >&2
  exit 1
}
[ -f "$FILE" ] || { echo "error: no such file: $FILE" >&2; exit 1; }
[ -n "$REMOTE_NAME" ] || REMOTE_NAME="$(basename "$FILE")"

case "$SLUG" in
  [a-zA-Z0-9][a-zA-Z0-9-]*) ;;
  *) echo "error: slug must be alphanumeric with hyphens only (got: $SLUG)" >&2; exit 1 ;;
esac
case "$REMOTE_NAME" in
  *.html) ;;
  *) echo "error: remote filename must end in .html (got: $REMOTE_NAME)" >&2; exit 1 ;;
esac

# ------------------------------------------------------------- resolve config
# Resolution order: explicit env vars, then a small tool-agnostic JSON config
# file. This skill runs the same under Claude Code, Codex, and opencode, so
# the config lives outside any one tool's home directory.
CONFIG_FILE="${HOSTED_HTML_REPORT_CONFIG:-$HOME/.config/hosted-html-report/config.json}"

UPLOAD_URL="${ARTIFACT_UPLOAD_URL:-}"
UPLOAD_TOKEN="${ARTIFACT_UPLOAD_TOKEN:-}"

if [ -z "$UPLOAD_URL" ] || [ -z "$UPLOAD_TOKEN" ]; then
  if [ -f "$CONFIG_FILE" ]; then
    CFG_URL="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('uploadUrl',''))" "$CONFIG_FILE" 2>/dev/null)"
    CFG_TOKEN="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('token',''))" "$CONFIG_FILE" 2>/dev/null)"
    [ -n "$UPLOAD_URL" ] || UPLOAD_URL="$CFG_URL"
    [ -n "$UPLOAD_TOKEN" ] || UPLOAD_TOKEN="$CFG_TOKEN"
  fi
fi

UPLOAD_URL="${UPLOAD_URL:-https://nikunj.codenex.dev/api/artifacts}"

[ -n "$UPLOAD_TOKEN" ] || {
  echo "error: no upload token found." >&2
  echo "  set ARTIFACT_UPLOAD_TOKEN, or create $CONFIG_FILE with:" >&2
  echo '  { "uploadUrl": "https://nikunj.codenex.dev/api/artifacts", "token": "..." }' >&2
  exit 1
}

# ---------------------------------------------------------- base64 (portable)
b64_of() {
  if base64 --help 2>&1 | grep -q -- '-w'; then base64 -w0 "$1"; else base64 -i "$1" | tr -d '\n'; fi
}
B64="$(b64_of "$FILE")"
RAW_LEN=$(wc -c < "$FILE" | tr -d ' ')

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Payload goes via a file, not a shell argument — this file can be large and
# some shells choke on very long argv entries even without the old MCP bug.
python3 - "$TMP/payload.json" "$SLUG" "$REMOTE_NAME" <<'PY' "$B64"
import json, sys
out, slug, name, b64 = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
json.dump({"slug": slug, "filename": name, "contentBase64": b64}, open(out, "w"))
PY

HTTP="$(curl -sS -X POST "$UPLOAD_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UPLOAD_TOKEN" \
  --data-binary @"$TMP/payload.json" \
  --max-time 120 -o "$TMP/out" -w '%{http_code}')" || {
  echo "error: upload request failed to reach $UPLOAD_URL" >&2
  exit 3
}

BODY="$(cat "$TMP/out")"

if [ "$HTTP" != "200" ]; then
  ERR="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error','(no message)'))" <<<"$BODY" 2>/dev/null || echo "$BODY")"
  echo "error: upload rejected (HTTP $HTTP)" >&2
  echo "  $ERR" >&2
  exit 4
fi

LIVE_URL="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('url',''))" <<<"$BODY" 2>/dev/null)"
REPLACED="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('replaced', False))" <<<"$BODY" 2>/dev/null)"

echo "uploaded: $SLUG/$REMOTE_NAME  ($RAW_LEN raw bytes)  [$([ "$REPLACED" = "True" ] && echo replaced existing report || echo new report)]"
[ -n "$LIVE_URL" ] && echo "live URL: $LIVE_URL"

# --------------------------------------------------------- verify what is live
# A CDN/proxy layer can serve a stale copy briefly after a write. Byte-compare
# the live URL against the local file to confirm the upload actually landed.
if [ -n "$LIVE_URL" ] && [ "${SKIP_VERIFY:-0}" != "1" ]; then
  sleep "${VERIFY_DELAY:-3}"
  code="$(curl -sS -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
            -o "$TMP/live" -w '%{http_code}' --max-time 60 "$LIVE_URL" || echo 000)"
  if [ "$code" != "200" ]; then
    echo "warning: live URL returned HTTP $code" >&2; exit 5
  fi
  if cmp -s "$TMP/live" "$FILE"; then
    echo "verified: live copy is byte-identical"
  else
    echo "warning: live copy differs from local ($(wc -c < "$TMP/live" | tr -d ' ') vs $RAW_LEN bytes)." >&2
    echo "         Usually brief propagation lag — re-check in a few seconds." >&2
    exit 5
  fi
fi
