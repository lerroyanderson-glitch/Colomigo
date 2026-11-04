"""Static validation for the Colo-Migo Insights page."""
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
import json

root=Path(__file__).resolve().parent.parent
page=(root/"insights/index.html").read_text()
script=(root/"assets/insights.js").read_text()
feed=json.loads((root/"insights/feed.json").read_text())
assert page.count("<h1")==1
for token in ('id="pulse-form"','id="wire-grid"','id="story-search"','id="poll-result"'):
    assert token in page,token
for path in ("index.html","colocation-renewals/index.html","colocation-relocations/index.html"):
    assert 'href="/insights/"' in (root/path).read_text(), path
assert "https://colomigo.com/insights/" in (root/"sitemap.xml").read_text()
assert "window.COLOMIGO_POLL_API_URL" in script
assert 'id="poll-percentages"' in page
assert '/assets/poll-config.js' in page
assert (root/"poll-api/worker.mjs").is_file()
assert (root/"poll-api/migrations/0001_poll_votes.sql").is_file()
assert feed["update_interval_days"]==21
assert date.fromisoformat(feed["updated_at"])<=date.today()
for item in feed["stories"]:
    assert item["category"] in ("power","market","ai","network")
    assert urlparse(item["url"]).scheme=="https"
    assert date.fromisoformat(item["published"])<=date.today()
print("PASS: insights page, source feed, and shared poll integration")
