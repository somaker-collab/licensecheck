# TinyVerify / LicenseCheck

> **Live application: [licensecheckreal-phi.vercel.app](https://licensecheckreal-phi.vercel.app)**
>
> Open the live dashboard to verify professional licences and company registrations against official registries, inspect source evidence, create daily monitors, and review change alerts.

TinyVerify is a Next.js verification dashboard built for the TinyFish TinyVerify bounty. It answers questions such as:

- Is this doctor registered with an official medical council?
- Is this company still registered?
- Are there several people or businesses with the same name?
- Did a monitored official record change after verification?

The application never guesses when the official source returns no candidate or several candidates. It returns structured evidence, the official source URL, and the time the source was checked.

## Open the live demo

**[Launch TinyVerify](https://licensecheckreal-phi.vercel.app)**

Main dashboard routes:

- `/` — verification dashboard
- `/verify` — submit a person, business, record type, jurisdiction, and optional registration number
- `/records` — review verified records and official source evidence
- `/monitors` — inspect active daily TinyFish monitors and last-checked timestamps
- `/alerts` — review status-change alerts
- `/history` — inspect verification history

The live deployment is built from the `main` branch of [somaker-collab/licensecheck](https://github.com/somaker-collab/licensecheck).

## TinyVerify bounty coverage

| Requirement | Implementation |
|---|---|
| Person/business, record type, and jurisdiction | Verification form accepts a name, record type, jurisdiction, and optional registration number. |
| At least two official registries or boards | Three meaningful official sources are supported. |
| Structured reusable output | Records include name, status, registration number, dates when published, disciplinary actions, restrictions, source URL, confidence, and checked timestamp. |
| Live official-source evidence | TinyFish Agent navigates the official registry and TinyFish Fetch corroborates the result. |
| No-match handling | Returns `not_found` without inventing a record. |
| Multiple-match handling | Returns every plausible candidate as `multiple_matches` without guessing. |
| Monitoring | TinyFish Monitor checks each monitored source daily and calls the authenticated webhook when the source changes. |
| Change alerts | The webhook stores the event, compares the new record with the previous record, writes history, and creates an alert for a meaningful change. |

## Supported official sources

| Jurisdiction | Record type | Official registry |
|---|---|---|
| Nepal | Medical licence | [Nepal Medical Council](https://nmc.org.np/) |
| United Kingdom | Medical licence | [UK General Medical Council](https://www.gmc-uk.org/) |
| New Zealand | Company registration | [New Zealand Companies Register](https://companies-register.companiesoffice.govt.nz/) |

This coverage satisfies the bounty requirement to check at least two official registries or licensing boards. It is not necessary to support both medical and company registration in every jurisdiction.

## TinyFish integration

### Agent

TinyFish Agent navigates official registry pages that do not expose convenient APIs. It extracts candidate records and returns structured fields such as name, status, registration number, dates, disciplinary actions, restrictions, and source URL. UK and New Zealand checks use this dynamic navigation path. Nepal's directly readable NMC search is optimized with a Fetch-first path so name and NMC-number checks do not wait for a redundant Agent browser run.

### Fetch

TinyFish Fetch retrieves the official result page for corroboration. The Nepal adapter also parses the official NMC Markdown table deterministically, which preserves all candidates for ambiguous names such as `Manoj Kumar Sah`.

### Monitor

When a verified record is watched, the application creates a **daily** TinyFish Monitor. TinyFish captures an initial baseline and checks the official page once per day at approximately 09:00 UTC. The application records the baseline/last-checked time and generates a per-monitor webhook token. Only the SHA-256 hash of that token is stored in MongoDB.

When a genuine TinyFish status or record change arrives, the webhook:

1. Authenticates the monitor event.
2. Rejects duplicate event IDs.
3. Stores the webhook event.
4. Re-checks the official page with TinyFish Agent.
5. Compares the new record with the previous record.
6. Writes verification history and an alert when a meaningful change is found.

A real status-change alert must come from TinyFish Monitor; test data must not be fabricated.

## Architecture

```text
Browser
  -> Next.js /api/verify
  -> TinyFish Agent
  -> official registry
  -> TinyFish Fetch corroboration
  -> MongoDB structured record

Verified record
  -> TinyFish Monitor (daily)
  -> /api/webhooks/tinyfish?token=<per-monitor-token>
  -> change detection
  -> verification history + alert
```

The project uses Next.js 14 route handlers, TypeScript, MongoDB/Mongoose, and Vercel serverless deployment. It does not require a local worker or always-on process.

## Environment variables

Configure these as **Production** environment variables in Vercel Project Settings. Never commit real credentials.

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
TINYFISH_API_KEY=sk-tinyfish-...
NEXT_PUBLIC_APP_URL=https://your-public-vercel-domain.vercel.app
```

`NEXT_PUBLIC_APP_URL` must be the public HTTPS URL that TinyFish can reach. It is used to construct the webhook URL. The current implementation generates a unique webhook token for each monitor, so a global `TINYFISH_WEBHOOK_SECRET` is not required.

For local development, create `.env.local` with the same variables. Do not commit `.env.local`.

## Deploy to Vercel from GitHub

### 1. Prepare MongoDB

1. Create or select a MongoDB database.
2. Create a database user with access to the application database.
3. Allow Vercel serverless function connections in the MongoDB network access settings. For a quick test, MongoDB Atlas can allow `0.0.0.0/0`; for production, use the network policy recommended by your organization.
4. Copy the MongoDB connection string into `MONGODB_URI`.

### 2. Connect the repository

1. Open [Vercel](https://vercel.com/new).
2. Import `somaker-collab/licensecheck` from GitHub.
3. Select the Next.js framework.
4. Use the repository root as the project root.
5. Keep the standard build settings, or set them explicitly:

```text
Install command: npm install
Build command: npm run build
Output directory: leave empty / automatic for Next.js
Node.js: 20.x or the current Vercel-supported LTS version
```

### 3. Add Production environment variables

In **Project Settings → Environment Variables**, add:

- `MONGODB_URI`
- `TINYFISH_API_KEY`
- `NEXT_PUBLIC_APP_URL` — set this to the final public HTTPS domain, without a trailing path

Add the variables to the **Production** environment. Add Preview/Development values only if those environments use separate databases and TinyFish credentials.

### 4. Deploy and verify

Deploy the `main` branch, then check:

```bash
npm install
npm run build
```

After deployment, open the Vercel URL and verify:

1. The dashboard loads.
2. A real UK, Nepal, or New Zealand source can be checked.
3. `/records` displays the official source URL and checked time.
4. A nonexistent query returns `not_found`.
5. An ambiguous query returns `multiple_matches` with all candidates.
6. Starting a monitor is idempotent and does not create duplicate active monitors.
7. `/monitors` shows the daily schedule and last-checked timestamp.
8. `/alerts` remains empty until a genuine meaningful TinyFish change is received.

## Deploy with the Vercel CLI

If the repository is already connected to the correct Vercel project:

```bash
npm install
npm run build
npx vercel login
npx vercel link
npx vercel env add MONGODB_URI production
npx vercel env add TINYFISH_API_KEY production
npx vercel env add NEXT_PUBLIC_APP_URL production
npx vercel --prod
```

The CLI prompts for secret values. Do not place credentials directly in shell history, source files, commits, or README content.

## Local development

```bash
git clone https://github.com/somaker-collab/licensecheck.git
cd licensecheck
npm install
cp .env.example .env.local  # if an example file is present; otherwise create .env.local manually
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A local webhook URL is not reachable by TinyFish unless it is exposed through a secure public HTTPS tunnel; use the deployed Vercel URL for real Monitor testing.

## API overview

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/verify` | Start a TinyFish verification job. |
| `GET` | `/api/verify/status/:id` | Poll a verification job and receive the final structured outcome. |
| `GET` | `/api/records` | List verified records. |
| `POST` | `/api/records/:id/watch` | Create or reuse the active daily monitor for a record. |
| `GET` | `/api/monitors` | List active monitors and last-checked timestamps. |
| `GET` | `/api/alerts` | List persisted status-change alerts. |
| `POST` | `/api/webhooks/tinyfish?token=...` | Receive an authenticated TinyFish Monitor event. |

## Evidence examples

- **Verified:** an exact registration number returns one corroborated official record.
- **Multiple matches:** `Manoj Kumar Sah` on the Nepal Medical Council returns multiple official NMC candidates, including their registration numbers, rather than selecting one arbitrarily.
- **No match:** an intentionally nonexistent query returns `not_found`.
- **Monitoring:** an active record can be watched daily, with a visible baseline/last-checked timestamp and alert processing ready for genuine TinyFish status changes.

## Security and data-handling notes

- Credentials belong only in Vercel environment variables or local `.env.local`.
- Webhook tokens are generated per monitor and stored as hashes, not plaintext.
- Official-source URLs and checked timestamps are retained with verification results.
- The app does not delete production records as part of normal verification or monitor setup.
- A `multiple_matches` result must be resolved by the user; the application does not guess.
