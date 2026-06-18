// 다국어(한국어/영어) 사전 및 헬퍼. 클라이언트 UI · 서버 파이프라인 양쪽에서 공유한다.
// React 의존성 없음(순수 데이터/함수) — 서버 모듈에서도 안전하게 import 가능.
// 언어 전환 훅은 useLang.ts(클라이언트 전용) 참고.

export type Lang = "ko" | "en";

// 브라우저/요청 언어 문자열 → 지원 언어. 한국어면 ko, 그 외(영어 포함)는 en, 미상이면 ko.
export function pickLang(raw?: string | null): Lang {
  if (!raw) return "ko";
  return raw.toLowerCase().startsWith("ko") ? "ko" : "en";
}

// 폼/쿼리에서 받은 명시값을 안전하게 좁힌다.
export function asLang(raw?: string | null): Lang {
  return raw === "en" ? "en" : "ko";
}

// 산출물 파일명(서버 저장 + 클라이언트 다운로드에서 동일하게 사용).
export function proposalBase(lang: Lang): string {
  return lang === "en" ? "Proposal" : "제안서";
}
export function proposalFileName(company: string, lang: Lang): string {
  return `${company}_${proposalBase(lang)}.html`;
}
export function pptxFileName(company: string, lang: Lang): string {
  return `${company}_${proposalBase(lang)}.pptx`;
}

// 단계 산출 마크다운 파일명. 복원 로직은 "01_"/"02_"/"03_" 접두로 매칭하므로 언어가 달라도 안전.
export function artifactNames(lang: Lang): { research: string; notes: string; synthesis: string } {
  return lang === "en"
    ? { research: "01_Public_Research.md", notes: "02_Notes_Analysis.md", synthesis: "03_Synthesis.md" }
    : { research: "01_공개자료_리서치.md", notes: "02_회의록_분석.md", synthesis: "03_종합_분석.md" };
}

// ── 클라이언트 UI 문자열 ─────────────────────────────────────────────────────
type UIDict = {
  locale: string;
  // 헤더/공통
  settings: string;
  keySet: string;
  logout: string;
  langName: string; // 토글에 표시할 "전환 대상" 라벨
  // 단계명
  stage1: string;
  stage2: string;
  stage3: string;
  stage4: string;
  judgeLayer: string;
  // 상태
  waiting: string;
  generating: string;
  doneStat: string;
  skipped: string;
  notesMissing: string;
  // 히어로/폼
  logoMain: string;
  logoSub: string;
  tagline: string;
  phCompany: string;
  phUrl: string;
  attachOpen: string;
  attachClose: string;
  phNotes: string;
  dropPrefix: string;
  dropBrowse: string;
  dropHint: string;
  remove: string;
  ctaBusy: string;
  ctaStart: string;
  // 히스토리
  histTitle: string;
  histSaved: string;
  histWatch: (stage: number) => string;
  histError: string;
  del: string;
  // HUD
  hudElapsed: string;
  hudStage: string;
  hudGen: string;
  charsUnit: (n: string) => string;
  hudSearch: string;
  searchUnit: (n: number) => string;
  hudModel: string;
  hudEffort: string;
  hudKey: string;
  dash: string;
  // 배너
  demoBanner: string;
  attachApplied: (n: number, names: string) => string;
  attachSkipped: (n: number, names: string) => string;
  searchResult: (count: number, titles: string) => string;
  viewRender: (name: string) => string;
  // 우측 패널
  kpTitle: string;
  kpTarget: string;
  kpCollected: (n: number) => string;
  kpPoints: string;
  kpEmpty: string;
  // 결과
  resultDone: string;
  totalTime: (t: string) => string;
  openHtml: string;
  dlPptx: string;
  dlHtml: string;
  resultHint: string;
  // 키포인트 라벨(서버가 보내오지만 영문 대비 클라 폴백)
  // 에러
  errPrefix: string;
  startFail: string;
  // 설정 모달
  setApiKey: string;
  phApiKey: string;
  setApiKeyHint: string;
  setModel: string;
  setModelDefault: string;
  setEffort: string;
  setEffortDefault: string;
  save: string;
  reset: string;
  close: string;
  usageTitle: string;
  loading: string;
  refresh: string;
  usageNoKey: string;
  usageRateLimit: (retry: string) => string;
  usageNoInfo: string;
  usageFootnote: string;
  resetIn: (s: number) => string;
  // 사용량 카테고리
  catRequests: string;
  catTokens: string;
  catInputTokens: string;
  catOutputTokens: string;
  // 모델 옵션 설명
  modelFast: string;
  modelHigh: string;
  effortLow: string;
  effortXHigh: string;
  // 로그인 페이지
  loginSub: string;
  loginError: string;
  loginUser: string;
  loginPass: string;
  loginBtn: string;
};

