"""STAGE 3가 산출하는 스토리라인 사양(STORYLINE SPEC)의 구조화 스키마.

pipeline/stage3_storyline.md 의 '▶ STORYLINE SPEC' 블록을 그대로 타입화한 것.
STAGE 4(assemble.py)는 이 객체만으로 제안서 HTML을 결정론적으로 조립한다.
"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class Card(BaseModel):
    tag: str = Field(description="카드 상단 태그(예: 고객 구조 / 핵심 과제 / 제안 방향)")
    title: str = Field(description="카드 제목 한 줄")
    bullets: List[str] = Field(description="불릿 3개", min_length=3, max_length=3)
    pill: str = Field(description="하단 강조 pill 문구")


class KpiRow(BaseModel):
    dept: str = Field(description="부서")
    kpi: str = Field(description="그 부서의 관심 KPI")
    message: str = Field(description="리터니즈 제안 메시지. <b>·<b class='g'>·<b class='o'> 강조 HTML 허용")


class Phase(BaseModel):
    title: str = Field(description="단계명+기간(예: '기준 정렬 (1~2주)')")
    desc: str = Field(description="그 단계에서 하는 일 한 줄")


class ChecklistItem(BaseModel):
    label: str = Field(description="확인 항목 제목(짧게)")
    desc: str = Field(description="요청 데이터/기준 설명")


class StorylineSpec(BaseModel):
    proposal_title: str = Field(description="표지 제목(예: '안다르 B2C 반품 운영 모델 제안')")
    company: str = Field(description="회사명")
    company_en: str = Field(description="로고용 영문명. 없으면 회사명 그대로")
    platform: str = Field(description="커머스 플랫폼(예: CAFE24 / 자체몰 / 스마트스토어)")
    hero_headline: str = Field(description="'왜 지금 X인가' 한 줄. <br> 허용")
    hero_lead: str = Field(description="표지 다음 핵심 메시지 2~3문장")
    cards: List[Card] = Field(description="3카드: 고객 구조 / 핵심 과제 / 제안 방향", min_length=3, max_length=3)
    style_sku_lead: str = Field(description="Style vs SKU 슬라이드 리드 문장")
    style_sku_note: str = Field(description="SKU 단위 우려 반영 권장안 한 줄")
    kpi_rows: List[KpiRow] = Field(description="부서별 KPI 정렬 5~7행", min_length=5, max_length=7)
    pilot_phases: List[Phase] = Field(description="단계형 파일럿 3단계", min_length=3, max_length=3)
    roadmap_note: str = Field(description="로드맵 하단 노트: 확인 필요 데이터 + 후속 확장")
    checklist: List[ChecklistItem] = Field(description="실행 확인 요청 6항목", min_length=6, max_length=6)
    src_foot: str = Field(description="슬라이드3 하단 근거 출처 한 줄")
