"""4단계 오케스트레이터: 회사명+URL → 리서치 → 페인포인트 → 스토리라인 → 제안서 조립.

README/pipeline 의 지침(stage1~4)을 시스템 프롬프트로 그대로 사용한다.
API 키가 없으면 rawdata/안다르 의 워크드 산출물로 DEMO 진행한다(조립 경로까지 실제 동작).
"""
from __future__ import annotations

from . import config, llm
from .assemble import assemble
from .jobs import Job
from .schema import Card, ChecklistItem, KpiRow, Phase, StorylineSpec


def _write_proposal(job: Job, company: str, html: str) -> str:
    out_dir = config.OUTPUT_DIR / company
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{company}_제안서.html"
    path.write_text(html, encoding="utf-8")
    return str(path)


# ---------------------------------------------------------------- 실제 파이프라인
def _run_live(job: Job, company: str, url: str, notes: str) -> None:
    # STAGE 1 — 공개정보 리서치 (web_search)
    job.emit("stage_start", stage=1, title="공개정보 리서치")

    def _p1(searches: int, query: str = "") -> None:
        msg = f"공개정보 검색 {searches}건째 진행 중"
        if query:
            msg += f" — “{query}”"
        job.emit("stage_progress", stage=1, message=msg)

    research = llm.run_with_websearch(
        config.load_stage_prompt("stage1_research.md"),
        f"회사명: {company}\n홈페이지 URL: {url}\n\n"
        "위 지침에 따라 공개정보를 실제로 검색·수집하고 STAGE 1 산출 문서를 마크다운으로 작성하라.",
        on_progress=_p1,
    )
    job.artifacts["01_공개자료_리서치.md"] = research
    job.emit("stage_done", stage=1, title="공개정보 리서치", artifact="01_공개자료_리서치.md")

    # STAGE 2 — 페인포인트 추론 (회의록/메모가 있을 때만)
    painpoints = ""
    if notes.strip():
        job.emit("stage_start", stage=2, title="페인포인트 추론")
        painpoints = llm.run_text(
            config.load_stage_prompt("stage2_painpoints.md"),
            f"# STAGE 1 리서치\n{research}\n\n# 회의록/메모 원본\n{notes}\n\n"
            "위 자료로 STAGE 2 회의록 분석 문서를 마크다운으로 작성하라.",
        )
        job.artifacts["02_회의록_분석.md"] = painpoints
        job.emit("stage_done", stage=2, title="페인포인트 추론", artifact="02_회의록_분석.md")
    else:
        job.emit("stage_skip", stage=2, title="페인포인트 추론", reason="회의록 미입력 — 공개정보 추론만 사용")

    # STAGE 3 — 종합 분석 + 스토리라인
    job.emit("stage_start", stage=3, title="스토리라인 설계")
    analysis = llm.run_text(
        config.load_stage_prompt("stage3_storyline.md"),
        f"# STAGE 1 리서치\n{research}\n\n"
        + (f"# STAGE 2 회의록 분석\n{painpoints}\n\n" if painpoints else "")
        + "위 자료를 통합해 STAGE 3 종합 분석 문서를 마크다운으로 작성하라. "
        "문서 끝에 반드시 '▶ STORYLINE SPEC' 블록을 포함하라.",
    )
    job.artifacts["03_종합_분석.md"] = analysis

    spec = llm.parse_storyline(
        "너는 리터니즈 제안서 조립기다. 아래 종합 분석 문서에서 STORYLINE SPEC을 구조화 추출하라. "
        "리터니즈 운영 수치(CAPA 6,000건/일 등)는 발명하지 말고, 고객사 미확보 수치는 만들지 마라. "
        "회사명/플랫폼은 분석에서 확인된 값을 쓰라.",
        f"# 종합 분석\n{analysis}\n\n회사명: {company} / 홈페이지: {url}",
    )
    job.emit("stage_done", stage=3, title="스토리라인 설계", artifact="03_종합_분석.md")

    # STAGE 4 — 제안서 조립
    job.emit("stage_start", stage=4, title="제안서 초안 조립")
    proposal_html = assemble(spec)
    job.proposal_path = _write_proposal(job, company, proposal_html)
    job.artifacts[f"{company}_제안서.html"] = proposal_html
    job.emit("stage_done", stage=4, title="제안서 초안 조립", artifact=f"{company}_제안서.html")


# ------------------------------------------------------------------- DEMO 파이프라인
_DEMO_SRC = config.RAWDATA_DIR / "안다르"


