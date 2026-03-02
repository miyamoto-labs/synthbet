#!/bin/bash

# EasyPoly Hackathon Migration Script
# This script consolidates easypoly-landing, easypoly-engine, and easypoly-bot
# into a unified monorepo for the Synthdata hackathon.

set -e  # Exit on error

echo "🚀 EasyPoly Hackathon Migration Script"
echo "======================================="
echo ""

# Configuration
WORK_DIR="$HOME/code"  # Change if your repos are elsewhere
TARGET_REPO="easypoly"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if target repo exists
if [ -d "$WORK_DIR/$TARGET_REPO" ]; then
    echo -e "${YELLOW}⚠️  Target repo '$TARGET_REPO' already exists at $WORK_DIR/$TARGET_REPO${NC}"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$WORK_DIR/$TARGET_REPO"
        echo -e "${GREEN}✓ Deleted existing repo${NC}"
    else
        echo -e "${RED}✗ Migration cancelled${NC}"
        exit 1
    fi
fi

# Step 2: Create new repo structure
echo ""
echo "📁 Creating repo structure..."
mkdir -p "$WORK_DIR/$TARGET_REPO"/{frontend,engine,bot,docs}

# Copy template files from this hackathon folder
cp -r /Users/erik/.openclaw/workspace/easypoly-hackathon/* "$WORK_DIR/$TARGET_REPO/"
echo -e "${GREEN}✓ Created base structure${NC}"

# Step 3: Clone and migrate frontend (easypoly-landing)
echo ""
echo "📦 Migrating frontend (easypoly-landing)..."
if [ -d "$WORK_DIR/easypoly-landing" ]; then
    echo "  Using existing clone at $WORK_DIR/easypoly-landing"
else
    git clone git@github.com:miyamoto-labs/easypoly-landing.git "$WORK_DIR/easypoly-landing"
fi
rsync -av --exclude='.git' --exclude='node_modules' "$WORK_DIR/easypoly-landing/" "$WORK_DIR/$TARGET_REPO/frontend/"
echo -e "${GREEN}✓ Frontend migrated${NC}"

# Step 4: Clone and migrate engine (easypoly-engine)
echo ""
echo "🤖 Migrating engine (easypoly-engine)..."
if [ -d "$WORK_DIR/easypoly-engine" ]; then
    echo "  Using existing clone at $WORK_DIR/easypoly-engine"
else
    git clone git@github.com:miyamoto-labs/easypoly-engine.git "$WORK_DIR/easypoly-engine"
fi
rsync -av --exclude='.git' --exclude='__pycache__' --exclude='venv' "$WORK_DIR/easypoly-engine/" "$WORK_DIR/$TARGET_REPO/engine/"
echo -e "${GREEN}✓ Engine migrated${NC}"

# Step 5: Clone and migrate bot (easypoly-bot)
echo ""
echo "🤖 Migrating bot (easypoly-bot)..."
if [ -d "$WORK_DIR/easypoly-bot" ]; then
    echo "  Using existing clone at $WORK_DIR/easypoly-bot"
else
    git clone git@github.com:miyamoto-labs/easypoly-bot.git "$WORK_DIR/easypoly-bot"
fi
rsync -av --exclude='.git' --exclude='node_modules' "$WORK_DIR/easypoly-bot/" "$WORK_DIR/$TARGET_REPO/bot/"
echo -e "${GREEN}✓ Bot migrated${NC}"

# Step 6: Initialize git repo
echo ""
echo "🔧 Initializing git repository..."
cd "$WORK_DIR/$TARGET_REPO"
git init
git add .
git commit -m "Initial hackathon submission structure

- Migrated easypoly-landing → frontend/
- Migrated easypoly-engine → engine/
- Migrated easypoly-bot → bot/
- Added unified README and docs for Synthdata hackathon"
echo -e "${GREEN}✓ Git initialized${NC}"

# Step 7: Summary
echo ""
echo "======================================="
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. cd $WORK_DIR/$TARGET_REPO"
echo "2. Create GitHub repo: miyamoto-labs/easypoly"
echo "3. git remote add origin git@github.com:miyamoto-labs/easypoly.git"
echo "4. git push -u origin main"
echo ""
echo "Then set up your environment:"
echo "5. cd frontend && npm install"
echo "6. cd ../engine && pip install -r requirements.txt"
echo "7. cd ../bot && npm install"
echo ""
echo "See SETUP.md for detailed instructions."
echo ""
