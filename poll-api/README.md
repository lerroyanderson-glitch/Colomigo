# Colo-Migo shared poll service

This is a separate Cloudflare Worker + D1 SQLite backend for the static Colo-Migo Insights page.
The page cannot show real shared votes from HTML/JavaScript alone. This service stores
votes in D1, enforces one ballot per poll per persistent browser ID, and returns live
vote counts and percentages **only after a vote**.

## Deploy (one-time setup)

1. Sign in to a Cloudflare account, install Node.js 20+, and in this folder run `npx wrangler login`.
2. Run `npx wrangler d1 create colomigo-polls`; copy the returned database ID.
3. Copy `wrangler.toml.example` to `wrangler.toml`, replacing the sample database ID.
4. Generate a random **32+ character** server secret (use a password manager or a secure random generator).
   Run `npx wrangler secret put POLL_PEPPER` and paste it. Never commit this value.
5. Run `npx wrangler d1 migrations apply colomigo-polls --remote`.
6. Run `npx wrangler deploy`. Record the actual `https://...workers.dev` URL.
7. In the website's `assets/poll-config.js`, set
   `window.COLOMIGO_POLL_API_URL = "https://ACTUAL-WORKER-URL.workers.dev";`
   and publish the updated static site through its real hosting provider.
8. Visit `https://ACTUAL-WORKER-URL.workers.dev/health` and confirm `{"status":"ready"}`.
   Vote from two **separate browsers** on the published Insights page; verify the shared total
   and percentages. Test changing a ballot and refreshing the page.
9. If using a staging URL, add its **exact** origin to `ALLOWED_ORIGINS` in
   `wrangler.toml` before deploying. Do not use wildcards in production.

Cloudflare setup: https://developers.cloudflare.com/d1/get-started/
D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/

## Privacy and limitations

- The client uses a randomly generated UUID, saved in that browser's localStorage.
  The backend stores **only a poll-scoped HMAC digest** of it and the selected option.
- One **browser ID** can have only one ballot per poll cycle. Changing an answer updates
  that row without inflating the total. Different browsers and cleared site storage
  count as new voters: this is not a verified one-person-one-vote election.
- HTTP requests still pass through infrastructure providers; do not claim that IP
  addresses are never processed. The application does not intentionally store IP addresses,
  names, emails, or submitted free text.
- Server origin checks and browser tokens do not stop determined bots. Before promoting
  a high-traffic public poll, use Cloudflare WAF/rate limiting or Turnstile and monitor abuse.
- Never put `POLL_PEPPER` into HTML, JavaScript, `wrangler.toml`, or GitHub.
  Keep it stable across deployments or existing browser votes will no longer be recognized.
- All percentages come from committed D1 ballots, computed with largest-remainder
  rounding so nonempty results sum to 100%.
- Until the Worker is configured, deployed, the DB migrated, and its URL set in
  `assets/poll-config.js`, the page **does not accept votes or display fake results**.

## Tests

From the repository root, run `node --test poll-api/test/worker.test.mjs`.
The test is dependency-free and uses a D1-shaped in-memory database stub.
