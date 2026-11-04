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
- The `/insights/` page includes responsive news, topic filters, search, and 21-day rotating poll questions.
- Shared voting has been **implemented in source code but is not live until deployment and configuration**. See [poll-api/README.md](poll-api/README.md) for setting up the Cloudflare Worker, D1 database, secret, URL, and testing.
- The browser creates an anonymous voter ID; the API stores a poll-scoped cryptographic digest and the choice. A repeat vote updates an existing ballot rather than incrementing the total. After voting, the page shows real totals and percentages computed from database records.
- One vote per browser ID is not identity verification: users can vote again after resetting browser storage or using another browser. Add Cloudflare WAF/rate limits or Turnstile before a high-profile public poll.
- The `assets/poll-config.js` API URL is intentionally empty until a real backend is deployed. The poll fails closed rather than displaying fabricated counts or claiming a vote was submitted.
- Source-linked headlines are maintained in `insights/feed.json`. A scheduled check attempts a 21-day RSS refresh; static editorial analysis still requires manual review.
- GitHub commits and a pull request are not evidence of deployment to colomigo.com.

## Validation
```sh
python3 scripts/check_site.py
python3 scripts/check_insights.py
node --check assets/insights.js
node --check poll-api/worker.mjs
node --test poll-api/test/worker.test.mjs
```
