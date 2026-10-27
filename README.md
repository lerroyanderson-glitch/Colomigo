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
