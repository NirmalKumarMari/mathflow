# MathFlow

An adaptive math tutor: a Vite/React frontend backed by a small Node/Express
API (`server/`) — Postgres for data, JWT for auth, and the Anthropic Claude
API for tutoring, question generation, and grading.

## Local development

```bash
# Backend
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, etc.
npm install
npm run migrate        # applies any pending files in migrations/
npm run dev             # http://localhost:8080

# Frontend (separate shell)
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev              # http://localhost:5173
```

## Deploying to GCP

See [DEPLOY.md](DEPLOY.md) — Cloud Run + Cloud SQL for the API, Firebase
Hosting for the static frontend.
