from __future__ import annotations

import base64
from pathlib import Path

import fitz
import pytest

from app.core.errors import AppError
from app.services.pdf_parser import PDFParserService


PNG_1X1_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z7uEAAAAASUVORK5CYII="
)


def _create_text_pdf(path: Path) -> None:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Hello   PDF\nWorld -\nParser", fontsize=12)
    doc.set_metadata({"title": "Research Paper", "author": "Ada Lovelace"})
    doc.save(path)
    doc.close()


def _create_scanned_pdf(path: Path) -> None:
    image_path = path.with_suffix(".png")
    image_path.write_bytes(base64.b64decode(PNG_1X1_BASE64))

    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(fitz.Rect(72, 72, 200, 200), filename=str(image_path))
    doc.save(path)
    doc.close()
    image_path.unlink()


@pytest.fixture()
def parser_service() -> PDFParserService:
    return PDFParserService()


def test_parse_text_pdf_extracts_metadata_and_text(tmp_path: Path, parser_service: PDFParserService) -> None:
    pdf_path = tmp_path / "text.pdf"
    _create_text_pdf(pdf_path)

    result = parser_service.parse(pdf_path)

    assert result["page_count"] == 1
    assert result["document_metadata"]["title"] == "Research Paper"
    assert result["document_metadata"]["author"] == "Ada Lovelace"
    assert result["document_metadata"]["is_scanned_document"] is False
    assert result["pages"][0]["page_number"] == 1
    assert result["pages"][0]["text"] == "Hello PDF World Parser"
    assert result["pages"][0]["is_scanned"] is False


def test_detect_scanned_pdf(tmp_path: Path, parser_service: PDFParserService) -> None:
    pdf_path = tmp_path / "scanned.pdf"
    _create_scanned_pdf(pdf_path)

    result = parser_service.parse(pdf_path)

    assert result["page_count"] == 1
    assert result["pages"][0]["is_scanned"] is True
    assert result["document_metadata"]["is_scanned_document"] is True
    assert result["document_metadata"]["scanned_pages"] == 1


def test_invalid_pdf_raises_app_error(tmp_path: Path, parser_service: PDFParserService) -> None:
    file_path = tmp_path / "broken.pdf"
    file_path.write_text("not a pdf", encoding="utf-8")

    with pytest.raises(AppError) as exc_info:
        parser_service.parse(file_path)

    assert exc_info.value.code == "invalid_pdf"
