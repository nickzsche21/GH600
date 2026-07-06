# Commands

## Local preview (static only, no backend)

```
python -m http.server 4173
```

Open `http://127.0.0.1:4173`. `backend.enabled` is `true` on this path (any
non-`file:` protocol), but there's no `/api` to answer it — requests fail
silently and `app.js` falls back to `localStorage` + `access-config.js`
DEMO codes. This mode cannot exercise the API or Supabase.

## Local full-stack preview

Requires the Vercel CLI and a linked project with env vars set (see
`.env.example`):

```
vercel dev
```

## Tests

```
npm test
```

Runs `node --test tests/*.test.js` (`api.test.js`, `plans.test.js`,
`static.test.js` — no test runner config beyond Node's built-in one).

## Syntax check

```
npm run check
```

Runs `node --check app.js`.

## Deploy

1. Create/confirm the Supabase project and run `supabase/schema.sql`.
2. Create Razorpay Payment Links for each plan.
3. Import as a Vercel project — **project root must be `gh600-lab`**
   (this directory, not `Saas/` above it).
4. Set env vars from `.env.example` in Vercel Project Settings.
5. Deploy, then run the end-to-end check in the root `README.md` ("Deploy
   the paid-ready MVP" steps 5–6) before treating it as live.

There is no CI config in this repo — `npm test` and `npm run check` are run
manually before deploying.
