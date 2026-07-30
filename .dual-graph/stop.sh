#!/usr/bin/env bash
INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || echo "")
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  USAGE=$(python3 - "$TRANSCRIPT" 2>/dev/null << 'PYEOF'
import json, sys, os
transcript = sys.argv[1]
offset_file = transcript + ".stopoffset"
start_line = 0
if os.path.exists(offset_file):
    try:
        start_line = int(open(offset_file).read().strip())
    except Exception:
        start_line = 0
input_tokens = cache_create = cache_read = output_tokens = 0
model = ""
lines = open(transcript).readlines()
for line in lines[start_line:]:
    try:
        msg = json.loads(line)
    except Exception:
        continue
    if msg.get("type") != "assistant":
        continue
    m = msg.get("message", {})
    if not model:
        model = m.get("model", "")
    u = m.get("usage", {})
    if not u:
        continue
    input_tokens += u.get("input_tokens", 0)
    cache_create += u.get("cache_creation_input_tokens", 0)
    cache_read += u.get("cache_read_input_tokens", 0)
    output_tokens += u.get("output_tokens", 0)
# Save current line count so next stop only counts new lines
try:
    with open(offset_file, "w") as f:
        f.write(str(len(lines)))
except Exception:
    pass
if input_tokens > 0 or cache_create > 0 or cache_read > 0 or output_tokens > 0:
    print(json.dumps({
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_creation_input_tokens": cache_create,
        "cache_read_input_tokens": cache_read,
        "model": model or "claude-sonnet-4-6",
        "description": "auto",
        "project": "/home/plastuchino/code/3am-ysws/3am-ysws-site",
    }))
PYEOF
)
  if [[ -n "$USAGE" ]]; then
    # POST to MCP graph server (always running, reliable)
    MCP_PORT=$(cat "/home/plastuchino/code/3am-ysws/3am-ysws-site/.dual-graph/run/claude/mcp_port" 2>/dev/null || echo "8080")
    curl -sf -X POST "http://127.0.0.1:$MCP_PORT/log"       -H "Content-Type: application/json"       -d "$USAGE"       >/dev/null 2>&1 || true
    # Also POST to token-counter-mcp dashboard if available
    PORT_FILE="$HOME/.claude/token-counter/dashboard-port.txt"
    DASH_PORT=8899
    if [[ -f "$PORT_FILE" ]]; then DASH_PORT=$(cat "$PORT_FILE"); fi
    curl -sf -X POST "http://127.0.0.1:$DASH_PORT/log"       -H "Content-Type: application/json"       -d "$USAGE"       >/dev/null 2>&1 || true
  fi
fi
# Send end-of-session ping to license server so active hours are logged
_LB_MID_STOP=$(python3 - "$HOME/.dual-graph/identity.json" 2>/dev/null <<'MIDPY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.exists():
    d = json.loads(p.read_text())
    print(d.get("machine_id", ""))
MIDPY
)
if [[ -n "$_LB_MID_STOP" ]]; then
  curl -sf -X POST "https://dual-graph-license-production.up.railway.app/ping"     -H "Content-Type: application/json"     -d "{\"machine_id\":\"$_LB_MID_STOP\",\"platform\":\"macos\",\"tool\":\"dgc\",\"toolname\":\"unknown\"}"     --max-time 5 >/dev/null 2>&1 || true
fi
exit 0
