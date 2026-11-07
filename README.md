# TinyVerify / LicenseCheck

TinyVerify verifies people and businesses against live official registries. It uses TinyFish Agent to navigate registry websites, TinyFish Fetch to corroborate the specific result page, and TinyFish Monitor to watch verified records for changes.

## TinyVerify bounty coverage

This build accepts a person or business name, a licence or record type, a jurisdiction, and an optional licence or registration number. It returns status, licence or registration number, expiry date when published, disciplinary actions when published, official source URL, and checked timestamp. It explicitly handles no-match and multiple-match results without guessing.

## Supported official sources

- Nepal Medical Council

- UK General Medical Council

- New Zealand Companies Register

## TinyFish integration

- **Agent:** navigates official sites without usable APIs and returns structured candidate records.

- **Fetch:** retrieves every candidate's official source page and rejects candidates with no fetched page content.

- **Monitor:** watches the official page daily. The Vercel webhook hashes page content, re-checks changed pages with Agent, compares the record, and creates a history entry and alert when status or registration data changes.

## Vercel architecture

```
Browser -> Next.js /api/verify -> TinyFish Agent -> official registry
                                  -> TinyFish Fetch -> official result page
                                  -> MongoDB
MongoDB record -> TinyFish Monitor -> Vercel webhook -> change detection -> alert
```

## Environment variables

Configure these in Vercel Project Settings or `.env.local`. Never commit credentials.

```
MONGODB_URI=
TINYFISH_API_KEY=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

`NEXT_PUBLIC_APP_URL` must be the public HTTPS Vercel URL so TinyFish can reach `/api/webhooks/tinyfish`.

## Run and deploy

```bash
npm install
npm run dev
npm run build
```

The app uses Next.js route handlers and MongoDB. It does not require a local worker or always-on process.

## Demo checklist

Show a successful medical licence verification, a company registration verification, a no-match result, a multiple-match result, the official source link and checked time, starting a Monitor, and a status-change alert.

## License

MIT
