# 리터니즈 제안서 자동 생성 에이전트

고객사 **이름 + 홈페이지 URL**만 입력하면 영업 제안서 초안까지 사람 개입 없이 완주하는 Claude Code 네이티브 에이전트.
SaaS 구독이 아니라 **우리 로직에 맞춘 코드 자산**으로, 데이터는 사내에 남는다.

```
회사명 + URL  ──▶  ① 공개정보 리서치  ──▶  ② 페인포인트 추론  ──▶  ③ 스토리라인 설계  ──▶  ④ 제안서 초안 조립
                    (WebSearch/Fetch)      (회의록·우리 데이터)      (종합 분석)          (라이브러리 재조합 + 갭 생성)
```

> AI 기여의 핵심 = ②, ③. 범용 툴이 못 하는, **우리 데이터가 들어가는 판단 레이어**(무엇이 페인이고 무엇으로 설득할지).

## 웹서비스로 실행 (회사명+URL만 입력)

브라우저 폼에 **회사명 + 홈페이지 URL**만 넣으면 ①~④가 자동 진행되고, 진행 상황이 실시간(SSE)으로 보이며 끝에 제안서 HTML이 나온다.

```
pip install -r requirements.txt        # 최초 1회 (.venv 권장)
export ANTHROPIC_API_KEY=sk-ant-...     # 없으면 DEMO 모드로 동작
./run.sh                                # → http://127.0.0.1:8000
```

- **실모드**(API 키 있음): STAGE 1이 `web_search` 서버 툴로 실제 공개정보를 수집하고, STAGE 3가 구조화 스토리라인 사양(`StorylineSpec`)을 추출해 템플릿에 결정론적으로 조립한다. 모델 기본값은 `claude-opus-4-8`(`PROPOSAL_MODEL`로 변경).
- **DEMO 모드**(키 없음): `rawdata/안다르`의 워크드 ①~③ 산출물을 재생하고 ④ 조립 경로는 실제로 실행한다 — 키 없이도 전체 흐름과 조립 결과를 시연할 수 있다.

| 경로 | 설명 |
|---|---|
| `GET /` | 입력 폼 + 4단계 실시간 진행 UI |
| `POST /api/generate` | 작업 시작(회사명·URL·회의록) |
| `GET /api/jobs/{id}/stream` | 진행 SSE 스트림 |
| `GET /api/jobs/{id}/artifact/{name}` | 단계 산출물(②·③ "판단 레이어") 원문 |
| `GET /proposals/{id}` | 조립된 제안서 HTML (인쇄→PDF) |

웹서비스 코드: `app/`(`pipeline.py` 오케스트레이터 · `llm.py` Anthropic 호출 · `schema.py` 스토리라인 사양 · `assemble.py` 토큰 조립 · `web_ui.py` 프런트엔드).

### Next.js 버전 (`web/`)

동일 기능을 Next.js(App Router)로 구현한 버전. 사이드의 `pipeline/`·`content-library/`·`rawdata/` 자산을 런타임에 그대로 읽어 쓴다.

```
cd web
npm install                          # 최초 1회
export ANTHROPIC_API_KEY=sk-ant-...  # 없으면 DEMO 모드
npm run dev                          # → http://127.0.0.1:8000
```

- TS SDK `@anthropic-ai/sdk` + `web_search_20260209` 서버 툴로 STAGE 1 리서치, `messages.parse` + **zod**(`StorylineSpecSchema`)로 스토리라인 사양 구조화.
- 진행 상황은 SSE 라우트 핸들러(`app/api/jobs/[id]/stream`)로 실시간 스트리밍.
- 구조: `lib/`(pipeline·llm·schema·assemble·jobs·config·demoSpec) + `app/`(페이지·라우트 핸들러). 인메모리 작업 저장소(단일 프로세스 데모 범위).
- 경로: `GET /` · `POST /api/generate` · `GET /api/jobs/{id}/stream` · `GET /api/jobs/{id}/artifact/{name}` · `GET /proposals/{id}`.

> Python(FastAPI, `app/`)·Next.js(`web/`) 두 구현은 동일한 파이프라인 자산을 공유한다. 둘 중 편한 스택으로 실행하면 된다.

## 사용법 (Claude Code 네이티브)

Claude Code에서 한 줄로 실행한다.

```
/proposal 안다르 https://www.andar.co.kr
```

또는 자연어로:

```
"이랜드 제안서 만들어줘. 홈페이지는 elandmall.com 이고, 회의록은 rawdata/이랜드에 있어."
```

회의록/메일 파일을 함께 주면 STAGE 2(페인포인트 추론)에 반영된다. 없으면 공개정보만으로 추론한다.

## 산출물

```
output/<회사명>/
  01_공개자료_리서치.md     # STAGE 1
  02_회의록_분석.md          # STAGE 2 (회의록 있을 때만)
  03_종합_분석.md            # STAGE 3 (끝에 ▶ STORYLINE SPEC)
  <회사명>_제안서.html       # STAGE 4 — 브라우저로 열어 인쇄→PDF
```

## 구조

```
.claude/skills/proposal/SKILL.md   # 오케스트레이터 (4단계 체이닝)
pipeline/
  stage1_research.md               # 공개정보 리서치 지침
  stage2_painpoints.md             # 페인포인트 추론 지침
  stage3_storyline.md              # 스토리라인 설계 지침
  stage4_assemble.md               # 제안서 조립 지침
content-library/
  proposal-template.html           # 검증된 23슬라이드 덱 골격 (LIB 고정 + GEN 생성)
  section-map.md                   # 슬라이드별 고정/생성 매핑
rawdata/                           # 워크드 예시 분석본 (안다르·이랜드)
안다르_제안서_리터니즈_260616.html  # 완성 예시 (조립 톤 레퍼런스)
```

## 동작 원칙

- **검증된 콘텐츠는 새로 쓰지 않는다.** 역량·서비스 소개서 슬라이드는 회사명만 치환(LIB). 고객사 판단이 들어가는 7개 블록(hero·3카드·Style/SKU·연동·KPI·로드맵·체크리스트)만 생성(GEN).
- **리터니즈 운영 수치(CAPA·정확도)는 고정값.** 고객사 수치는 발명하지 않고, 미확보분은 "확인 후 확정"으로 표기.
- **사실/추정 분리.** 모든 산출물에서 `[사실]`/`[추정]`과 근거를 끝까지 유지.

## Before → After

| | 사람이 직접 | 이 에이전트 |
|---|---|---|
| 1건 제안서 초안 | 리서치+분석+디자인 다수 시간 | 회사명+URL 입력 후 수 분 내 초안 |
| 톤·구조 일관성 | 담당자마다 편차 | 검증 라이브러리로 균일 |
| 데이터 위치 | 외부 SaaS | 사내 코드 자산 |

> 데모 포인트: 최소 입력 → 사람 없이 ①~④ 완주. 심사위원에게는 ②·③ 산출물(`02_*.md`, `03_*.md`)을 펼쳐 "판단 레이어"를 보여주는 게 임팩트가 크다.
