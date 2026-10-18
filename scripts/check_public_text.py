"""Fails when public text carries emoji or tool-attribution lines.

Checks the files given on the command line, plus (in CI) the pull request title,
body and commit messages passed in the PR_TITLE, PR_BODY and COMMITS environment
variables. Standard library only.

Usage: python3 scripts/check_public_text.py README.md index.html ...
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

EMOJI = re.compile(
    "["
    "\U0001F300-\U0001FAFF"  # pictographs, emoticons, transport, symbols and supplemental
    "\U0001F000-\U0001F2FF"  # mahjong, cards, enclosed alphanumerics and ideographs
    "\U00002600-\U000027BF"  # miscellaneous symbols and dingbats
    "\U00002B00-\U00002BFF"  # arrows and stars used as emoji (e.g. U+2B50)
    "️"  # emoji presentation selector
    "]"
)
ATTRIBUTION = re.compile(r"co-authored-by|generated with|claude code|crafted with", re.IGNORECASE)


def problems(label: str, text: str) -> list[str]:
    found = []
    for n, line in enumerate(text.splitlines(), 1):
        if EMOJI.search(line):
            found.append(f"{label}:{n}: emoji: {line.strip()[:80]}")
        if ATTRIBUTION.search(line):
            found.append(f"{label}:{n}: attribution line: {line.strip()[:80]}")
    return found


def main(argv: list[str]) -> int:
    issues: list[str] = []
    for name in argv:
        issues += problems(name, Path(name).read_text(encoding="utf-8"))
    for var in ("PR_TITLE", "PR_BODY", "COMMITS"):
        issues += problems(var.lower(), os.environ.get(var, ""))
    for issue in issues:
        print(f"error: {issue}")
    print(f"public text: {'FAILED' if issues else 'ok'}")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
