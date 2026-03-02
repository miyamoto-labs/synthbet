# Setup Instructions

## Migrating Your Existing Repos

You have 3 existing repos to consolidate:
- `easypoly-landing` (frontend)
- `easypoly-engine` (Python engine)
- `easypoly-bot` (trading bot)

### Step 1: Create New Unified Repo

```bash
# On GitHub: Create new repo "easypoly" under miyamoto-labs
# Clone this hackathon template
cd ~/code  # or wherever you keep projects
git clone https://github.com/miyamoto-labs/easypoly.git
cd easypoly
```

### Step 2: Copy Existing Code

```bash
# Copy frontend (easypoly-landing)
cd ~/code
git clone https://github.com/miyamoto-labs/easypoly-landing.git
cp -r easypoly-landing/* easypoly/frontend/
rm -rf easypoly-landing

# Copy engine (easypoly-engine)
git clone https://github.com/miyamoto-labs/easypoly-engine.git
cp -r easypoly-engine/* easypoly/engine/
rm -rf easypoly-engine

# Copy bot (easypoly-bot)
git clone https://github.com/miyamoto-labs/easypoly-bot.git
cp -r easypoly-bot/* easypoly/bot/
rm -rf easypoly-bot
```

### Step 3: Update Dependencies

```bash
# Frontend
cd easypoly/frontend
npm install

# Engine
cd ../engine
pip install -r requirements.txt

# Bot
cd ../bot
npm install
```

### Step 4: Configure Environment

```bash
# Frontend
cd easypoly/frontend
cp .env.example .env.local
# Edit .env.local with your Synthdata API key

# Engine
cd ../engine
cp .env.example .env
# Edit .env with API keys

# Bot
cd ../bot
cp .env.example .env
# Edit .env with keys
```

### Step 5: Commit & Push

```bash
cd ~/code/easypoly
git add .
git commit -m "Initial hackathon submission structure"
git push origin main
```

---

## Quick Start (After Setup)

```bash
# Terminal 1: Engine
cd easypoly/engine
python api/main.py

# Terminal 2: Frontend
cd easypoly/frontend
npm run dev

# Terminal 3: Bot (optional)
cd easypoly/bot
node src/index.js
```

**Frontend:** http://localhost:3000  
**Engine API:** http://localhost:8000

---

## File Structure After Migration

```
easypoly/
├── README.md              ← Hackathon overview
├── .gitignore
├── frontend/
│   ├── README.md
│   ├── src/               ← Your landing page code
│   ├── public/
│   └── package.json
├── engine/
│   ├── README.md
│   ├── api/
│   ├── scanner/           ← Your Synthdata integration
│   ├── conviction/
│   └── requirements.txt
├── bot/
│   ├── README.md
│   ├── src/               ← Your bot code
│   └── package.json
└── docs/
    ├── HACKATHON.md       ← Submission documentation
    └── PITCH.md           ← Pitch deck (create this)
```

---

## Next Steps

1. **Test everything works** after migration
2. **Update package.json** paths if needed
3. **Create demo video** (5-10 min walkthrough)
4. **Write pitch deck** (docs/PITCH.md)
5. **Deploy frontend** (Vercel recommended)
6. **Submit to hackathon** before deadline

---

## Troubleshooting

**Import errors after migration?**
- Check that all relative paths are updated
- Verify `package.json` and `requirements.txt` are complete

**API keys not working?**
- Double-check `.env` files in each folder
- Make sure `.env` is in `.gitignore` (don't commit keys!)

**Port conflicts?**
- Frontend: Change port in `package.json` scripts
- Engine: Update `PORT` in engine/.env
- Bot: Update config in bot/config/settings.json
