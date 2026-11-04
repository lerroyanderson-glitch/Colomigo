"""Update Colo-Migo source headlines at most every 21 days from a publisher RSS feed."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

FEED = Path(__file__).resolve().parent.parent / "insights" / "feed.json"
SOURCE = "https://www.datacenterknowledge.com/rss.xml"

def category(title):
    lower = title.lower()
    if any(x in lower for x in ("fiber","network","carrier","interconnect","connectivity","latency")):
        return "network"
    if any(x in lower for x in ("power","grid","energy","electric","utility","nuclear")):
        return "power"
    if any(x in lower for x in ("cooling","gpu","rack","liquid","density","artificial intelligence")):
        return "ai"
    return "market"

def main():
    current = json.loads(FEED.read_text(encoding="utf8"))
    now = datetime.now(timezone.utc)
    updated = datetime.fromisoformat(current["updated_at"]).replace(tzinfo=timezone.utc)
    if now - updated < timedelta(days=21):
        print("Not due for refresh")
        return
    req = Request(SOURCE, headers={"User-Agent":"ColoMigoBrief/1.0 (https://colomigo.com/insights/)"})
    with urlopen(req, timeout=25) as result:
        data = result.read(2000001)
    if len(data) > 2000000:
        raise ValueError("RSS feed unexpectedly large")
    root = ET.fromstring(data)
    stories = []
    seen = set()
    for item in root.findall(".//channel/item"):
        title = re.sub(r"\s+", " ", (item.findtext("title") or "").strip())
        link = (item.findtext("link") or "").strip()
        date_string = item.findtext("pubDate") or ""
        parsed = urlparse(link)
        if not title or not date_string or parsed.scheme != "https" or parsed.hostname not in {"datacenterknowledge.com","www.datacenterknowledge.com"} or link in seen:
            continue
        try:
            date = parsedate_to_datetime(date_string).astimezone(timezone.utc)
        except (ValueError, TypeError):
            continue
        if date > now + timedelta(days=1) or date < now - timedelta(days=45):
            continue
        seen.add(link)
        stories.append({"category":category(title),"published":date.date().isoformat(),"title":title[:180],"source":"Data Center Knowledge","url":link})
    stories.sort(key=lambda x:x["published"], reverse=True)
    if len(stories) < 3:
        raise ValueError("Insufficient recent source headlines; preserving current feed")
    current["updated_at"] = now.date().isoformat()
    current["stories"] = stories[:6]
    FEED.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("Published",len(current["stories"]),"attributed headlines")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Update skipped; current feed retained:",error,file=sys.stderr)
        sys.exit(1)
