#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCRIPT="$PROJECT_DIR/run-pi-sandbox.sh"
TMP_DIR="$PROJECT_DIR/.tmp/run-pi-sandbox-test"
BIN_DIR="$TMP_DIR/bin"
SANDBOX_AGENT_DIR="$PROJECT_DIR/.pi-sandbox/agent"
rm -rf "$TMP_DIR" "$SANDBOX_AGENT_DIR"
mkdir -p "$BIN_DIR" "$TMP_DIR/home/.pi/agent"

cat > "$TMP_DIR/home/.pi/agent/settings.json" <<'JSON'
{"defaultProvider":"host-provider","defaultModel":"host-model"}
JSON
cat > "$TMP_DIR/home/.pi/agent/models.json" <<'JSON'
{"providers":{"host-provider":{"models":[{"id":"host-model"}]}}}
JSON
cat > "$TMP_DIR/home/.pi/agent/auth.json" <<'JSON'
{"host-provider":{"type":"api_key","key":"secret"}}
JSON
chmod 600 "$TMP_DIR/home/.pi/agent/auth.json"

cat > "$BIN_DIR/podman" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  image)
    [[ "${2:-}" == "exists" ]] && exit 0
    ;;
  run)
    printf '<%s>\n' "$@"
    exit 0
    ;;
esac
printf 'unexpected podman invocation: %s\n' "$*" >&2
exit 1
STUB
chmod +x "$BIN_DIR/podman"

output="$(HOME="$TMP_DIR/home" TERM=xterm-256color COLORTERM=truecolor PATH="$BIN_DIR:$PATH" bash "$SCRIPT" --version 2>&1)"
printf '%s\n' "$output"

[[ "$output" == *"--userns=keep-id"* ]]
[[ "$output" == *"PI_CODING_AGENT_DIR=/workspace/.pi-sandbox/agent"* ]]
[[ "$output" == *"PI_CODING_AGENT_SESSION_DIR=/workspace/.pi-sandbox/agent/sessions"* ]]
[[ "$output" == *":/workspace/.pi-sandbox:rw,Z"* ]]
[[ "$output" != *"/home/bun/.pi/agent"* ]]
[[ "$output" == *"<bun>"* ]]
[[ "$output" == *"</home/bun/.bun/bin/pi>"* ]]

cmp "$TMP_DIR/home/.pi/agent/settings.json" "$SANDBOX_AGENT_DIR/settings.json"
cmp "$TMP_DIR/home/.pi/agent/models.json" "$SANDBOX_AGENT_DIR/models.json"
cmp "$TMP_DIR/home/.pi/agent/auth.json" "$SANDBOX_AGENT_DIR/auth.json"
[[ "$(stat -c '%a' "$SANDBOX_AGENT_DIR/auth.json")" == "600" ]]
