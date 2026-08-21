# Deploying MathFlow to GCP

One GCP project, two environments — `staging` and `prod` — kept apart by
resource naming, not by project boundary. That keeps cost and setup low
while still giving each environment its own database, its own service, its
own URL, and its own secrets. The one shared piece is the Cloud SQL
**instance** (the only always-on cost); each environment gets its own
database and DB user inside it, so a mistake in one environment's
connection settings can't reach the other's data (see "Isolation" note in
step 1).

Every deploy is a command you run by hand — nothing redeploys on git push.
Run these from the repo root unless noted.

## 0. Prerequisites (one time)

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## 1. Cloud SQL (Postgres) — one instance, two databases

```bash
gcloud sql instances create mathflow-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-auto-increase

# One database + one DB user per environment.
gcloud sql databases create mathflow_staging --instance=mathflow-db
gcloud sql databases create mathflow_prod --instance=mathflow-db

gcloud sql users create mathflow_staging --instance=mathflow-db --password=CHOOSE_A_STAGING_PASSWORD
gcloud sql users create mathflow_prod --instance=mathflow-db --password=CHOOSE_A_DIFFERENT_PROD_PASSWORD
```

**Isolation**: right after creating the users, connect once as the instance's
default `postgres` superuser and revoke each app user's default access to
the *other* environment's database, so a wrong `DATABASE_URL` fails loudly
instead of silently touching the wrong data:

```sql
revoke all on database mathflow_prod from mathflow_staging;
revoke all on database mathflow_staging from mathflow_prod;
```

Note the connection name for later:
`gcloud sql instances describe mathflow-db --format='value(connectionName)'`
(looks like `YOUR_PROJECT_ID:us-central1:mathflow-db`).

Run migrations against each database once, via the Cloud SQL Auth Proxy:

```bash
# https://cloud.google.com/sql/docs/postgres/sql-proxy
./cloud-sql-proxy YOUR_PROJECT_ID:us-central1:mathflow-db &

cd server
DATABASE_URL="postgres://mathflow_staging:CHOOSE_A_STAGING_PASSWORD@127.0.0.1:5432/mathflow_staging" npm run migrate
DATABASE_URL="postgres://mathflow_prod:CHOOSE_A_DIFFERENT_PROD_PASSWORD@127.0.0.1:5432/mathflow_prod" npm run migrate
```

You'll re-run the second command (pointed at `mathflow_prod`) any time a
future PR adds a new file under `server/migrations/`.

## 2. Secrets

`JWT_SECRET` and the DB passwords **must** differ per environment (a leaked
staging JWT secret shouldn't let anyone forge a prod session). Anthropic and
Twilio keys can be shared to start — split them later only if you want
separate usage/billing visibility per environment.

```bash
# Per-environment
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create jwt-secret-staging --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create jwt-secret-prod --data-file=-
printf '%s' "CHOOSE_A_STAGING_PASSWORD" | gcloud secrets create db-password-staging --data-file=-
printf '%s' "CHOOSE_A_DIFFERENT_PROD_PASSWORD" | gcloud secrets create db-password-prod --data-file=-

# Shared across both environments
printf '%s' "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-
printf '%s' "your-google-oauth-client-secret" | gcloud secrets create google-client-secret --data-file=-
printf '%s' "your-twilio-auth-token" | gcloud secrets create twilio-auth-token --data-file=-
```

## 3. Google OAuth client (for "Continue with Google")

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials),
create **one** OAuth 2.0 Client ID (Web application) — Google lets a single
client hold multiple redirect URIs, so both environments share it. You'll
add the two exact callback URLs after step 4 gives you the Cloud Run URLs
(chicken-and-egg, expected on first deploy):

- `https://mathflow-api-staging-xxxx.a.run.app/api/auth/google/callback`
- `https://mathflow-api-prod-xxxx.a.run.app/api/auth/google/callback`

## 4. Deploy the backend to Cloud Run

Same command for both environments — only the service name, DB name/user,
and secret names change. **This is the command you actually run whenever
you want to push a change live**; nothing else triggers it.

