"""DEMO 모드용 하드코딩 StorylineSpec (안다르).

ANTHROPIC_API_KEY 가 없을 때 STAGE4 조립 경로를 실제로 태우기 위한 입력.
- 리터니즈 운영 수치(6,000건/일·4,500건/일·48시간·99.99%)는 고정값만 사용.
- 안다르 고객사 미확보 수치는 발명하지 않고 "데이터 확인 후 확정"으로 표기.
Next.js(web/lib/demoSpec.ts)와 동일 값을 유지할 것."""
from __future__ import annotations

from .schema import (
    Card,
    ChecklistItem,
    KpiRow,
    PilotPhase,
    StorylineSpec,
)

DEMO_SPEC = StorylineSpec(
    proposal_title="반품 운영 효율화 제안서",
    company="안다르",
    company_en="ANDAR",
    platform="자체몰 · CAFE24",
    hero_headline="안다르의 반품을<br>다시 파는 재고로 되돌립니다",
    hero_lead=(
        "애슬레저 특성상 사이즈·핏 교환과 반품이 반복됩니다. "
        "리터니즈가 입고·검수·재고복원·재판매를 한 라인으로 운영해, "
        "반품 손실률과 처리 리드타임을 동시에 낮춥니다."
    ),
    cards=[
        Card(
            tag="고객 구조",
            title="자체몰 중심 D2C, 높은 교환·반품 비중",
            bullets=[
                "[사실] 자체몰·CAFE24 기반 D2C 판매 구조",
                "[추정] 레깅스·애슬레저 핏 민감도로 교환·반품 반복",
                "[추정] 시즌 신상 회전이 빨라 반품 재고화 압박",
            ],
            pill="핏 민감 카테고리",
        ),
        Card(
            tag="핵심 과제",
            title="반품 적체와 재고 묶임, 회수 가치 손실",
            bullets=[
                "[추정] 반품 검수 지연 시 정상 재고 복원 지연",
                "[추정] 폐기·이월 비중이 회수 가치 손실로 직결",
                "[추정] 검수 기준 편차로 CS·재고 데이터 불일치",
            ],
            pill="데이터 확인 후 확정",
        ),
        Card(
            tag="제안 방향",
            title="48시간 재고복원 + 등급별 재판매 분기",
            bullets=[
                "[사실] 입고→재고복원 48시간 SLA 표준",
                "[사실] 검수정확도 99.99%로 등급 판정 일원화",
                "[제안] 리퍼·아울렛 채널로 회수 가치 전환",
            ],
            pill="파일럿으로 검증",
        ),
    ],
    style_sku_lead=(
        "레깅스·애슬레저 의류는 착용 흔적·핏 변형·세탁 상태에 따라 "
        "양품/리퍼/불량 경계가 미묘합니다. 색상·사이즈 SKU가 많아 "
        "복원 시 정확한 재입고 매핑이 중요합니다."
    ),
    style_sku_note=(
        "안다르 상품군에 맞춘 검수 체크리스트(핏 변형·보풀·세탁 상태)를 "
        "표준화하고, SKU 단위로 재입고 라우팅을 설계합니다. "
        "구체 SKU 분포·반품 사유 비중은 데이터 확인 후 확정합니다."
    ),
    kpi_rows=[
        KpiRow(dept="물류/운영", kpi="재고복원 리드타임",
               message="입고→복원 <b class='g'>48시간</b> SLA로 적체 해소"),
        KpiRow(dept="재고기획", kpi="가용 재고 회복",
               message="양품 <b>즉시 재고 복원</b>으로 판매 기회 손실 최소화"),
        KpiRow(dept="CS", kpi="반품 처리 일관성",
               message="<b class='g'>99.99%</b> 검수 정확도로 분쟁·재문의 감소"),
        KpiRow(dept="재무", kpi="회수 가치",
               message="폐기 대신 <b class='o'>리퍼·재판매</b>로 손실을 매출로 전환"),
        KpiRow(dept="마케팅/MD", kpi="시즌 재고 회전",
               message="피크 반품을 여유 CAPA <b>4,500건/일</b>로 흡수"),
        KpiRow(dept="경영", kpi="운영비 예측성",
               message="처리 <b>건당 정산</b>으로 예측 가능한 비용 구조"),
    ],
    pilot_phases=[
        PilotPhase(title="기준 정렬",
                   desc="안다르 검수 기준·SKU 매핑·데이터 연동 정의 (2주)"),
        PilotPhase(title="파일럿 운영",
                   desc="단일 카테고리 반품을 48시간 SLA로 시범 운영 (4주)"),
        PilotPhase(title="검증 · 확장",
                   desc="회수율·리드타임 지표 검증 후 전 카테고리 확장 (이후)"),
    ],
    roadmap_note=(
        "파일럿 기간·물량은 안다르 데이터 확인 후 확정합니다. "
        "리드타임 48시간·검수정확도 99.99%는 리터니즈 운영 기준값입니다."
    ),
    checklist=[
        ChecklistItem(label="대상 카테고리",
                      desc="파일럿 시작 카테고리(예: 레깅스 라인) 선정"),
        ChecklistItem(label="반품 물량 데이터",
                      desc="월 반품 건수·사유 분포 공유 (데이터 확인 후 확정)"),
        ChecklistItem(label="플랫폼 연동",
                      desc="자체몰·CAFE24 주문/재고 API 연동 범위 확정"),
        ChecklistItem(label="검수 기준",
                      desc="양품/리퍼/불량 등급 기준 합의"),
        ChecklistItem(label="재판매 채널",
                      desc="리퍼·아울렛 재판매 채널 정책 확정"),
        ChecklistItem(label="정산 방식",
                      desc="처리 건당 단가·정산 주기 합의"),
    ],
    src_foot="출처: 안다르 공식몰·공개자료 기반 [추정] 포함 · 리터니즈 운영 기준값(고정)",
)