export const UI: Record<Lang, UIDict> = {
  ko: {
    locale: "ko-KR",
    settings: "⚙ 설정",
    keySet: "API 키 설정됨",
    logout: "로그아웃",
    langName: "EN",
    stage1: "공개정보 리서치",
    stage2: "페인포인트 추론",
    stage3: "스토리라인 설계",
    stage4: "제안서 초안 조립",
    judgeLayer: " · 판단 레이어",
    waiting: "대기",
    generating: "생성 중…",
    doneStat: "완료",
    skipped: "건너뜀",
    notesMissing: "회의록 미입력",
    logoMain: "리터니즈",
    logoSub: "제안서 자동 생성",
    tagline: "회사명과 홈페이지 URL만 넣으면 리서치 · 페인포인트 · 스토리라인 · 제안서까지 자동 완주",
    phCompany: "회사명 (예: 안다르)",
    phUrl: "홈페이지 URL (https://…)",
    attachOpen: "＋ 회의록 첨부 (선택)",
    attachClose: "– 회의록 첨부 닫기",
    phNotes: "회의록/메일/메모를 붙여넣으세요. 페인포인트 추론(STAGE 2)에 반영됩니다.",
    dropPrefix: "파일을 끌어다 놓거나 ",
    dropBrowse: "클릭해서 선택",
    dropHint: "지원: txt · md · csv · tsv · json · log · html · docx — 텍스트로 추출해 STAGE 2에 반영",
    remove: "제거",
    ctaBusy: "진행 중…",
    ctaStart: "제안서 생성 시작",
    histTitle: "세션 히스토리",
    histSaved: " · 서버 저장",
    histWatch: (stage) => `진행 중 ${Math.min(stage, 4)}/4 ▸ 관전`,
    histError: " · 오류",
    del: "삭제",
    hudElapsed: "경과",
    hudStage: "단계",
    hudGen: "생성",
    charsUnit: (n) => `${n}자`,
    hudSearch: "웹검색",
    searchUnit: (n) => `${n}회`,
    hudModel: "모델",
    hudEffort: "effort",
    hudKey: "키",
    dash: "—",
    demoBanner: "DEMO 모드: 워크드 안다르 산출물을 스트리밍으로 재생합니다(API 키 미설정).",
    attachApplied: (n, names) => `📎 첨부 회의록 ${n}건 반영 (${names})`,
    attachSkipped: (n, names) => ` · 미지원 ${n}건 제외 (${names})`,
    searchResult: (count, titles) => `└ 결과 ${count}건${titles ? ` · ${titles}` : ""}`,
    viewRender: (name) => `📄 ${name} 렌더링 보기`,
    kpTitle: "🎯 주요 포인트",
    kpTarget: "대상",
    kpCollected: (n) => `검색봇 수집 페이지 (${n})`,
    kpPoints: "핵심 포인트",
    kpEmpty: "스토리라인 설계 완료 시 정리됩니다…",
    resultDone: "✅ 제안서 초안 완성",
    totalTime: (t) => ` · 총 ${t}`,
    openHtml: "제안서 열기 (HTML) →",
    dlPptx: "⬇ PowerPoint(.pptx) 다운로드",
    dlHtml: "⬇ HTML 다운로드",
    resultHint:
      "HTML은 브라우저 인쇄(⌘P) → ‘PDF로 저장’으로도 내보낼 수 있고, PPTX는 파워포인트/Keynote/Google 슬라이드에서 바로 편집할 수 있습니다. (PPTX는 해당 세션이 서버에 남아 있을 때 받을 수 있습니다.)",
    errPrefix: "오류: ",
    startFail: "시작 실패: ",
    setApiKey: "Anthropic API 키",
    phApiKey: "sk-ant-... (비우면 서버 .env 키 사용)",
    setApiKeyHint:
      "브라우저(localStorage)에만 저장되고 요청 시 서버로 전송됩니다. 비우면 서버 .env의 키를 사용하며, 키가 전혀 없으면 DEMO 모드로 동작합니다.",
    setModel: "모델",
    setModelDefault: "서버 기본값(.env)",
    setEffort: "effort (속도/품질)",
    setEffortDefault: "서버 기본값(.env)",
    save: "저장",
    reset: "초기화",
    close: "닫기 ✕",
    usageTitle: "API 잔여량 (분 단위 레이트리밋)",
    loading: "조회 중…",
    refresh: "새로고침",
    usageNoKey: "API 키가 설정되어 있지 않습니다 (DEMO 모드).",
    usageRateLimit: (retry) => `레이트리밋 도달${retry ? ` · ${retry}초 후 재시도 가능` : ""}`,
    usageNoInfo: "레이트리밋 정보를 가져오지 못했습니다.",
    usageFootnote: "Anthropic은 키의 월 잔액·한도를 API로 제공하지 않아 분 단위 레이트리밋 잔여치만 표시합니다.",
    resetIn: (s) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초 후 리셋` : `${s}초 후 리셋`),
    catRequests: "요청",
    catTokens: "토큰",
    catInputTokens: "입력 토큰",
    catOutputTokens: "출력 토큰",
    modelFast: "빠름",
    modelHigh: "고품질",
    effortLow: "가장 빠름",
    effortXHigh: "최고 품질",
    loginSub: "계속하려면 로그인하세요.",
    loginError: "아이디 또는 비밀번호가 올바르지 않습니다.",
    loginUser: "아이디",
    loginPass: "비밀번호",
    loginBtn: "로그인",
  },
  en: {
    locale: "en-US",
    settings: "⚙ Settings",
    keySet: "API key set",
    logout: "Log out",
    langName: "한국어",
    stage1: "Public Research",
    stage2: "Pain-point Inference",
    stage3: "Storyline Design",
    stage4: "Proposal Assembly",
    judgeLayer: " · judgment layer",
    waiting: "Idle",
    generating: "Generating…",
    doneStat: "Done",
    skipped: "Skipped",
    notesMissing: "No notes provided",
    logoMain: "Returneeds",
    logoSub: "AI Proposal Builder",
    tagline:
      "Just enter a company name and homepage URL — research, pain-points, storyline, and proposal run end-to-end automatically.",
    phCompany: "Company name (e.g., Andar)",
    phUrl: "Homepage URL (https://…)",
    attachOpen: "＋ Attach meeting notes (optional)",
    attachClose: "– Close notes attachment",
    phNotes: "Paste meeting notes / emails / memos. They feed into pain-point inference (STAGE 2).",
    dropPrefix: "Drag files here or ",
    dropBrowse: "click to select",
    dropHint: "Supported: txt · md · csv · tsv · json · log · html · docx — extracted as text and fed into STAGE 2",
    remove: "Remove",
    ctaBusy: "In progress…",
    ctaStart: "Generate proposal",
    histTitle: "Session history",
    histSaved: " · saved on server",
    histWatch: (stage) => `Running ${Math.min(stage, 4)}/4 ▸ watch`,
    histError: " · error",
    del: "Delete",
    hudElapsed: "Elapsed",
    hudStage: "Stage",
    hudGen: "Generated",
    charsUnit: (n) => `${n} chars`,
    hudSearch: "Web search",
    searchUnit: (n) => `${n}×`,
    hudModel: "Model",
    hudEffort: "effort",
    hudKey: "Key",
    dash: "—",
    demoBanner: "DEMO mode: replaying the worked Andar output as a stream (no API key set).",
    attachApplied: (n, names) => `📎 Applied ${n} attached note file(s) (${names})`,
    attachSkipped: (n, names) => ` · excluded ${n} unsupported file(s) (${names})`,
    searchResult: (count, titles) => `└ ${count} result(s)${titles ? ` · ${titles}` : ""}`,
    viewRender: (name) => `📄 View ${name}`,
    kpTitle: "🎯 Key points",
    kpTarget: "Target",
    kpCollected: (n) => `Pages collected by bot (${n})`,
    kpPoints: "Core points",
    kpEmpty: "Compiled once storyline design completes…",
    resultDone: "✅ Proposal draft complete",
    totalTime: (t) => ` · total ${t}`,
    openHtml: "Open proposal (HTML) →",
    dlPptx: "⬇ Download PowerPoint (.pptx)",
    dlHtml: "⬇ Download HTML",
    resultHint:
      "You can export the HTML via browser print (⌘P) → ‘Save as PDF’, and the PPTX is directly editable in PowerPoint / Keynote / Google Slides. (The PPTX is available while the session remains on the server.)",
    errPrefix: "Error: ",
    startFail: "Failed to start: ",
    setApiKey: "Anthropic API key",
    phApiKey: "sk-ant-... (leave empty to use the server .env key)",
    setApiKeyHint:
      "Stored only in your browser (localStorage) and sent to the server with each request. If empty, the server .env key is used; if no key exists at all, it runs in DEMO mode.",
    setModel: "Model",
    setModelDefault: "Server default (.env)",
    setEffort: "effort (speed/quality)",
    setEffortDefault: "Server default (.env)",
    save: "Save",
    reset: "Reset",
    close: "Close ✕",
    usageTitle: "API headroom (per-minute rate limits)",
    loading: "Loading…",
    refresh: "Refresh",
    usageNoKey: "No API key is configured (DEMO mode).",
    usageRateLimit: (retry) => `Rate limit reached${retry ? ` · retry in ${retry}s` : ""}`,
    usageNoInfo: "Could not retrieve rate-limit info.",
    usageFootnote:
      "Anthropic does not expose a key’s monthly balance/quota via API, so only per-minute rate-limit headroom is shown.",
    resetIn: (s) => (s >= 60 ? `resets in ${Math.floor(s / 60)}m ${s % 60}s` : `resets in ${s}s`),
    catRequests: "Requests",
    catTokens: "Tokens",
    catInputTokens: "Input tokens",
    catOutputTokens: "Output tokens",
    modelFast: "fast",
    modelHigh: "high quality",
    effortLow: "fastest",
    effortXHigh: "best quality",
    loginSub: "Log in to continue.",
    loginError: "Incorrect username or password.",
    loginUser: "Username",
    loginPass: "Password",
    loginBtn: "Log in",
  },
};

// ── 서버 파이프라인 문자열(SSE 진행 메시지 · LLM 프롬프트 스캐폴딩 · 키포인트 라벨) ──
type PipelineDict = {
  // SSE substatus / skip 메시지(사용자에게 직접 표시)
  crawling: string;
  collected: (n: number) => string;
  notesSkip: string;
  structuring: string;
  buildingPptx: string;
  demoInfo: string;
  // LLM 프롬프트 스캐폴딩(시스템 프롬프트에 덧붙이는 언어 지시 + 사용자 메시지 골격)
  langDirective: string;
  pageLabel: (i: number, title: string) => string;
  noCrawl: string;
  userStage1: (company: string, url: string, corpus: string) => string;
  userStage2: (research: string, notes: string) => string;
  userStage3: (research: string, painpoints: string) => string;
  specSystem: string;
  userSpec: (analysis: string, company: string, url: string) => string;
  // 키포인트 라벨
  kp: {
    title: string;
    platform: string;
    message: string;
    structure: string;
    challenge: string;
    direction: string;
    pilot: string;
    kpi: string;
  };
  specFail: (stop: string) => string;
};

export const PIPELINE: Record<Lang, PipelineDict> = {
  ko: {
    crawling: "자체 검색봇이 사이트를 수집 중…",
    collected: (n) => `수집 ${n}개 페이지 → 분석/작성 중…`,
    notesSkip: "회의록 미입력 — 공개정보 추론만 사용",
    structuring: "스토리라인 사양 구조화(JSON) 추출 중…",
    buildingPptx: "PowerPoint(.pptx) 생성 중…",
    demoInfo: "ANTHROPIC_API_KEY 미설정 → DEMO 모드(워크드 안다르 산출물 재생). 스트리밍/조립 경로는 실제 동작합니다.",
    langDirective: "",
    pageLabel: (i, title) => `## [페이지 ${i}] ${title}`,
    noCrawl: "(검색봇이 사이트에 접근하지 못했습니다.)",
    userStage1: (company, url, corpus) =>
      `회사명: ${company}\n홈페이지 URL: ${url}\n\n` +
      "아래는 **자체 검색봇이 수집한 공개 페이지 본문**이다(웹 검색 도구 미사용). 이 수집 자료에만 근거해 STAGE 1 산출 문서를 마크다운으로 작성하라. " +
      "자료로 확인되지 않는 항목은 '이번 조사 범위에서 확인하지 못함'으로 명시하라.\n\n# 수집 자료\n" +
      corpus,
    userStage2: (research, notes) =>
      `# STAGE 1 리서치\n${research}\n\n# 회의록/메모 원본\n${notes}\n\n위 자료로 STAGE 2 회의록 분석 문서를 마크다운으로 작성하라.`,
    userStage3: (research, painpoints) =>
      `# STAGE 1 리서치\n${research}\n\n` +
      (painpoints ? `# STAGE 2 회의록 분석\n${painpoints}\n\n` : "") +
      "위 자료를 통합해 STAGE 3 종합 분석 문서를 마크다운으로 작성하라. 문서 끝에 반드시 '▶ STORYLINE SPEC' 블록을 포함하라.",
    specSystem:
      "너는 리터니즈 제안서 조립기다. 아래 종합 분석 문서에서 STORYLINE SPEC을 구조화 추출하라. " +
      "리터니즈 운영 수치(CAPA 6,000건/일 등)는 발명하지 말고, 고객사 미확보 수치는 만들지 마라. " +
      "회사명/플랫폼은 분석에서 확인된 값을 쓰라.",
    userSpec: (analysis, company, url) => `# 종합 분석\n${analysis}\n\n회사명: ${company} / 홈페이지: ${url}`,
    kp: {
      title: "제안 제목",
      platform: "커머스 플랫폼",
      message: "핵심 메시지",
      structure: "고객 구조",
      challenge: "핵심 과제",
      direction: "제안 방향",
      pilot: "1순위 파일럿",
      kpi: "부서별 KPI",
    },
    specFail: (stop) => `스토리라인 사양 구조화 실패 (stop_reason=${stop})`,
  },
  en: {
    crawling: "In-house bot is crawling the site…",
    collected: (n) => `Collected ${n} pages → analyzing/writing…`,
    notesSkip: "No notes provided — using public-research inference only",
    structuring: "Extracting structured storyline spec (JSON)…",
    buildingPptx: "Generating PowerPoint (.pptx)…",
    demoInfo:
      "ANTHROPIC_API_KEY not set → DEMO mode (replaying worked Andar output). The streaming/assembly path runs for real.",
    langDirective:
      "\n\n=== OUTPUT LANGUAGE ===\nWrite the ENTIRE output document in natural, professional English. " +
      "Every heading, sentence, label, and bullet must be in English. Do not output Korean.",
    pageLabel: (i, title) => `## [Page ${i}] ${title}`,
    noCrawl: "(The bot could not reach the site.)",
    userStage1: (company, url, corpus) =>
      `Company: ${company}\nHomepage URL: ${url}\n\n` +
      "Below is the **public page text collected by our in-house crawler** (no web-search tool used). Based ONLY on this collected material, write the STAGE 1 output document in Markdown, in English. " +
      "For anything the material does not confirm, explicitly state 'not confirmed within the scope of this research'.\n\n# Collected material\n" +
      corpus,
    userStage2: (research, notes) =>
      `# STAGE 1 Research\n${research}\n\n# Raw meeting notes/memo\n${notes}\n\nUsing the above, write the STAGE 2 notes-analysis document in Markdown, in English.`,
    userStage3: (research, painpoints) =>
      `# STAGE 1 Research\n${research}\n\n` +
      (painpoints ? `# STAGE 2 Notes Analysis\n${painpoints}\n\n` : "") +
      "Integrate the above into the STAGE 3 synthesis document in Markdown, in English. The document MUST end with a '▶ STORYLINE SPEC' block.",
    specSystem:
      "You are the Returneeds proposal assembler. Extract the STORYLINE SPEC, structured, from the synthesis document below. " +
      "Do NOT invent Returneeds operating figures (e.g., CAPA 6,000 units/day), and do NOT fabricate client figures that are unconfirmed. " +
      "Use the company name/platform as confirmed in the analysis. Write ALL field values in natural, professional English.",
    userSpec: (analysis, company, url) => `# Synthesis\n${analysis}\n\nCompany: ${company} / Homepage: ${url}`,
    kp: {
      title: "Proposal title",
      platform: "Commerce platform",
      message: "Core message",
      structure: "Customer profile",
      challenge: "Core challenge",
      direction: "Proposed direction",
      pilot: "Priority pilot",
      kpi: "KPIs by team",
    },
    specFail: (stop) => `Failed to structure storyline spec (stop_reason=${stop})`,
  },
};
