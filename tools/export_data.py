#!/usr/bin/env python3
"""Convert ordbok.json into forum-ready posts and a single JSON file.

The theme component does not bundle the word list. It loads the data at
runtime from a Discourse topic (same-origin /raw/<topic>/<post>) or from
a URL. This tool writes the exact text to paste into those posts.

Usage:
  python3 tools/export_data.py
  python3 tools/export_data.py /path/to/ordbok.json --outdir /path/to/dir
  python3 tools/export_data.py ordbok.json --outdir ./out --max-chars 30000

The source file is read only. Do not run enrich.py or build.py in the
ordbok-igkt / igkt-ordbok trees; those overwrite ordbok.json.

Output:
  post-1.md, post-2.md, ...   markdown to paste into successive posts
  dictionary.json             full list, for the optional data_url setting
  manifest.json               sizes, part counts, source md5

Format of each data fence (JSONL inside an igkt-dictionary code block):

  {"v":1,"part":1,"parts":2}
  {"id":"example-0001","category":"term","terms":{...}}
  ...

Live terms come from sources[lang][term]. Notes that record a removed
term (borttaget / borttagna / removed) are dropped so they are not shown
as if they were current terms.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

DEFAULT_SRC = Path("/workspace/ordbok-igkt/files/ordbok.json")
# Headroom under Discourse's default max_post_length (32_000).
DEFAULT_MAX_CHARS = 30_000
LANGS = ("en", "sv", "de", "fi", "fr", "es")
REMOVED_NOTE_RE = re.compile(r"\b(borttaget|borttagna|removed)\b", re.IGNORECASE)
FORMAT_VERSION = 1
FENCE = "igkt-dictionary"

POST1_INTRO = """# IGKT Knot Dictionary data (part {part} of {parts})

This topic holds the word list for the Knot Dictionary at `/dictionary`.
The word list is **not** covered by the theme component's MIT licence; it stays on the IGKT forum.

Sources: Wikidata (CC0); Wiktionary and Finnish Wikipedia (CC BY-SA, with attribution); J. Ezelius and Virittäjä (used with permission for the IGKT forum); Hjalmar Öhrvall, *Om knutar* (1916); Witcomb (1883); French review by Jean Bernard de Runz (JeanB). No machine translation is used.

Please do not add ordinary replies here. To update the list, edit the fenced `{fence}` blocks below. Moderators can edit this topic when it is a wiki.

"""

LATER_INTRO = """# IGKT Knot Dictionary data (part {part} of {parts})

Continuation of the word list. Edit the fenced `{fence}` block only; do not add ordinary replies.

