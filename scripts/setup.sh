#!/usr/bin/env bash
# =============================================================================
# Taylor Made Law — Local Development Setup
# =============================================================================
# Usage: bash scripts/setup.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Taylor Made Law — Local Development Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---- Check Node.js ----
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    echo "Install Node.js 18+ from https://nodejs.org or via:"
    echo "  brew install node"
    echo "  nvm install 18"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ required. Found: $(node -v)${NC}"
    exit 1
fi
echo -e "  ${GREEN}Node.js $(node -v)${NC}"

# ---- Check npm ----
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi
echo -e "  ${GREEN}npm $(npm -v)${NC}"

# ---- Install dependencies ----
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}Dependencies installed.${NC}"

# ---- Create .env from .env.example if missing ----
echo ""
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}.env created from .env.example${NC}"
        echo -e "${YELLOW}  Mock mode is enabled by default (VITE_USE_MOCKS=true).${NC}"
    else
        echo -e "${RED}.env.example not found — cannot create .env${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env already exists — skipping.${NC}"
fi

# ---- Done ----
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  To start in MOCK MODE (no Base44 credentials needed):"
echo -e "    ${CYAN}npm run dev:local${NC}"
echo ""
echo "  To start in LIVE MODE (requires Base44 credentials in .env):"
echo -e "    ${CYAN}npm run dev${NC}"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
