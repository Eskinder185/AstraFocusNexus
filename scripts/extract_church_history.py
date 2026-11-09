from __future__ import annotations

import argparse
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn


def iter_blocks(document):
    body = document.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield "paragraph", Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield "table", Table(child, document)


def para_record(p: Paragraph, index: int, container: str = "body") -> dict:
    ppr = p._p.pPr
    num_id = None
    ilvl = None
    if ppr is not None and ppr.numPr is not None:
        if ppr.numPr.numId is not None:
            num_id = ppr.numPr.numId.val
        if ppr.numPr.ilvl is not None:
            ilvl = ppr.numPr.ilvl.val
    runs = []
    for r in p.runs:
        if not r.text:
            continue
        size = r.font.size.pt if r.font.size else None
        runs.append({
            "text": r.text,
            "bold": r.bold,
            "italic": r.italic,
            "underline": bool(r.underline) if r.underline is not None else None,
            "size_pt": size,
            "font": r.font.name,
        })
    return {
        "index": index,
        "container": container,
        "text": p.text,
        "style": p.style.name if p.style else None,
        "outline_level": (
            ppr.outlineLvl.val if ppr is not None and ppr.outlineLvl is not None else None
        ),
        "num_id": num_id,
        "list_level": ilvl,
        "alignment": str(p.alignment) if p.alignment is not None else None,
        "runs": runs,
    }


def extract(path: Path) -> dict:
    doc = Document(path)
    records = []
    idx = 0
    table_no = 0
    for kind, obj in iter_blocks(doc):
        if kind == "paragraph":
            records.append(para_record(obj, idx))
            idx += 1
        else:
            table_no += 1
            for row_no, row in enumerate(obj.rows, start=1):
                for col_no, cell in enumerate(row.cells, start=1):
                    for p in cell.paragraphs:
                        records.append(
                            para_record(p, idx, f"table-{table_no}-r{row_no}-c{col_no}")
                        )
                        idx += 1
    nonempty = [r for r in records if r["text"].strip()]
    style_counts = Counter(r["style"] for r in nonempty)
    heading_candidates = []
    for r in nonempty:
        bold_chars = sum(len(x["text"]) for x in r["runs"] if x["bold"])
        total_chars = sum(len(x["text"]) for x in r["runs"])
        max_size = max((x["size_pt"] or 0 for x in r["runs"]), default=0)
        style = (r["style"] or "").lower()
        text = r["text"].strip()
        if (
            "heading" in style
            or r["outline_level"] is not None
            or (total_chars and bold_chars / total_chars >= 0.8 and len(text) <= 180)
            or max_size >= 14
            or re.match(r"^(ምዕራፍ|ክፍል|መግቢያ|መቅድም|መደምደሚያ)", text)
        ):
            heading_candidates.append({
                "index": r["index"],
                "style": r["style"],
                "outline_level": r["outline_level"],
                "max_size_pt": max_size,
                "text": text,
            })
    with zipfile.ZipFile(path) as zf:
        names = set(zf.namelist())
        has_comments = "word/comments.xml" in names
        has_footnotes = "word/footnotes.xml" in names
        has_endnotes = "word/endnotes.xml" in names
    return {
        "source": str(path),
        "paragraph_records": records,
        "statistics": {
            "paragraph_records": len(records),
            "nonempty_paragraphs": len(nonempty),
            "characters": sum(len(r["text"]) for r in nonempty),
            "whitespace_words": sum(len(r["text"].split()) for r in nonempty),
            "tables": table_no,
            "style_counts": dict(style_counts),
            "heading_candidate_count": len(heading_candidates),
            "has_comments": has_comments,
            "has_footnotes": has_footnotes,
            "has_endnotes": has_endnotes,
        },
        "heading_candidates": heading_candidates,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for path in args.inputs:
        payload = extract(path)
        out = args.output_dir / f"{path.stem}.extracted.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        summary = args.output_dir / f"{path.stem}.summary.txt"
        lines = [json.dumps(payload["statistics"], ensure_ascii=False, indent=2), "", "HEADINGS"]
        lines.extend(
            f'{h["index"]}\t{h["style"]}\t{h["outline_level"]}\t{h["max_size_pt"]}\t{h["text"]}'
            for h in payload["heading_candidates"]
        )
        summary.write_text("\n".join(lines), encoding="utf-8")
        print(out)


if __name__ == "__main__":
    main()
