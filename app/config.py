"""경로·환경설정. 프로젝트 루트의 기존 자산(pipeline/, content-library/, rawdata/)을 그대로 읽는다."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PIPELINE_DIR = ROOT / "pipeline"
CONTENT_DIR = ROOT / "content-library"
TEMPLATE_PATH = CONTENT_DIR / "proposal-template.html"
RAWDATA_DIR = ROOT / "rawdata"
OUTPUT_DIR = ROOT / "output"

MODEL = os.environ.get("PROPOSAL_MODEL", "claude-opus-4-8")
HAS_API_KEY = bool(os.environ.get("ANTHROPIC_API_KEY"))


def load_stage_prompt(name: str) -> str:
    """pipeline/<name>.md 지침 본문을 읽어 시스템 프롬프트로 쓴다."""
    return (PIPELINE_DIR / name).read_text(encoding="utf-8")


def load_template() -> str:
    return TEMPLATE_PATH.read_text(encoding="utf-8")
