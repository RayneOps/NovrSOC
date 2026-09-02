# NovrSOC Production Notes — September 2026

Everything below was verified directly against the live deployment
(`https://novrsoc-production.up.railway.app` and `https://socnovr.vercel.app`)
on 2026-09-02, not assumed from code alone — see each item for how it was checked.

## Known issues

1. **`APP_API_BASE_URL` and `CTIP_API_URL` (both `138.197.188.132`) are unreachable
   from Railway's own network right now** — confirmed by calling `/api/customers` and
   `/api/ctip/feed-status` directly against the live production backend; both returned
   `502` after an ~11s hang before this pass added timeouts (now ~5s). This single host
   backs `account`, `advisories`, `compliance`, `customers`, `vendor-assessments`,
   scan-history persistence, and — critically — **the entire `/api/portal/*` proxy and
   the non-dev-bypass `auth/signin|google|signup` paths**. Practical effect right now:
   - The **client portal cannot log in** (`POST /api/portal/auth/signin` → 502).
   - **Google OAuth sign-in on the admin login page does not work** (`POST
     /api/auth/google` → 502). Only the `DEV_ADMIN_EMAIL`/`DEV_ADMIN_PASSWORD`
     bypass login currently works for admin access.

   Everything on this host fails gracefully (empty arrays / clear error, no crash,
   no leaked stack trace) and now times out in ~5s instead of ~11s. Fixing the
   outage itself is infrastructure work outside this repo.

2. Wazuh: `WAZUH_HOST`/`WAZUH_INDEXER_HOST` are correctly set to the public IP
   (`169.58.242.174`) on Railway — confirmed live via `GET /api/wazuh/status`
   returning real agent data (3 registered, 2 active). No action needed here.

3. **TheHive is reachable but its configured credentials don't authenticate.**
   `THEHIVE_URL` (169.58.242.194:9000) responds; a direct `listCase` query using
   the `THEHIVE_USER`/`THEHIVE_PASSWORD` currently in `.env` returns
   `401 AuthenticationError`. `getCases()`/`createCase()` (added this pass) are
   wired but will fail until the credentials are corrected — `incidentResponse.ts`
   falls back to the existing Wazuh-derived queue when that happens, so this
   degrades gracefully rather than breaking incident viewing.

4. **Shuffle's webhook accepts requests, but the payload shape may not match its
   workflow.** The configured `SHUFFLE_WEBHOOK_URL` responds `200`, but echoes a
   template referencing `$exec.body.rule.description` — i.e. it looks built to
   receive a raw Wazuh alert body, not the `{novrsoc_incident_id, title, severity,
   ...}` shape `notifyShuffleOfIncident()` sends on incident creation. The workflow's
   actual logic wasn't inspectable from here — verify directly in Shuffle's UI
   whether an incident-creation POST actually produces a TheHive case before
   relying on this.

5. **15 backend routes are not behind `requireAuth`**, by design for now: `wazuh`,
   `incidents`, `threats`, `threat`, `brand`, `dns`, `urlscan`, `webscan`,
   `vendor-assessments`, `sla`, `org-cti`, `recovery`, `weblogic`, `alerts`,
   `advisories`. These are called by 22 components shared between the admin app
   and the client portal; portal users only hold a `portal_token` this backend
   cannot verify (separate signing secret, held by the external portal backend).
   Gating these needs dual-token verification built first — see `index.ts`'s
   block comment for the full reasoning.

6. Multitenancy is partial: `compliance` and `customers` now derive `org_id` from
   the authenticated token rather than trusting a client-supplied value; `wazuh`,
   `incidents`, `threats`, and `org-cti` are not yet scoped (blocked on #5 above).

7. NovrAI requires `ANTHROPIC_API_KEY` in the Railway environment — as of this
   deploy it's still the placeholder value from `.env`
   (`[GET FROM console.anthropic.com — replace this]`), so `POST /api/novr-ai`
   returns `503 {"configured": false}` until a real key is set there. This is the
   intended graceful-degradation behavior, not a crash.

8. Nigerian Threat Feed (`/admin/threat/nigeria`) shows explicitly-labeled mock
   NCC-CSIRT/NGCERT advisory data — no live scraper exists yet. (Separately, the
   Nigeria threat *map* on the dashboard is real Wazuh-derived data with honest
   zeros, not mock — don't conflate the two; they're different components.)

9. SMTP is configured for `info@cybernovr.com` via Zoho — not independently
   re-verified this pass (would require actually sending mail); test before
   relying on it for a real alert.

10. OPNsense integration is not connected — needs physical hardware.

## What's actually verified working (live, today)

- **Backend deploy**: Railway auto-deployed the merged `main` within the same
  session — confirmed via `GET /health` (200, <1s) and by polling a
  `requireAuth`-protected route until it started correctly returning 401/200.
- **Frontend deploy**: Vercel auto-deployed — confirmed the new
  `/admin/threat/scanner` page and `/login` both return 200. Full visual
  confirmation wasn't possible from this environment (no browser available,
  only `curl`, which sees the pre-hydration HTML shell for client components).
- **Admin login (dev-bypass path)**: `POST /api/auth/signin` with
  `DEV_ADMIN_EMAIL`/`DEV_ADMIN_PASSWORD` returns a token with `org_id` and
  `role` populated in the payload — confirmed by decoding a live token.
- **`requireAuth` enforcement**: confirmed both directions live —
  no token → `401`; a valid dev-admin token → passes through to the route
  handler. (This required a same-day hotfix — see below.)
- **External-fetch timeout fix**: confirmed live — `/api/advisories` (hits the
  down `138.197.188.132` host) now fails in ~5.7s instead of ~11s.
- **Wazuh Manager REST + Indexer**: both reachable from Railway, real agent
  data flowing.

## Hotfix shipped same day as this deploy

Mounting `requireAuth` surfaced a pre-existing bug it made load-bearing: the
dev-login token was signed with `DEV_TOKEN_SECRET` only, but `requireAuth`
verifies with `JWT_SECRET || DEV_TOKEN_SECRET` — and Railway has both set to
different values (intentionally — they're meant to be separate secrets). Every
freshly-issued dev-admin token therefore failed verification against every
newly-protected route, confirmed live before the fix. Corrected to sign with
the same priority order `requireAuth` verifies with; redeployed and reconfirmed
live the same session.
