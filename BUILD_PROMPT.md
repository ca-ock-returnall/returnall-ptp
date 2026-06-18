# 한 번에 만드는 프롬프트 — 리터니즈 제안서 자동 생성 에이전트

> 아래 블록 전체를 빈 폴더에서 Claude Code에 그대로 붙여넣으면 이 프로덕트가 처음부터 조립된다.

---

너는 시니어 풀스택 엔지니어다. 아래 사양 하나만 보고 **"리터니즈 제안서 자동 생성 웹서비스"**를 빈 폴더에서 끝까지 구현하라. 사람 개입 없이 동작하는 제품을 만든다.

## 0. 제품 한 줄 정의
고객사 **회사명 + 홈페이지 URL**(+ 선택: 회의록)만 입력하면, ① 공개정보 리서치 → ② 페인포인트 추론 → ③ 스토리라인 설계 → ④ 제안서 HTML 조립까지 자동 완주하는 영업 제안서 생성 에이전트. 진행 상황은 실시간(SSE)으로 보이고, 끝에 23슬라이드 제안서 HTML(인쇄→PDF)이 나온다. **Anthropic Claude 네이티브**이며 데이터는 사내에 남는 코드 자산이다.

## 1. 핵심 설계 원칙 (절대 어기지 말 것)
- **검증된 콘텐츠는 새로 쓰지 않는다.** 제안서 23슬라이드 중 역량·서비스 소개서 슬라이드는 회사명 토큰만 치환(LIB). 고객사 판단이 들어가는 7개 블록만 생성(GEN): hero · 3카드 · Style/SKU · 플랫폼 연동 · 부서별 KPI · 파일럿 로드맵 · 확인 체크리스트.
- **리터니즈 운영 수치는 고정값.** CAPA 6,000건/일·여유 4,500건/일·48시간·검수정확도 99.99% 등은 라이브러리 고정값 — 변경/발명 금지. 고객사 미확보 수치는 발명하지 말고 "데이터 확인 후 확정"으로 표기.
- **사실/추정 분리.** 모든 중간 산출물에서 `[사실]`/`[추정]`과 근거(출처)를 끝까지 유지한다.
- **AI 기여의 핵심은 STAGE 2·3** (판단 레이어). 범용 툴이 못 하는 "무엇이 페인이고 무엇으로 설득할지"를 만든다. 1·4는 수집·결정론적 조립.

## 2. 4단계 파이프라인
오케스트레이터가 순서대로 실행한다. 각 단계의 시스템 프롬프트는 `pipeline/stageN_*.md` 파일 본문을 그대로 쓴다.

1. **STAGE 1 — 공개정보 리서치** (`pipeline/stage1_research.md`): 회사명+URL 입력. Anthropic **server-side web_search 툴**(`web_search_20260209`)로 공식사이트(반품/배송/검수 정책, 푸터 호스팅사·B2B 메뉴), IR·언론·채용공고를 실제 수집. 산출 `output/<회사>/01_공개자료_리서치.md`. 문서 구조: 회사개요 / 사업구조 / 반품·물류·재고·CS 단서 / 최근 전략 / 추정 페인포인트 / 의사결정자 관점 / 제안기회(단·중·장기) / 추가확인질문. 모든 주장에 근거, 추정엔 `[추정]`.
2. **STAGE 2 — 페인포인트 추론** (`pipeline/stage2_painpoints.md`): 회의록/메일이 있을 때만 실행(없으면 skip). STAGE1 + 회의록 입력. 최신 흐름 판단 → 고객사 유형 분류 → 명시 니즈 → 숨은 니즈/페인(확실성+검증질문) → 우려·승인장벽. 우선순위를 1/2/3/4로 매긴다(STAGE4 슬라이드 선택에 쓰임). 산출 `02_회의록_분석.md`.
3. **STAGE 3 — 종합 분석 + 스토리라인** (`pipeline/stage3_storyline.md`): STAGE1(+2) 통합. 사실/추정 재분리 → 문제 구조도(인과 사슬) → 긴장 지점 → 의사결정자 맵(운영지표→KPI 언어 번역) → 1순위 파일럿 확정. 산출 `03_종합_분석.md`. **문서 끝에 반드시 `▶ STORYLINE SPEC` 블록**을 붙인다(STAGE4가 읽는 사양서).
4. **STAGE 4 — 제안서 조립** (`pipeline/stage4_assemble.md`): STORYLINE SPEC을 **구조화 추출**(아래 스키마)한 뒤, 템플릿의 `{{TOKEN}}`을 결정론적으로 치환해 HTML 생성. LIB 블록은 회사명/플랫폼 토큰 외 손대지 않음. 미치환 토큰이 남으면 에러. 산출 `output/<회사>/<회사>_제안서.html`.

