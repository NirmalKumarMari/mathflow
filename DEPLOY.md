# Deploying MathFlow to GCP

Two pieces: the `server/` API (Cloud Run + Cloud SQL) and the static frontend
(Firebase Hosting). Run these from the repo root unless noted.

## 0. Prerequisites

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## 1. Cloud SQL (Postgres)

```bash
gcloud sql instances create mathflow-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-auto-increase

gcloud sql databases create mathflow --instance=mathflow-db

gcloud sql users create mathflow \
  --instance=mathflow-db \
  --password=CHOOSE_A_STRONG_PASSWORD
```

Note the connection name: `gcloud sql instances describe mathflow-db --format='value(connectionName)'`
(looks like `YOUR_PROJECT_ID:us-central1:mathflow-db`).

Run the migration once, via the Cloud SQL Auth Proxy from your machine:

```bash
# https://cloud.google.com/sql/docs/postgres/sql-proxy
./cloud-sql-proxy YOUR_PROJECT_ID:us-central1:mathflow-db &

cd server
DATABASE_URL="postgres://mathflow:CHOOSE_A_STRONG_PASSWORD@127.0.0.1:5432/mathflow" npm run migrate
```

## 2. Secrets

```bash
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create jwt-secret --data-file=-
printf '%s' "CHOOSE_A_STRONG_PASSWORD" | gcloud secrets create db-password --data-file=-
printf '%s' "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-
printf '%s' "your-google-oauth-client-secret" | gcloud secrets create google-client-secret --data-file=-
```

## 3. Google OAuth client (for "Continue with Google")

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials),
create an OAuth 2.0 Client ID (Web application). You'll add the exact
redirect URI after the backend's Cloud Run URL is known (step 4), then update
the client and redeploy — chicken-and-egg, expected on first deploy.

## 4. Deploy the backend to Cloud Run

```bash
cd server
gcloud run deploy mathflow-api \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:mathflow-db \
  --set-env-vars="DB_SOCKET_PATH=/cloudsql/YOUR_PROJECT_ID:us-central1:mathflow-db,DB_USER=mathflow,DB_NAME=mathflow,FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN,BACKEND_URL=https://mathflow-api-xxxx.a.run.app,GOOGLE_CLIENT_ID=your-oauth-client-id,ANTHROPIC_MODEL=claude-sonnet-5" \
  --set-secrets="DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest"
```

Take the printed service URL, use it as `BACKEND_URL` on redeploy, and add
`<that URL>/api/auth/google/callback` as an authorized redirect URI on the
OAuth client from step 3.

Optional: send transactional email (OTP codes, password reset) through an
SMTP relay by also setting `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`
(e.g. SendGrid's SMTP relay). Without it, emails are just logged — fine for
testing, not for real users.

## 5. Deploy the frontend

Build against the deployed API:

```bash
echo "VITE_API_BASE_URL=https://mathflow-api-xxxx.a.run.app" > .env.production
npm run build
```

Then host `dist/` on Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: dist, single-page app: yes
firebase deploy --only hosting
```

Update the backend's `FRONTEND_URL` env var (step 4) to match the resulting
Firebase Hosting URL (or custom domain) and redeploy the backend so CORS and
the Google OAuth/password-reset redirect links point at the right place.

## Known follow-ups

- **Re-host the textbook assets**: [src/lib/textbooks.js](src/lib/textbooks.js)
  still points `syllabus_url`/`textbook_url` at `media.base44.com` — those
  files were uploaded through base44's file storage and won't survive
  cancelling the base44 project. Download them, upload to a public GCS
  bucket (`gsutil cp ... gs://your-bucket/`, or Firebase Hosting alongside
  the frontend), and update the URLs in that file.
- **Email deliverability**: pick a real SMTP relay before launch (see step 4)
  — without one, OTP/reset emails only get logged server-side.
