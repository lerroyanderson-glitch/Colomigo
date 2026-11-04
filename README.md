# Colo-Migo
Colocation & Connectivity Advisors — a responsive, buildless marketing website for LeRoy Anderson.

## Contents
- `index.html`: services, approach, founder background, contact, privacy notice, and project brief.
- `assets/styles.css`: warm stone, charcoal, muted olive, and bronze; Instrument Serif + Manrope.
- `assets/site.js`: mobile navigation, accessible dialogs, copy email, and email-draft project brief.
- `scripts/check_site.py`: local HTML, asset, link, and content checks.
- `.github/workflows/check-site.yml`: automated structural and JavaScript syntax checks.

## Preview
Open `index.html` in a browser, or run `python3 -m http.server 8000` from this folder.
No dependency installation or build step is required.

## Checks
```sh
python3 scripts/check_site.py
node --check assets/site.js
```

## Publishing
This repository contains source code; a commit or pull request is not proof of deployment.

## About and editorial pages

- `/about/` introduces LeRoy Anderson, his career, an anonymized CoreSite example, the Colo-Migo mission, family and interests, and volunteering. Career material is owner supplied; the profile photograph and selected recommendation excerpts come from his LinkedIn profile. The featured Google Project Management Professional Certificate links to its verified Credly record. Individual course certificates are labeled separately.
- The homepage remains focused on the advisory services. The navigation opens a dedicated About page, and the former “Why Colo-Migo?” hero button has been removed.
- Insights leads with company editorial analysis credited to Colo-Migo Staff, followed by three supporting stories. `assets/insights-sources.mjs` excludes their source URLs from the compact additional headlines, including tracking and trailing-slash variants.
- The FIELD NOTE poll answers the issue's capacity question. The separate buyer poll asks about planning priorities and provides a practical next step. Both show answer counts alongside percentages after a confirmed ballot.
- “Email me the next brief” opens an email request to LeRoy. Requests and distribution are handled manually; no automated mailing service or automatic subscription is implied.
Publish the static root folder through an authorized hosting provider.
Do not change the domain's MX, SPF, DKIM, or DMARC records when connecting the website: these support Private Email.
The production domain is colomigo.com. Do not enable a custom-domain redirect before hosting is configured.

## Contact behavior
All contact links address leroy@colomigo.com. The project brief opens a pre-filled message in the visitor's email app; it does not submit to a server, save data, or promise delivery.
No provider affiliations, client testimonials, or performance guarantees are claimed.

## External assets and privacy
Fonts load from Google Fonts. The illustrative data-center image loads from Unsplash:
https://images.unsplash.com/photo-1558494949-ef010cbdcc31
The photo is illustrative, not a facility owned or operated by Colo-Migo.
These external resources require internet access. Text remains usable with fallback fonts and a dark hero background if resources fail.
No analytics or advertising cookies are added by the source.

## Review status
Prepared from the approved warm-stone/olive industrial mockup. The original generated mockup is a design reference, not an exported image asset for this site.
Automated checks run in GitHub Actions when enabled. Responsive browser verification and hosting configuration remain to be completed before launch.

## The Colo-Migo Brief / Insights
- New `/insights/` editorial landing page, search and filters for sourced news, and a rotating 21-day industry poll.
- **Primary shared-voting implementation:** Netlify Functions + Netlify Database (Postgres). The website calls `/.netlify/functions/poll` on its own origin; no additional voting domain is needed.
- Poll cycles use UTC November 3, 2026 as the start and rotate every 21 days: Nov 3, Nov 24, Dec 15, and so on. Each issue uses a unique poll ID, so all totals start at zero and past records remain separate.
- Each browser gets a random anonymous ID (stored locally); the backend stores only a poll-scoped SHA-256 digest and the selected option. Votes are unique per browser ID and issue; changing an answer updates rather than inflating the count. Percentages are calculated from committed rows and shown only after a confirmed vote.
- The FIELD NOTE has a separate yes/no ballot for each 21-day issue. Its question rotates with the issue clock and its totals are kept separate from the broader industry poll in the same Netlify Database table.
- To review recorded totals by poll and answer in Netlify Database, query `SELECT poll_id, choice_id, COUNT(*) AS votes FROM poll_votes GROUP BY poll_id, choice_id ORDER BY poll_id, choice_id;`. The public page shows the current issue's totals and percentages after a browser votes.
- Votes are browser-scoped, **not identity-verified**. Users can vote again using another browser or clearing storage. Apply additional anti-abuse protections if polls become high-traffic. Netlify infrastructure may process IP addresses.
- **Deployment:** Netlify must have Database enabled on a qualifying credit-based plan. Netlify's managed database can be provisioned on deploy and can consume usage credits. SQL migration `netlify/database/migrations/20261104000000_create_poll_votes.sql` is automatically applied before publishing. Verify database provisioning and function response on the deploy preview before merging. See https://docs.netlify.com/build/data-and-storage/netlify-database/ for eligibility and details.
- The Cloudflare Worker implementation in `poll-api/` remains as an alternative, but Netlify's database/Function is the default.
- Scheduled 21-day headline refresh is separate from poll rotation; editorial analysis requires manual review each issue.
- GitHub changes and deploy previews do not prove that the poll has been made live on `colomigo.com`.

## Validation
```sh
python3 scripts/check_site.py
python3 scripts/check_insights.py
node --check assets/insights.js
node --test poll-api/test/*.test.mjs
npm run build
```