## 3. STORYLINE SPEC 스키마 (STAGE 3 산출 → STAGE 4 입력)
구조화 추출로 받는다. Python은 Pydantic, Next.js는 zod로 동일하게 정의:
- `proposal_title`, `company`, `company_en`(로고 영문, 없으면 회사명), `platform`(예: CAFE24/자체몰/스마트스토어)
- `hero_headline`(`<br>` 허용), `hero_lead`(2~3문장)
- `cards`: 정확히 3개 — {tag, title, bullets[정확히 3], pill} (고객구조 / 핵심과제 / 제안방향)
- `style_sku_lead`, `style_sku_note`
- `kpi_rows`: 5~7행 — {dept, kpi, message} (message는 `<b>`,`<b class='g'>`,`<b class='o'>` 강조 HTML 허용)
- `pilot_phases`: 정확히 3개 — {title, desc} (기준정렬 / 파일럿운영 / 검증확장)
- `roadmap_note`, `checklist`: 정확히 6개 — {label, desc}, `src_foot`

추출 LLM 호출: Anthropic `messages.parse`(또는 TS SDK 구조화 출력) + 위 스키마. 시스템 프롬프트에 "리터니즈 운영 수치 발명 금지, 고객사 미확보 수치 생성 금지, 회사명/플랫폼은 분석에서 확인된 값 사용"을 명시.

## 4. 콘텐츠 라이브러리
- `content-library/proposal-template.html`: **23슬라이드 덱**(1280×720, 인쇄→PDF). 전역 토큰 `{{COMPANY}} {{COMPANY_EN}} {{PLATFORM}} {{PROPOSAL_TITLE}} {{SRC_FOOT}}` 및 GEN 토큰들. GEN 블록은 `<!-- ▼ GEN:xxx -->` ~ `<!-- ▲ GEN:xxx -->`로 감싼다: `hero`(HERO_HEADLINE/HERO_LEAD) · `core3cards`(CARD1~3_*) · `style_sku`(STYLE_SKU_LEAD/NOTE) · `platform` · `kpi`(KPI_ROWS 표) · `roadmap`(ROADMAP_TOP/NOTE 간트) · `checklist`(CHECKLIST_ITEMS). 나머지 16개는 검증 LIB(역량·서비스 소개서·보안·고객사 로고·Before/After) — 회사명 토큰만 치환.
- `content-library/section-map.md`: 슬라이드별 LIB/GEN 매핑 표(아래 23슬라이드). GEN=4·9·11·12·13·14·15번 성격의 고객사 생성 블록, 나머지 LIB.
- 조립기(`assemble`): 토큰 dict 치환. 텍스트 토큰은 HTML escape하되 `hero_headline`과 kpi `message`는 강조 HTML을 의도적으로 허용. 표 행(kpi/roadmap/checklist)은 HTML 조각으로 빌드. 치환 후 `{{[A-Z0-9_]+}}` 잔존 검사 → 있으면 RuntimeError.

23슬라이드 구성: 1커버(GEN토큰) · 2 EXEC SUMMARY divider · 3 왜지금(3카드,GEN) · 4~5 반품처리/재고복원 역량 · 6 확인요청 divider · 7~10 CAPA·운영방식·프로세스·운송비(LIB,수치고정) · 11 Style/SKU(GEN) · 12 플랫폼연동(GEN) · 13 부서KPI(GEN) · 14 파일럿로드맵(GEN) · 15 확인체크리스트(GEN) · 16 서비스소개 divider · 17~22 반품케어·통계·로고·Before/After·보안(LIB) · 23 클로징(연락처 고정).

## 5. DEMO 모드
`ANTHROPIC_API_KEY`가 없으면 DEMO로 동작: `rawdata/안다르/`의 워크드 ①~③ 마크다운을 재생하고, **STAGE 4 조립 경로는 실제로 실행**한다(하드코딩한 안다르 StorylineSpec → 실제 assemble). 키 없이도 전체 흐름과 결과물을 시연 가능. 사용자에게 "DEMO 모드" 안내 이벤트를 emit.

## 6. 웹서비스 (두 스택 모두 구현, 동일 자산 공유)

