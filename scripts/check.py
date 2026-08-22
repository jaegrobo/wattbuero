#!/usr/bin/env python3
"""
Prüft alle .html-Dateien im Projekt:
  1. Korrekte HTML-Tag-Struktur (keine offenen/falsch verschachtelten Tags)
  2. Alle internen Links (href="...") zeigen auf tatsächlich vorhandene Dateien

Aufruf:  python3 scripts/check.py
Exit-Code 0 = alles ok, 1 = Probleme gefunden. Kein Internet, keine
externen Abhängigkeiten nötig - läuft identisch in Cowork und lokal.
"""
import glob
import html.parser
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
VOID_TAGS = {"meta", "link", "br", "img", "input", "hr"}


class TagChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID_TAGS:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f"unerwartetes </{tag}>")
            return
        if self.stack[-1] != tag:
            self.errors.append(f"erwartet </{self.stack[-1]}>, bekommen </{tag}>")
        else:
            self.stack.pop()


def check_tags(path, text):
    c = TagChecker()
    c.feed(text)
    issues = list(c.errors)
    if c.stack:
        issues.append(f"nicht geschlossene Tags: {c.stack}")
    return issues


def check_links(path, text):
    issues = []
    base_dir = os.path.dirname(path)
    for href in re.findall(r'href="([^"]+)"', text):
        if href.startswith(("http://", "https://", "mailto:", "#")):
            continue
        target = os.path.normpath(os.path.join(base_dir, href))
        if not os.path.isfile(target):
            issues.append(f"toter Link: {href} -> {target} existiert nicht")
    return issues


def main():
    ok = True
    files = sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))
    for f in files:
        with open(f, encoding="utf-8") as fh:
            text = fh.read()
        issues = check_tags(f, text) + check_links(f, text)
        rel = os.path.relpath(f, ROOT)
        if issues:
            ok = False
            print(f"[FEHLER] {rel}")
            for i in issues:
                print(f"   - {i}")
        else:
            print(f"[ok]     {rel}")
    print()
    print("Alles sauber." if ok else "Es gibt Probleme, siehe oben.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
