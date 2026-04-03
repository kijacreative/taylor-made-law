#!/usr/bin/env bash
# =============================================================================
# Taylor Made Law — Data Migration Pipeline
# =============================================================================
#
# Usage:
#   bash scripts/migration/run-migration.sh [step]
#
# Steps:
#   export     — Export all entities from Base44 to JSON
#   identity   — Build identity map (Base44 ID → Supabase UUID)
#   transform  — Transform exported data to Supabase format
#   import     — Import transformed data into Supabase
#   verify     — Verify row counts and FK integrity
#   all        — Run all steps in order (default)
#
# Prerequisites:
#   - Node.js 18+
#   - Supabase running locally (npx supabase start)
#   - SUPABASE_SERVICE_ROLE_KEY set (from supabase start output)
#   - For export: Base44 connection active (VITE_USE_MOCKS=false)
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STEP="${1:-all}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[migration]${NC} $1"; }
ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }
warn(){ echo -e "${YELLOW}[⚠]${NC} $1"; }

# Check Node
if ! command -v node &> /dev/null; then
    err "Node.js not found. Install Node 18+."
    exit 1
fi

run_export() {
    log "Step 1: Export from Base44"
    node "$SCRIPT_DIR/export/export-base44.js"
    ok "Export complete"
}

run_identity() {
    log "Step 2: Build identity map"
    node "$SCRIPT_DIR/transform/build-identity-map.js"
    ok "Identity map built"
}

run_transform() {
    log "Step 3: Transform data"
    node "$SCRIPT_DIR/transform/transform.js"
    ok "Transform complete"
}

run_import() {
    log "Step 4: Import to Supabase"

    if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
        err "SUPABASE_SERVICE_ROLE_KEY not set."
        echo "  Run 'npx supabase start' and copy the service_role key."
        echo "  Then: export SUPABASE_SERVICE_ROLE_KEY=<key>"
        exit 1
    fi

    # Import by phase to respect FK constraints
    for phase in 1 2 3 4 5; do
        log "  Importing phase $phase..."
        node "$SCRIPT_DIR/import/import-supabase.js" --phase "$phase"
    done
    ok "Import complete"
}

run_verify() {
    log "Step 5: Verify migration"
    node "$SCRIPT_DIR/verify/verify.js" && ok "Verification passed" || err "Verification found issues — check logs"
}

run_dry_run() {
    log "Dry run: validate data shapes without inserting"
    node "$SCRIPT_DIR/import/import-supabase.js" --dry-run
    ok "Dry run complete"
}

case "$STEP" in
    export)    run_export ;;
    identity)  run_identity ;;
    transform) run_transform ;;
    import)    run_import ;;
    verify)    run_verify ;;
    dry-run)   run_dry_run ;;
    all)
        run_export
        run_identity
        run_transform
        run_import
        run_verify
        ;;
    *)
        echo "Usage: $0 {export|identity|transform|import|verify|dry-run|all}"
        exit 1
        ;;
esac

echo ""
log "Logs directory: $SCRIPT_DIR/logs/"