### 6a. Python — `app/` (FastAPI)
- 라우트: `GET /`(입력폼+4단계 실시간 진행 UI, 인라인 HTML) · `POST /api/generate`(회사명·URL·notes·파일 업로드 → job_id, demo_mode 반환) · `GET /api/jobs/{id}/stream`(SSE) · `GET /api/jobs/{id}/artifact/{name}`(산출물 원문) · `GET /proposals/{id}`(제안서 HTML) · `GET /api/usage`(레이트리밋 모달).
- `jobs.py`: 인메모리 Job(id, company, url, status, artifacts dict, 이벤트 큐, log 리스트). `emit(kind, **data)`로 SSE 이벤트 흘림. 백그라운드 thread로 `run_pipeline` 실행. SSE는 연결 전 발생 이벤트(log) 먼저 재생 후 큐 구독, 30초 keep-alive, `done`/`error`에서 종료.
- `llm.py`: `anthropic.Anthropic()` 래퍼. `run_with_websearch`(web_search 툴 + `pause_turn` 재개 루프 + 검색 횟수 진행 콜백) / `run_text` / `parse_storyline`(messages.parse) / `rate_limit_status`(max_tokens=1 요청으로 `anthropic-ratelimit-*` 헤더만 읽음; 429도 헤더+retry-after 노출).
- `attachments.py`: 업로드된 회의록 파일(txt/md/docx 등) 텍스트 추출 → notes에 합침(최대 20만자).
- `auth.py`: 세션 쿠키 로그인. 자격증명 env `APP_USERNAME`/`APP_PASSWORD`(기본 `pushtoprod`/`push2prod!`), 쿠키는 `APP_SECRET` HMAC-SHA256 서명 고정 토큰(상수시간 비교, httponly·secure·samesite=lax, 7일).
- `config.py`: 경로(pipeline/content-library/rawdata/output), `MODEL=env PROPOSAL_MODEL or "claude-opus-4-8"`, `HAS_API_KEY`, `load_stage_prompt`/`load_template`.
- `requirements.txt`: `anthropic>=0.92.0 fastapi uvicorn[standard] python-multipart`. `run.sh`로 `uvicorn app.main:app --port 8000` 기동.

### 6b. Next.js — `web/` (App Router, 동일 기능)
- 동일 라우트를 route handler로: `app/page.tsx`(폼+진행 UI) · `api/generate` · `api/jobs/[id]/stream`(SSE) · `api/jobs/[id]/artifact/[name]` · `proposals/[id]` · `api/usage` · 로그인(`api/login`/`api/logout`, `middleware.ts`) · `api/jobs/[id]/pptx`(pptxgenjs로 PPTX 내보내기).
- `lib/`: `pipeline.ts`(4단계) · `llm.ts`(`@anthropic-ai/sdk` + `web_search_20260209` + 구조화 파싱) · `schema.ts`(**zod** StorylineSpecSchema) · `assemble.ts`(토큰 치환) · `jobs.ts`(인메모리, 단일 프로세스) · `config.ts` · `demoSpec.ts` · `attachments.ts`(mammoth로 docx) · `auth.ts`/`sessions.ts`. 사이드의 `pipeline/`·`content-library/`·`rawdata/`를 런타임에 그대로 읽는다.
- `package.json`: next 15 · react 19 · `@anthropic-ai/sdk` · zod · pptxgenjs · mammoth · react-markdown · remark-gfm. `dev`는 포트 8000.

### 6c. 진행 UI (양쪽 공통)
입력 폼(회사명·URL·회의록 텍스트/파일) → 제출 시 4단계 카드가 실시간 갱신(stage_start/progress/done/skip 이벤트). STAGE1은 "공개정보 검색 N건째 — 쿼리" 진행 표시. STAGE2·3의 산출물(`02_*.md`·`03_*.md`)을 "판단 레이어"로 펼쳐 보여준다(심사 임팩트). 끝에 제안서 열기 버튼. 설정 모달에 API 키 레이트리밋 잔여치 표시. SSE 끊김 시 재연결.

## 7. 배포
- `Dockerfile`(Python)·`Dockerfile.web`(Next.js)·`docker-compose.yml`. nginx-proxy + SSL 구조로 단일 호스트 배포(`nginx/`). `.env.example`: `ANTHROPIC_API_KEY` / `PROPOSAL_MODEL=claude-opus-4-8`(빠르게: `claude-sonnet-4-6`) / `PROPOSAL_EFFORT=low|medium|high|xhigh|max`.

## 8. 산출 디렉터리
```
output/<회사명>/
  01_공개자료_리서치.md   02_회의록_분석.md(회의록 있을 때만)
  03_종합_분석.md(끝에 ▶ STORYLINE SPEC)   <회사명>_제안서.html
```

## 9. 구현 순서 (이대로 진행)
1) `pipeline/stage1~4.md` 4개 지침 작성(위 STAGE 정의를 본문으로).
2) `content-library/proposal-template.html`(23슬라이드, GEN 마커·토큰) + `section-map.md`.
3) `rawdata/안다르/` 워크드 01·02·03 마크다운 예시 + 하드코딩 데모 StorylineSpec.
4) Python `app/`: config→schema→assemble→llm→jobs→pipeline→attachments→auth→web_ui→main, `requirements.txt`, `run.sh`.
5) Next.js `web/`: lib/* → app/* 라우트, `package.json`.
6) Docker/nginx/compose/.env.example, `README.md`.
7) **검증**: 키 없이 `./run.sh` → 데모로 안다르 제안서 HTML이 토큰 0개 잔존으로 조립되는지 확인. 키 있으면 실제 회사 1건으로 1~4단계 완주 확인.

완성 기준: 회사명+URL만으로 사람 개입 없이 ①~④ 완주, 제안서 HTML에 미치환 토큰·발명된 고객사 수치가 없을 것.
