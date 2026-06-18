"""STAGE 4 — 스토리라인 사양으로 검증된 템플릿에 토큰을 채워 제안서 HTML을 조립한다.

content-library/proposal-template.html 의 {{TOKEN}} 을 결정론적으로 치환한다.
LIB(검증 자산) 슬라이드는 회사명/플랫폼 토큰 외에는 손대지 않는다.
"""
from __future__ import annotations

import html
import re

from .config import load_template
from .schema import StorylineSpec


def _esc(s: str) -> str:
    """텍스트 토큰 이스케이프. 메시지 필드의 <b> 강조는 허용하므로 별도 처리."""
    return html.escape(s, quote=False)


def _kpi_rows(spec: StorylineSpec) -> str:
    rows = []
    for r in spec.kpi_rows:
        # message 는 <b> 강조 HTML을 의도적으로 허용한다(LLM 산출).
        rows.append(
            f'<tr><td class="lab">{_esc(r.dept)}</td><td>{_esc(r.kpi)}</td>'
            f'<td class="msg">{r.message}</td></tr>'
        )
    return "\n          ".join(rows)


def _roadmap_top(spec: StorylineSpec) -> str:
    items = []
    for p in spec.pilot_phases:
        items.append(
            f'<div class="rt"><b class="g">{_esc(p.title)}</b><span>{_esc(p.desc)}</span></div>'
        )
    return "\n          ".join(items)


def _checklist(spec: StorylineSpec) -> str:
    items = []
    for c in spec.checklist:
        items.append(
            f'<div class="chk"><div class="ic">✓</div><b>{_esc(c.label)}</b>'
            f'<span>{_esc(c.desc)}</span></div>'
        )
    return "\n        ".join(items)


def assemble(spec: StorylineSpec) -> str:
    html_out = load_template()
    c = spec.cards
    tokens = {
        "PROPOSAL_TITLE": _esc(spec.proposal_title),
        "COMPANY": _esc(spec.company),
        "COMPANY_EN": _esc(spec.company_en),
        "PLATFORM": _esc(spec.platform),
        "SRC_FOOT": _esc(spec.src_foot),
        "HERO_HEADLINE": spec.hero_headline,  # <br> 허용
        "HERO_LEAD": _esc(spec.hero_lead),
        "CARD1_TAG": _esc(c[0].tag), "CARD1_TITLE": _esc(c[0].title),
        "CARD1_B1": _esc(c[0].bullets[0]), "CARD1_B2": _esc(c[0].bullets[1]),
        "CARD1_B3": _esc(c[0].bullets[2]), "CARD1_PILL": _esc(c[0].pill),
        "CARD2_TAG": _esc(c[1].tag), "CARD2_TITLE": _esc(c[1].title),
        "CARD2_B1": _esc(c[1].bullets[0]), "CARD2_B2": _esc(c[1].bullets[1]),
        "CARD2_B3": _esc(c[1].bullets[2]), "CARD2_PILL": _esc(c[1].pill),
        "CARD3_TAG": _esc(c[2].tag), "CARD3_TITLE": _esc(c[2].title),
        "CARD3_B1": _esc(c[2].bullets[0]), "CARD3_B2": _esc(c[2].bullets[1]),
        "CARD3_B3": _esc(c[2].bullets[2]), "CARD3_PILL": _esc(c[2].pill),
        "STYLE_SKU_LEAD": _esc(spec.style_sku_lead),
        "STYLE_SKU_NOTE": _esc(spec.style_sku_note),
        "ROADMAP_NOTE": _esc(spec.roadmap_note),
        "KPI_ROWS": _kpi_rows(spec),
        "ROADMAP_TOP": _roadmap_top(spec),
        "CHECKLIST_ITEMS": _checklist(spec),
    }
    for key, val in tokens.items():
        html_out = html_out.replace("{{%s}}" % key, val)

    leftover = re.findall(r"\{\{[A-Z0-9_]+\}\}", html_out)
    if leftover:
        raise RuntimeError("미치환 토큰 잔존: %s" % ", ".join(sorted(set(leftover))))
    return html_out
