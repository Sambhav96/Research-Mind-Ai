"""PDF parsing service built on PyMuPDF."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz

from app.core.errors import AppError


class PDFParserService:
    """Parse PDFs and extract metadata, page content, and clean text."""

    def __init__(self) -> None:
        self._logger = logging.getLogger("scholarmind.pdf_parser")

    def parse(self, file_path: str | Path) -> dict[str, Any]:
        """Parse a PDF file into structured output."""
        path = Path(file_path)
        try:
            with fitz.open(path) as document:
                page_count = document.page_count
                document_metadata = self.extract_metadata(document)
                pages = self.extract_pages(document)
                document_metadata["page_count"] = page_count
                
                # Document Intelligence metrics
                total_pages = len(pages)
                scanned_pages = sum(1 for p in pages if p.get("is_scanned"))
                ocr_pages = sum(1 for p in pages if p.get("ocr_used"))
                text_pages = total_pages - ocr_pages
                
                document_metadata["scanned_pages"] = scanned_pages
                document_metadata["is_scanned_document"] = total_pages > 0 and scanned_pages == total_pages
                document_metadata["text_coverage_pct"] = (text_pages / total_pages * 100) if total_pages > 0 else 0.0
                document_metadata["ocr_coverage_pct"] = (ocr_pages / total_pages * 100) if total_pages > 0 else 0.0

                return {
                    "document_metadata": document_metadata,
                    "pages": pages,
                    "page_count": page_count,
                    "text_coverage_pct": document_metadata["text_coverage_pct"],
                    "ocr_coverage_pct": document_metadata["ocr_coverage_pct"],
                }
        except FileNotFoundError as exc:
            self._logger.warning("PDF file not found", extra={"file_path": str(path)})
            raise AppError(code="pdf_not_found", message="PDF file not found", status_code=404) from exc
        except fitz.FileDataError as exc:
            self._logger.warning("Invalid PDF file", extra={"file_path": str(path)})
            raise AppError(code="invalid_pdf", message="Invalid or corrupted PDF file", status_code=400) from exc
        except Exception as exc:
            self._logger.exception("Failed to parse PDF", extra={"file_path": str(path)})
            raise AppError(code="pdf_processing_failed", message="Failed to process PDF", status_code=500) from exc

    def extract_metadata(self, document: fitz.Document) -> dict[str, Any]:
        """Extract and normalize PDF metadata."""
        metadata = document.metadata or {}
        return {
            "title": self._clean_metadata_value(metadata.get("title")),
            "author": self._clean_metadata_value(metadata.get("author")),
            "subject": self._clean_metadata_value(metadata.get("subject")),
            "keywords": self._clean_metadata_value(metadata.get("keywords")),
            "creator": self._clean_metadata_value(metadata.get("creator")),
            "producer": self._clean_metadata_value(metadata.get("producer")),
            "creation_date": self._parse_pdf_date(metadata.get("creationDate")),
            "modification_date": self._parse_pdf_date(metadata.get("modDate")),
            "format": metadata.get("format"),
            "encryption": metadata.get("encryption"),
        }

    def _get_ocr(self):
        if not hasattr(self, "_ocr_instance"):
            try:
                import pytesseract
                # Configure tesseract executable path if installed via winget
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                self._logger.info("Initializing PyTesseract...")
                self._ocr_instance = pytesseract
            except ImportError:
                self._logger.warning("PyTesseract not installed, OCR fallback disabled.")
                self._ocr_instance = None
        return self._ocr_instance

    def extract_pages(self, document: fitz.Document) -> list[dict[str, Any]]:
        """Extract page text and use OCR fallback for scanned page indicators."""
        import numpy as np
        
        pages: list[dict[str, Any]] = []
        for index in range(document.page_count):
            page = document.load_page(index)
            raw_text = self.extract_text(page)
            cleaned_text = self.clean_text(raw_text)
            is_scanned = self.detect_scanned_pdf(page, raw_text)
            
            ocr_used = False
            # Fallback to OCR if there's very little text but we detect it's scanned
            if len(cleaned_text) < 50 and is_scanned:
                ocr = self._get_ocr()
                if ocr:
                    self._logger.info("Running OCR on page", extra={"page_number": index + 1})
                    try:
                        # Render page to image
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                        # Convert pixmap to numpy array (RGB)
                        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                        if pix.n == 4:
                            # Drop alpha channel
                            img_array = img_array[:, :, :3]
                        
                        # Convert numpy array back to PIL Image for pytesseract
                        from PIL import Image
                        pil_img = Image.fromarray(img_array)
                        
                        # Run OCR
                        text = ocr.image_to_string(pil_img)
                        if text and text.strip():
                            cleaned_text = self.clean_text(text)
                            ocr_used = True
                    except Exception as e:
                        self._logger.warning(f"OCR failed on page {index + 1}: {e}")
            
            pages.append(
                {
                    "page_number": index + 1,
                    "text": cleaned_text,
                    "is_scanned": is_scanned,
                    "ocr_used": ocr_used,
                }
            )
        return pages

    def extract_text(self, page: fitz.Page) -> str:
        """Extract raw text from a single PDF page."""
        return page.get_text("text") or ""

    def detect_scanned_pdf(self, page: fitz.Page, raw_text: str | None = None) -> bool:
        """Detect whether a page looks like a scanned image page."""
        text = raw_text if raw_text is not None else self.extract_text(page)
        normalized = self.clean_text(text)
        image_count = len(page.get_images(full=True))
        return len(normalized) < 8 and image_count > 0

    def clean_text(self, text: str) -> str:
        """Normalize whitespace and remove common PDF extraction artifacts."""
        if not text:
            return ""

        cleaned = text.replace("\u00ad", "")
        cleaned = re.sub(r"-\s*\n\s*", "", cleaned)
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = re.sub(r"\n(?!\n)", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()

    def _parse_pdf_date(self, value: str | None) -> str | None:
        if not value:
            return None
        if value.startswith("D:"):
            value = value[2:]
        digits = re.sub(r"[^0-9]", "", value)
        if len(digits) < 4:
            return value
        try:
            year = int(digits[0:4])
            month = int(digits[4:6]) if len(digits) >= 6 else 1
            day = int(digits[6:8]) if len(digits) >= 8 else 1
            hour = int(digits[8:10]) if len(digits) >= 10 else 0
            minute = int(digits[10:12]) if len(digits) >= 12 else 0
            second = int(digits[12:14]) if len(digits) >= 14 else 0
            parsed = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
            return parsed.isoformat()
        except ValueError:
            return value

    def _clean_metadata_value(self, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value
