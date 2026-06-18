"""회의록 등 첨부 파일에서 텍스트를 추출한다(web/lib/attachments.ts 의 Python 판).

지원: txt/md/csv/tsv/json/log/text(평문) · html/htm(태그 제거) · docx(표준 zipfile 파싱).
pdf 등 미지원 포맷은 skipped 로 분류 — 텍스트로 변환해 첨부하도록 안내한다.
의존성 추가 없이 stdlib 만 사용한다.
"""
from __future__ import annotations

import html as _html
import io
import re
import zipfile

TEXT_EXT = {"txt", "md", "markdown", "csv", "tsv", "json", "log", "text"}
HTML_EXT = {"html", "htm"}
PER_FILE_CHARS = 60000

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _strip_html(s: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = _TAG_RE.sub(" ", s)
    s = _html.unescape(s)
    return _WS_RE.sub(" ", s).strip()


def _extract_docx(data: bytes) -> str:
    """docx(=zip) 의 word/document.xml 에서 본문 텍스트를 추출한다(python-docx 불필요)."""
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", "ignore")
    # 문단/줄바꿈/탭을 보존한 뒤 태그 제거.
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab\b[^>]*/?>", "\t", xml)
    xml = re.sub(r"<w:br\b[^>]*/?>", "\n", xml)
    text = _TAG_RE.sub("", xml)
    text = _html.unescape(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_files(files: list[tuple[str, bytes]]) -> tuple[list[str], list[str], list[str]]:
    """(filename, raw_bytes) 목록 → (parts, attached, skipped).

    parts: '## 첨부 회의록: <name>\n<text>' 형식의 추출 블록들.
    """
    parts: list[str] = []
    attached: list[str] = []
    skipped: list[str] = []

    for name, data in files:
        name = name or "file"
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        try:
            if ext in TEXT_EXT:
                text = data.decode("utf-8", "ignore")
            elif ext in HTML_EXT:
                text = _strip_html(data.decode("utf-8", "ignore"))
            elif ext == "docx":
                text = _extract_docx(data)
            else:
                skipped.append(name)  # pdf 등 미지원 — 텍스트로 변환해 첨부 권장
                continue
            text = text.strip()
            if not text:
                skipped.append(name)
                continue
            if len(text) > PER_FILE_CHARS:
                text = text[:PER_FILE_CHARS] + "\n…(이하 생략)"
            parts.append(f"## 첨부 회의록: {name}\n{text}")
            attached.append(name)
        except Exception:
            skipped.append(name)

    return parts, attached, skipped
