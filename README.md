# Pettoggle 🐾

**1v1 Pet Beauty Duels** — Two strangers connect via webcam, Claude AI judges whose pet is cuter, and results update a global ELO leaderboard.

## Setup

### 1. Install dependencies

```bash
# From project root
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run dev servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

## Testing

Open **two browser tabs** at http://localhost:5173, click "Play Now" in both — they'll be matched and you can test the full duel flow against yourself (camera will show the same feed in both).

## Architecture

- **WebRTC** — P2P video via STUN (Google's public server). For production, add a TURN server (Twilio has a free tier: [https://www.twilio.com/stun-turn](https://www.twilio.com/stun-turn))
- **Socket.io** — Signaling channel for WebRTC + game events
- **Claude Vision** — Scores pets across Cuteness, Coat Quality, Eye Appeal, Expression
- **ELO** — K=32, starting 1000. Walkover win = +8 ELO

## Production TURN Server

Add to `.env`:
```
TURN_URL=turn:global.turn.twilio.com:3478
TURN_USERNAME=<twilio_username>
TURN_CREDENTIAL=<twilio_password>
```

Then update `ICE_SERVERS` in `client/src/hooks/useWebRTC.js`.
# Odoggle