def _demo_spec(company: str, platform: str = "CAFE24") -> StorylineSpec:
    return StorylineSpec(
        proposal_title=f"{company} B2C 반품 운영 모델 제안",
        company=company, company_en=company, platform=platform,
        hero_headline="왜 지금<br>반품 운영인가",
        hero_lead=("반품 증가는 검수 지연·환불 지연·CS 부하·재구매율 압박으로 이어지는 연결된 구조입니다. "
                   "리터니즈는 검수·양품화 병목만 분리해 브랜드 기준을 보존하며 리드타임을 개선합니다."),
        cards=[
            Card(tag="고객 구조", title="프리미엄 품질 중심 D2C",
                 bullets=["자체몰·주요 채널 동시 운영", "품질·브랜드 신뢰가 핵심 KPI", "반품 검수 기준이 까다로움"],
                 pill="양품화/기준 보존형"),
            Card(tag="핵심 과제", title="반품 병목의 연쇄",
                 bullets=["검수 TAT 지연 → 환불 지연", "CS 재문의·분쟁 증가", "재고 복귀 지연으로 판매 손실"],
                 pill="구조적 병목"),
            Card(tag="제안 방향", title="좁은 범위 파일럿",
                 bullets=["상위 카테고리 B2C 반품만", "기존 3PL 비충돌", "수치 증명형 단계 확장"],
                 pill="저부담 시작"),
        ],
        style_sku_lead="현재 재입고 단위(Style/SKU)에 대한 우려를 반영해 단계형 분류를 제안합니다.",
        style_sku_note="초기에는 Style 기준 반환으로 즉시 적용, 정합성 검증 후 SKU 세부로 확장 권장.",
        kpi_rows=[
            KpiRow(dept="경영진", kpi="매출 성장·브랜드 신뢰", message="반품 운영 안정화는 <b class='g'>성장 인프라 보강</b>입니다."),
            KpiRow(dept="물류/SCM", kpi="CAPA·운임·3PL 충돌", message="전면 위탁이 아니라 <b>검수·양품화 병목만 분리</b>합니다."),
            KpiRow(dept="CS", kpi="환불 문의·재문의율", message="검수 사진·상태값으로 <b class='o'>응답 시간·분쟁</b>을 줄입니다."),
            KpiRow(dept="품질/QC", kpi="판정 기준·오차율", message=f"{company} 기준을 흡수하고 <b class='g'>초기 2주 이중검수</b>로 관리합니다."),
            KpiRow(dept="MD/CRM", kpi="환불율·재구매율", message="반품 데이터가 <b>SKU별 환불율·재구매 방어</b>로 연결됩니다."),
        ],
        pilot_phases=[
            Phase(title="기준 정렬 (1~2주)", desc="검수 기준표·양품화 매뉴얼 수령, 판정 코드·사진 규격 합의"),
            Phase(title="파일럿 운영 (3~6주)", desc="상위 카테고리 실물 검수·양품화, 초기 2주 이중검수"),
            Phase(title="검증·확장 (7~8주)", desc="SLA·오차율·재고복귀 리포트, 상태값 연동 검토"),
        ],
        roadmap_note="확인 필요: 최근 12개월 반품량·단계별 리드타임. 후속: 글로벌/오프라인 반품 확장 검토.",
        checklist=[
            ChecklistItem(label="반품량 데이터", desc="최근 12개월 B2C 반품량 — 월평균·피크월·일평균·피크일"),
            ChecklistItem(label="처리 리드타임", desc="접수→회수→입고→검수→환불→재고복귀 단계별 소요 시간"),
            ChecklistItem(label="검수 기준·매뉴얼", desc=f"{company} 검수 기준표·양품화 허용 범위·사진 촬영 기준"),
            ChecklistItem(label="재입고 단위", desc="Style / Style+사이즈 / SKU 중 실제 재입고 기준"),
            ChecklistItem(label="시스템 구간", desc=f"{platform}·WMS·3PL 사이 수기 처리 구간, CS 필수 조회 정보"),
            ChecklistItem(label="승인 기준", desc="CAPA·단가·검수 정확도·연동·보안 중 우선순위"),
        ],
        src_foot="공개자료 리서치 및 워크드 분석 기반 (DEMO).",
    )


def _run_demo(job: Job, company: str, url: str, notes: str) -> None:
    job.emit("info", message="ANTHROPIC_API_KEY 미설정 → DEMO 모드(워크드 안다르 산출물 재생). 조립 경로는 실제 동작합니다.")
    demo_files = [
        (1, "공개정보 리서치", "01 안다르_고객사 공개자료 리서치.md", "01_공개자료_리서치.md"),
        (2, "페인포인트 추론", "02 안다르_회의록 분석.md", "02_회의록_분석.md"),
        (3, "스토리라인 설계", "03 안다르_고객사 종합 분석.md", "03_종합_분석.md"),
    ]
    for stage, title, src, dst in demo_files:
        job.emit("stage_start", stage=stage, title=title)
        p = _DEMO_SRC / src
        job.artifacts[dst] = p.read_text(encoding="utf-8") if p.exists() else f"(데모 자료 없음: {src})"
        job.emit("stage_done", stage=stage, title=title, artifact=dst)

    job.emit("stage_start", stage=4, title="제안서 초안 조립")
    proposal_html = assemble(_demo_spec(company))
    job.proposal_path = _write_proposal(job, company, proposal_html)
    job.artifacts[f"{company}_제안서.html"] = proposal_html
    job.emit("stage_done", stage=4, title="제안서 초안 조립", artifact=f"{company}_제안서.html")


# --------------------------------------------------------------------------- 진입점
def run_pipeline(job: Job, notes: str = "") -> None:
    try:
        if config.HAS_API_KEY:
            _run_live(job, job.company, job.url, notes)
        else:
            _run_demo(job, job.company, job.url, notes)
        job.status = "done"
        job.emit("done", proposal=f"{job.company}_제안서.html")
    except Exception as exc:  # noqa: BLE001 — 데모 서비스: 사용자에게 사유 노출
        job.status = "error"
        job.error = f"{type(exc).__name__}: {exc}"
        job.emit("error", message=job.error)
