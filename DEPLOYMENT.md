# Doggle — Deployment Guide

Architecture: **Supabase** (auth + DB + Realtime) · **Google Cloud Functions** (Gemini scoring) · **Vercel** (frontend)

---

## 1. Supabase Setup

### a) Create project
1. [supabase.com](https://supabase.com) → New Project → choose a region close to your users

### b) Run schema
Dashboard → **SQL Editor** → paste full contents of `supabase/schema.sql` → Run

### c) Enable Google OAuth
1. Dashboard → **Authentication** → **Providers** → Google → Enable
2. [console.cloud.google.com](https://console.cloud.google.com) → Credentials → Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
4. Paste Client ID + Secret into Supabase

### d) Enable anonymous sign-in
Dashboard → **Authentication** → **Providers** → Anonymous → Enable

### e) Copy your keys (Settings → API)
```
VITE_SUPABASE_URL      = https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...   (anon / public key)
SUPABASE_SERVICE_ROLE_KEY = eyJ...  (service_role key — keep secret, only used in Cloud Function)
```

---

## 2. Google Cloud — Gemini Scoring Function

### a) Prerequisites
- Cloud Functions API already enabled ✓
- Enable **Generative Language API**: Cloud Console → search "Generative Language API" → Enable
- Get a **Gemini API key**: [aistudio.google.com](https://aistudio.google.com) → Get API key

### b) Install gcloud CLI (if not installed)
```bash
# Mac
brew install google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### c) Deploy
```bash
cd functions/gemini-score
npm install
cd ../..

gcloud functions deploy geminiScore \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=functions/gemini-score \
  --entry-point=geminiScore \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=AIza...,SUPABASE_URL=https://xxxx.supabase.co,SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### d) Copy the function URL
After deploy, the CLI prints a URL like:
```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/geminiScore
```
Save this — you'll need it for Vercel.

---

## 3. Vercel — Frontend

1. Push this repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → Import GitHub repo
3. Settings:
   - **Root Directory**: `client`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SCORE_FUNCTION_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/geminiScore
```
5. Deploy

### Update Supabase redirect URLs
Dashboard → **Authentication** → **URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

---

## Local development

```bash
cp .env.example .env
# fill in all three VITE_ vars

cd client && npm install && npm run dev
# Frontend: http://localhost:5173
```

To test the Cloud Function locally:
```bash
cd functions/gemini-score
npm install
GEMINI_API_KEY=AIza... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx @google-cloud/functions-framework --target=geminiScore
# Runs at http://localhost:8080
```

---

## Stripe Premium (when ready)

1. Create a Stripe account → get API keys
2. Create a second Cloud Function `stripe-checkout` that creates a Checkout session
3. On Stripe webhook success, update `players.is_premium = true` via Supabase service role client
