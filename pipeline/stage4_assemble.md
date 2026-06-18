# STAGE 4 — 제안서 초안 조립 (Proposal Assembly)

목표: STAGE 3의 스토리라인 사양으로, 검증된 콘텐츠 라이브러리에서 **재사용·재조합하고 빈 곳만 신규 생성**해 제안서 HTML 초안을 완성한다.

> 핵심 원칙: **새로 다 쓰지 않는다.** 검증된 슬라이드는 회사명만 치환해 그대로 쓰고, 고객사별 판단이 들어가는 슬라이드만 생성한다.

산출물: `output/<고객사>/<회사명>_제안서.html`

## 입력
- `output/<고객사>/03_종합_분석.md` (특히 끝의 `▶ STORYLINE SPEC` 블록)
- `content-library/proposal-template.html` — 전체 덱 골격
- `content-library/section-map.md` — 어느 슬라이드가 고정/생성인지
- 참고 예시: `안다르_제안서_리터니즈_260616.html` (완성된 워크드 예시 — 톤·밀도·표현 패턴을 여기서 학습)

## 조립 절차
1. `proposal-template.html`을 복사해 출력 경로에 만든다.
2. **전역 토큰 치환** — `{{COMPANY}}`, `{{COMPANY_EN}}`, `{{PLATFORM}}`, `{{PROPOSAL_TITLE}}`, `{{SRC_FOOT}}` 등을 STORYLINE SPEC 값으로 일괄 치환한다.
3. **생성(GEN) 블록 채우기** — `<!-- ▼ GEN:xxx -->` ~ `<!-- ▲ GEN:xxx -->` 사이를 SPEC 값으로 채운다. 클래스·구조는 유지하고 텍스트만 바꾼다:
   - `GEN:hero` — HERO_HEADLINE / HERO_LEAD
   - `GEN:core3cards` — CARD_고객구조 / CARD_핵심과제 / CARD_제안방향
   - `GEN:style_sku` — STYLE_SKU_NOTE (고객이 SKU 우려 안 했으면 일반 톤)
   - `GEN:platform` — 플랫폼명·PLATFORM_INTEGRATION_NOTE
   - `GEN:kpi` — KPI_ROWS 표
   - `GEN:roadmap` — PILOT_PHASES 간트
   - `GEN:checklist` — CHECKLIST 6항목
4. **라이브러리(LIB) 블록은 손대지 않는다** — 회사명 토큰 외에는 검증된 문구를 그대로 둔다(역량 슬라이드·서비스 소개서·보안·고객사 로고·Before/After).
5. **수치 가드** — CAPA·정확도 등 리터니즈 운영 수치는 라이브러리 고정값을 쓴다. 고객사 데이터로 추정·발명하지 않는다. 고객사 반품량 등 미확보 수치는 placeholder로 두고 "데이터 확인 후 확정"이라고 명시한다.

## 슬라이드 선택 규칙 (스토리라인에 맞춰 가감)
- STAGE 2/3에서 우선순위 낮게 매겨진 주제 슬라이드는 뺀다(예: 고객이 플랫폼 연동을 안 물으면 `GEN:platform` 축소).
- 프리미엄/품질 중심 브랜드면 리커머스·B급판매 전면 슬라이드는 넣지 않고 "양품화/브랜드 기준 보존"으로 둔다.
- 고객이 명시 요청한 항목(예: CAPA, Style/SKU, 연동 범위)은 반드시 답변 슬라이드로 포함한다.

## 완료 후 자가 점검
- [ ] 회사명/플랫폼이 한 곳도 안 남고 전부 치환됐나 (`안다르`, `CAFE24` 잔존 검색)
- [ ] 모든 `{{...}}` 토큰과 `GEN:` 블록이 채워졌나
- [ ] 발명한 고객사 수치가 없나 (미확보는 "확인 후 확정" 처리)
- [ ] 브라우저로 열어 1280×720 슬라이드가 깨지지 않나

## 출력
`output/<고객사>/<회사명>_제안서.html` 저장 후, 사용자에게 경로와 "브라우저로 열어 인쇄→PDF" 안내. 채워지지 않은 데이터 확인 항목을 요약 보고한다.