"""


def public_notes(notes) -> list[str]:
    if not notes:
        return []
    return [n for n in notes if isinstance(n, str) and not REMOVED_NOTE_RE.search(n)]


def normalize_entry(raw: dict) -> dict:
    sources = raw.get("sources") or {}
    terms = raw.get("terms")
    if not isinstance(terms, dict):
        terms = {}
        for lang in LANGS:
            lang_map = sources.get(lang) or {}
            if isinstance(lang_map, dict) and lang_map:
                terms[lang] = [t for t in lang_map.keys() if t]
            elif raw.get(lang):
                # Fallback: comma-separated language field (legacy).
                terms[lang] = [t.strip() for t in str(raw[lang]).split(",") if t.strip()]
    terms = {lang: list(val) for lang, val in terms.items() if val}
    entry = {
        "id": raw.get("id"),
        "category": raw.get("category") or "term",
        "terms": terms,
    }
    wd = raw.get("wikidata") or ""
    if wd:
        entry["wikidata"] = wd
    notes = public_notes(raw.get("notes"))
    if notes:
        entry["notes"] = notes
    cleaned = clean_sources(sources)
    if cleaned:
        entry["sources"] = cleaned
    return entry


def clean_sources(sources) -> dict | None:
    if not isinstance(sources, dict):
        return None
    out = {}
    for lang, lang_map in sources.items():
        if not isinstance(lang_map, dict):
            continue
        terms = {}
        for term, ids in lang_map.items():
            if not term or not isinstance(ids, list):
                continue
            clean = [item for item in ids if isinstance(item, str) and item]
            if clean:
                terms[term] = clean
        if terms:
            out[lang] = terms
    return out or None


def entry_line(entry: dict) -> str:
    return json.dumps(entry, ensure_ascii=False, separators=(",", ":"))


def build_post(part: int, parts: int, lines: list[str], intro: str) -> str:
    header = json.dumps(
        {"v": FORMAT_VERSION, "part": part, "parts": parts},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    body = intro.format(part=part, parts=parts, fence=FENCE)
    fence = f"```{FENCE}\n{header}\n" + "\n".join(lines) + "\n```\n"
    return body + fence


def pack(lines: list[str], max_chars: int) -> list[list[str]]:
    """Greedy pack of JSONL entry lines into posts under max_chars."""
    if not lines:
        return [[]]

    def overhead(part_guess: int, parts_guess: int, is_first: bool) -> int:
        intro = POST1_INTRO if is_first else LATER_INTRO
        # Header line length is stable enough at two-digit part counts.
        dummy = build_post(part_guess, parts_guess, [], intro)
        return len(dummy)

    # First pass with a parts guess of 1, then grow if needed.
    parts_guess = 1
    for _ in range(20):
        buckets: list[list[str]] = []
        current: list[str] = []
        first = True
        budget = max_chars - overhead(1, parts_guess, True)
        if budget < 8:
            raise SystemExit(f"--max-chars {max_chars} is too small for the post wrapper")
        for line in lines:
            need = len(line) + 1
            if need > budget and not current:
                raise SystemExit(
                    f"A single entry is {need} characters, larger than the "
                    f"available {budget} in a post (max-chars {max_chars})."
                )
            if current and len("\n".join(current)) + 1 + need > budget:
                buckets.append(current)
                current = []
                first = False
                budget = max_chars - overhead(len(buckets) + 1, parts_guess, False)
            current.append(line)
        if current:
            buckets.append(current)
        if len(buckets) == parts_guess:
            return buckets
        parts_guess = len(buckets)
    raise SystemExit("Could not pack entries into posts")


def export(src: Path, outdir: Path, max_chars: int) -> dict:
    raw_bytes = src.read_bytes()
    md5 = hashlib.md5(raw_bytes).hexdigest()
    data = json.loads(raw_bytes.decode("utf-8"))
    if not isinstance(data, list):
        raise SystemExit(f"{src} is not a JSON list of entries")
    entries = [normalize_entry(e) for e in data]
    lines = [entry_line(e) for e in entries]
    buckets = pack(lines, max_chars)
    parts = len(buckets) or 1
    outdir.mkdir(parents=True, exist_ok=True)

    posts = []
    for i, bucket in enumerate(buckets, start=1):
        intro = POST1_INTRO if i == 1 else LATER_INTRO
        text = build_post(i, parts, bucket, intro)
        if len(text) > max_chars:
            raise SystemExit(
                f"post-{i}.md is {len(text)} characters, over the {max_chars} budget"
            )
        path = outdir / f"post-{i}.md"
        path.write_text(text, encoding="utf-8")
        posts.append(
            {
                "file": path.name,
                "part": i,
                "entries": len(bucket),
                "chars": len(text),
                "bytes": len(text.encode("utf-8")),
                "under_30000": len(text) <= 30_000,
                "under_32000": len(text) <= 32_000,
            }
        )

    full = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    json_path = outdir / "dictionary.json"
    json_path.write_text(full + "\n", encoding="utf-8")

    manifest = {
        "source": str(src),
        "source_md5": md5,
        "entries": len(entries),
        "format": "igkt-dictionary-jsonl",
        "format_version": FORMAT_VERSION,
        "max_chars": max_chars,
        "posts": posts,
        "dictionary_json": {
            "file": "dictionary.json",
            "chars": len(full),
            "bytes": len(full.encode("utf-8")),
            "under_32000": len(full) <= 32_000,
        },
    }
    (outdir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main(argv: list[str]) -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "source",
        nargs="?",
        default=str(DEFAULT_SRC),
        help=f"ordbok.json (default: {DEFAULT_SRC})",
    )
    p.add_argument("--outdir", required=True, help="Directory to write post-N.md and dictionary.json")
    p.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help=f"Max characters per post (default {DEFAULT_MAX_CHARS}, under Discourse's 32 000 default)",
    )
    args = p.parse_args(argv[1:])
    src = Path(args.source).resolve()
    if not src.is_file():
        raise SystemExit(f"Source not found (read-only expected): {src}")
    manifest = export(src, Path(args.outdir).resolve(), args.max_chars)
    print(f"source  {manifest['source']}")
    print(f"md5     {manifest['source_md5']}")
    print(f"entries {manifest['entries']}")
    print(f"posts   {len(manifest['posts'])}  (max-chars {args.max_chars})")
    for post in manifest["posts"]:
        flag = "OK" if post["under_32000"] else "TOO LONG for default 32000"
        print(
            f"  {post['file']}: {post['entries']} entries, "
            f"{post['chars']} chars, {post['bytes']} bytes ({flag})"
        )
    dj = manifest["dictionary_json"]
    print(
        f"  {dj['file']}: {dj['chars']} chars, {dj['bytes']} bytes "
        f"(full list, for data_url; not a single post)"
    )


if __name__ == "__main__":
    main(sys.argv)
