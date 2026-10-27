"""Dependency-free checks for the static Colo-Migo website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.refs = []
        self.errors = []
        self.h1 = 0
        self.dialogs = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                self.errors.append("Duplicate ID: " + a["id"])
            self.ids.add(a["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "dialog":
            self.dialogs += 1
        if tag == "img" and "alt" not in a:
            self.errors.append("Image missing alt attribute")
        for name in ("href", "src"):
            if a.get(name):
                self.refs.append(a[name])

html = (ROOT / "index.html").read_text()
page = Page()
page.feed(html)
errors = page.errors
if page.h1 != 1:
    errors.append("Expected exactly one h1")
if page.dialogs != 2:
    errors.append("Expected project and privacy dialogs")
for ref in page.refs:
    if ref.startswith("#"):
        if ref[1:] not in page.ids:
            errors.append("Missing anchor target: " + ref)
    elif not urlsplit(ref).scheme and not ref.startswith("//"):
        if not (ROOT / urlsplit(ref).path).is_file():
            errors.append("Missing local asset: " + ref)
for phrase in ('name="viewport"', 'id="brief-form"', 'leroy@colomigo.com'):
    if phrase not in html:
        errors.append("Missing required content: " + phrase)
ET.parse(ROOT / "assets/mark.svg")
assert not errors, "\n".join(errors)
print("PASS: page structure, unique IDs, anchors, local assets, image labels, contact and SVG.")