```bash
cd server

# --- Staging ---
gcloud run deploy mathflow-api-staging \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:mathflow-db \
  --set-env-vars="DB_SOCKET_PATH=/cloudsql/YOUR_PROJECT_ID:us-central1:mathflow-db,DB_USER=mathflow_staging,DB_NAME=mathflow_staging,FRONTEND_URL=https://mathflow-staging.web.app,BACKEND_URL=https://mathflow-api-staging-xxxx.a.run.app,GOOGLE_CLIENT_ID=your-oauth-client-id,ANTHROPIC_MODEL=claude-sonnet-5,TWILIO_ACCOUNT_SID=your-twilio-account-sid,TWILIO_FROM_NUMBER=+14155551234" \
  --set-secrets="DB_PASSWORD=db-password-staging:latest,JWT_SECRET=jwt-secret-staging:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,TWILIO_AUTH_TOKEN=twilio-auth-token:latest"

# --- Production (note: different service name, DB user/name, secrets) ---
gcloud run deploy mathflow-api-prod \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:mathflow-db \
  --set-env-vars="DB_SOCKET_PATH=/cloudsql/YOUR_PROJECT_ID:us-central1:mathflow-db,DB_USER=mathflow_prod,DB_NAME=mathflow_prod,FRONTEND_URL=https://mathflow.web.app,BACKEND_URL=https://mathflow-api-prod-xxxx.a.run.app,GOOGLE_CLIENT_ID=your-oauth-client-id,ANTHROPIC_MODEL=claude-sonnet-5,TWILIO_ACCOUNT_SID=your-twilio-account-sid,TWILIO_FROM_NUMBER=+14155551234" \
  --set-secrets="DB_PASSWORD=db-password-prod:latest,JWT_SECRET=jwt-secret-prod:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,TWILIO_AUTH_TOKEN=twilio-auth-token:latest"
```

Take each printed service URL and use it as that environment's `BACKEND_URL`
on redeploy, and add `<that URL>/api/auth/google/callback` as an authorized
redirect URI on the OAuth client from step 3.

Optional: send transactional email (OTP codes, password reset) through an
SMTP relay by also setting `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
(e.g. SendGrid's SMTP relay). Without it, emails are just logged — fine for
staging, not for real users on prod.

## 5. Deploy the frontend — two Firebase Hosting sites, one project

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: dist, single-page app: yes
```

Add a second hosting site (free — Firebase Hosting allows multiple sites per
project) and map both as deploy targets:

```bash
firebase hosting:sites:create mathflow-staging
firebase target:apply hosting staging mathflow-staging
firebase target:apply hosting prod YOUR_DEFAULT_FIREBASE_SITE   # usually your-project-id
```

Update `firebase.json` so each target has its own `"hosting"` block (same
`public: "dist"` / SPA rewrite, different `"target"` key), then build and
deploy each environment against its own backend URL:

```bash
# --- Staging ---
echo "VITE_API_BASE_URL=https://mathflow-api-staging-xxxx.a.run.app" > .env.production
npm run build
firebase deploy --only hosting:staging

# --- Production ---
echo "VITE_API_BASE_URL=https://mathflow-api-prod-xxxx.a.run.app" > .env.production
npm run build
firebase deploy --only hosting:prod
```

(`.env.production` is what `vite build` reads — you're overwriting it
between the two builds, which is why staging and prod are always built and
deployed as separate steps, never in the same `npm run build`.)

Once you have each Hosting URL, go back to step 4 and redeploy each Cloud
Run service with the matching `FRONTEND_URL`, so CORS and the
Google-OAuth/password-reset redirect links point at the right frontend.

## Day-to-day: shipping a change

1. Merge/commit your change locally.
2. `gcloud run deploy mathflow-api-staging ...` (same command as step 4) +
   `firebase deploy --only hosting:staging` — check it on the staging URL.
3. Happy with it → run the same two commands with `-prod` instead of
   `-staging`. That's the whole promotion step; there's no automatic
   pipeline, so prod only ever changes when you run that command.

Worth saving steps 4 and 5's two commands per environment as short shell
scripts (`deploy-staging.sh` / `deploy-prod.sh`) once the placeholders below
are filled in with your real project ID and service URLs, so "ship to
staging" is one command instead of copy-pasting from this doc each time.

## Known follow-ups

- **base44 is still connected to this GitHub repo.** `origin/main` picked up
  an automated commit ("Update base44 packages") from
  `base44-builder[bot]` after the removal branch was opened — the base44
  project is still watching this repo and can keep pushing to `main`.
  Disconnect/archive the GitHub sync in base44's project settings once
  you've merged the removal PR, or it'll keep committing base44-related
  changes to `main` indefinitely.
- **Re-host the textbook assets**: [src/lib/textbooks.js](src/lib/textbooks.js)
  still points `syllabus_url`/`textbook_url` at `media.base44.com` — those
  files were uploaded through base44's file storage and won't survive
  cancelling the base44 project. Download them, upload to a public GCS
  bucket (`gsutil cp ... gs://your-bucket/`), and update the URLs in that
  file.
- **Merge the removal PR**: the base44-removal + phone/OTP-login work is
  still sitting on the `remove-base44-dependency` branch, not on `main`.
- **Get real third-party credentials**: a Twilio account (Account SID, Auth
  Token, a from-number capable of SMS) for phone OTP, an Anthropic API key,
  and an SMTP relay for email deliverability — all currently fall back to
  console-logging when unset, which is fine for staging, not for prod.
- **End-to-end test against a real database**: everything's been verified
  with syntax checks, a build, and smoke tests against a backend with no
  live Postgres. The full register → verify → login → practice flow, and
  the phone-OTP flow, haven't been exercised against a real database yet —
  worth doing on staging before promoting to prod.
