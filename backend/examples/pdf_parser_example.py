"""Example usage for the PDF parser service."""

from __future__ import annotations

import json
from pathlib import Path

from app.services.pdf_parser import PDFParserService


def _ensure_sample_pdf(path: Path) -> None:
    if path.exists():
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    import fitz

    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Sample PDF for parser example.", fontsize=12)
    document.set_metadata({"title": "Sample PDF", "author": "ScholarMind AI"})
    document.save(path)
    document.close()


if __name__ == "__main__":
    parser = PDFParserService()
    sample_pdf = Path("./storage/sample.pdf")
    _ensure_sample_pdf(sample_pdf)
    output = parser.parse(sample_pdf)
    print(json.dumps(output, indent=2, ensure_ascii=False))
