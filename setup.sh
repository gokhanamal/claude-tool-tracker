#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
DASHBOARD_DIR="$CLAUDE_DIR/dashboard"
HOOKS_FILE="$SCRIPT_DIR/hooks.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}claude-tool-tracker${NC} — log & visualize every tool invocation"
echo ""

# ── Prerequisites ──────────────────────────────────────────────

command -v jq >/dev/null 2>&1 || fail "jq is required but not installed. Install it: brew install jq (macOS) or apt install jq (Linux)"
command -v python3 >/dev/null 2>&1 || fail "python3 is required but not installed."

# ── Ensure ~/.claude exists ────────────────────────────────────

mkdir -p "$CLAUDE_DIR"

# ── Merge hooks into settings.json ─────────────────────────────

if [ ! -f "$SETTINGS_FILE" ]; then
    info "No settings.json found — creating one"
    cp "$HOOKS_FILE" "$SETTINGS_FILE"
    ok "Created $SETTINGS_FILE with hooks"
else
    # Check if hooks already exist
    EXISTING_PRE=$(jq -e '.hooks.PreToolUse' "$SETTINGS_FILE" 2>/dev/null && echo "yes" || echo "no")
    EXISTING_POST=$(jq -e '.hooks.PostToolUse' "$SETTINGS_FILE" 2>/dev/null && echo "yes" || echo "no")

    if [ "$EXISTING_PRE" = "yes" ] || [ "$EXISTING_POST" = "yes" ]; then
        warn "Existing hooks detected in settings.json"
        echo ""
        echo "  Current PreToolUse hooks: $(jq '.hooks.PreToolUse | length // 0' "$SETTINGS_FILE" 2>/dev/null)"
        echo "  Current PostToolUse hooks: $(jq '.hooks.PostToolUse | length // 0' "$SETTINGS_FILE" 2>/dev/null)"
        echo ""
        read -p "  Append tool-tracker hooks alongside existing ones? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            warn "Skipped hook installation. You can manually merge hooks.json into your settings."
            echo ""
        else
            # Append to existing hook arrays
            TEMP=$(mktemp)
            jq --argjson new "$(cat "$HOOKS_FILE")" '
              .hooks.PreToolUse = (.hooks.PreToolUse // []) + $new.hooks.PreToolUse |
              .hooks.PostToolUse = (.hooks.PostToolUse // []) + $new.hooks.PostToolUse
            ' "$SETTINGS_FILE" > "$TEMP" && mv "$TEMP" "$SETTINGS_FILE"
            ok "Appended hooks to existing settings"
        fi
    else
        # No existing hooks — safe to merge
        TEMP=$(mktemp)
        jq --argjson new "$(cat "$HOOKS_FILE")" '
          .hooks = (.hooks // {}) |
          .hooks.PreToolUse = $new.hooks.PreToolUse |
          .hooks.PostToolUse = $new.hooks.PostToolUse
        ' "$SETTINGS_FILE" > "$TEMP" && mv "$TEMP" "$SETTINGS_FILE"
        ok "Merged hooks into $SETTINGS_FILE"
    fi
fi

# Validate the result
jq -e '.hooks.PreToolUse[0].hooks[0].command' "$SETTINGS_FILE" >/dev/null 2>&1 || fail "Hook validation failed — settings.json may be malformed"
jq -e '.hooks.PostToolUse[0].hooks[0].command' "$SETTINGS_FILE" >/dev/null 2>&1 || fail "Hook validation failed — settings.json may be malformed"
ok "Hooks validated"

# ── Install dashboard ──────────────────────────────────────────

if [ -d "$DASHBOARD_DIR" ]; then
    warn "Dashboard already exists at $DASHBOARD_DIR — overwriting"
fi

mkdir -p "$DASHBOARD_DIR"
cp "$SCRIPT_DIR/dashboard/index.html" "$DASHBOARD_DIR/index.html"
cp "$SCRIPT_DIR/dashboard/serve.py" "$DASHBOARD_DIR/serve.py"
chmod +x "$DASHBOARD_DIR/serve.py"
ok "Dashboard installed to $DASHBOARD_DIR"

# ── Done ───────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Hooks are now logging every tool invocation to:"
echo -e "  ${CYAN}~/.claude/tool-invocations.jsonl${NC}"
echo ""
echo "  To view the dashboard:"
echo -e "  ${CYAN}python3 ~/.claude/dashboard/serve.py${NC}"
echo ""
echo "  To uninstall:"
echo "  1. Remove the PreToolUse/PostToolUse entries from ~/.claude/settings.json"
echo "  2. rm -rf ~/.claude/dashboard"
echo "  3. rm ~/.claude/tool-invocations.jsonl  (optional — keeps your data)"
echo ""
