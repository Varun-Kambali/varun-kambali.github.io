"""Checks the site's HTML before it ships. Standard library only.

Evidence map integrity:
  - every skill tag on a card names a skill in the skills panel
  - a skill that no resume line uses says which resume skills row lists it
    (data-listed="K2"), unless it is only shown by projects ("building now");
    a skill that a resume line uses must not carry data-listed
  - every card has an id and at least one skill
  - every hiring lens names known skills, and every career step points at a role
Page hygiene:
  - ids are unique and every in-page link (#id) has a target
  - external links use https; images have alt text
Public safety (the repo and the site are public):
  - no phone numbers and no mention of retired projects

Usage: python3 scripts/check_site.py [file.html ...]   (default: every *.html in the repo root)
"""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Ten or more digits, optionally split by spaces, dots or dashes, with an optional +country code.
PHONE = re.compile(r"(?<![\w/.-])\+?\d(?:[\s.-]?\d){9,}(?![\w/-])")
BANNED_WORDS = re.compile(r"\bforge\b", re.IGNORECASE)


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.hrefs: list[str] = []
        self.images_without_alt = 0
        self.skills: dict[str, str | None] = {}  # skill id -> data-listed (or None)
        self.cards: dict[str, list[str]] = {}  # card id -> skill ids
        self.kinds: dict[str, str] = {}  # card id -> "line" (resume) or "project"
        self._card: str | None = None  # the evidence card (an <article>) being read
        self.lenses: dict[str, list[str]] = {}  # lens id -> skill ids
        self.role_filters: list[str] = []  # career steps -> role heading ids
        self.text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"] or "")
        if tag == "a" and a.get("href"):
            self.hrefs.append(a["href"] or "")
        if tag == "img" and not a.get("alt"):
            self.images_without_alt += 1
        if "data-skill" in a and tag == "li":
            self.skills[a["data-skill"] or ""] = a.get("data-listed")
        if "data-evidence" in a:
            if tag != "article":
                raise ValueError(f"data-evidence belongs on <article>, found <{tag}>")
            self._card = a.get("id") or f"<card without id #{len(self.cards) + 1}>"
            self.cards[self._card] = []
            self.kinds[self._card] = a.get("data-kind") or ""
        if "data-tag" in a and self._card:
            self.cards[self._card].append(a["data-tag"] or "")
        if "data-lens" in a:
            self.lenses[a["data-lens"] or ""] = (a.get("data-skills") or "").split()
        if "data-role-filter" in a:
            self.role_filters.append(a["data-role-filter"] or "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "article":
            self._card = None

    def handle_data(self, data: str) -> None:
        self.text.append(data)


def check(path: Path) -> list[str]:
    html = path.read_text(encoding="utf-8")
    parser = SiteParser()
    parser.feed(html)
    errors: list[str] = []
    name = path.name

    seen: set[str] = set()
    for i in parser.ids:
        if i in seen:
            errors.append(f"{name}: duplicate id '{i}'")
        seen.add(i)
    for href in parser.hrefs:
        if href.startswith("#") and len(href) > 1 and href[1:] not in seen:
            errors.append(f"{name}: link {href} has no target")
        if href.startswith("http://"):
            errors.append(f"{name}: link {href} should use https")
    if parser.images_without_alt:
        errors.append(f"{name}: {parser.images_without_alt} image(s) without alt text")

    used: set[str] = set()
    used_by_lines: set[str] = set()
    for card, tags in parser.cards.items():
        if card.startswith("<"):
            errors.append(f"{name}: {card}")
        if parser.kinds[card] not in {"line", "project"}:
            errors.append(f"{name}: card {card} needs data-kind=\"line\" or \"project\"")
        if parser.kinds[card] == "line":
            used_by_lines.update(tags)
        if not tags:
            errors.append(f"{name}: card {card} lists no skills")
        for tag in tags:
            if tag not in parser.skills:
                errors.append(f"{name}: card {card} uses unknown skill '{tag}'")
            used.add(tag)
    for skill, listed in parser.skills.items():
        if skill not in used and not listed:
            errors.append(f"{name}: skill '{skill}' has no evidence and no data-listed row")
        if skill in used_by_lines and listed:
            errors.append(f"{name}: a resume line uses skill '{skill}', so drop its data-listed attribute")

    for lens, skills in parser.lenses.items():
        if not skills:
            errors.append(f"{name}: lens '{lens}' names no skills")
        for skill in skills:
            if skill not in parser.skills:
                errors.append(f"{name}: lens '{lens}' uses unknown skill '{skill}'")
    for role in parser.role_filters:
        if role not in seen:
            errors.append(f"{name}: career step points at missing role '{role}'")

    text = " ".join(parser.text)
    for match in PHONE.finditer(text):
        errors.append(f"{name}: looks like a phone number: '{match.group(0)}'")
    if BANNED_WORDS.search(html):
        errors.append(f"{name}: mentions a retired project (FORGE stays off public pages)")
    return errors


def main(argv: list[str]) -> int:
    files = [Path(p) for p in argv] or sorted(ROOT.glob("*.html"))
    errors = [e for f in files for e in check(f)]
    for e in errors:
        print(f"error: {e}")
    print(f"checked {len(files)} file(s): {'FAILED' if errors else 'ok'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
