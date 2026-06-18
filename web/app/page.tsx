"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type SearchItem =
  | { type: "query"; query: string }
  | { type: "result"; count: number; titles: string[] }
  | { type: "page"; url: string; title: string; chars: number; ok: boolean };
type StageState = {
  status: "" | "run" | "done" | "skip";
  sub: string;
  text: string;
  search: SearchItem[];
  artifacts: string[];
  startedAt?: number;
  endedAt?: number;
};
const STAGES = [
  { n: 1, icon: "🔎", title: "공개정보 리서치", judge: false },
  { n: 2, icon: "🧩", title: "페인포인트 추론", judge: true },
  { n: 3, icon: "🧭", title: "스토리라인 설계", judge: true },
  { n: 4, icon: "📑", title: "제안서 초안 조립", judge: false },
];

// 결과를 마크다운 애니메이션으로 렌더링할 단계(① 리서치 · ③ 스토리라인).
const REVEAL_STAGES = new Set([1, 3]);

const blank = (): StageState => ({ status: "", sub: "대기", text: "", search: [], artifacts: [] });
const initSteps = (): Record<number, StageState> => ({ 1: blank(), 2: blank(), 3: blank(), 4: blank() });

// 세션 히스토리(서버 파일 저장). 목록 메타와 전체 레코드.
type SessionPage = { url: string; title: string; chars: number; ok: boolean };
type SessionMeta = {
  id: string;
  company: string;
  url: string;
  createdAt: number;
  finishedAt?: number;
  status: "running" | "done" | "error";
  error?: string;
  model: string;
  effort: string;
  demo: boolean;
  hadNotes: boolean;
  attached: string[];
  skipped: string[];
  stage: number;
  proposalName?: string;
};
type SessionFull = SessionMeta & {
  pages: SessionPage[];
  keypoints: { label: string; value: string }[];
  artifacts: Record<string, string>;
};

// 서버 레코드(완료/오류) → 단계 상태 복원.
function stepsFromRecord(r: SessionFull): Record<number, StageState> {
  const s = initSteps();
  const a = r.artifacts || {};
  const md1 = a["01_공개자료_리서치.md"];
  s[1] = {
    status: md1 != null ? "done" : "",
    sub: md1 != null ? "완료" : "",
    text: md1 || "",
    search: (r.pages || []).map((p) => ({ type: "page", url: p.url, title: p.title, chars: p.chars, ok: p.ok }) as SearchItem),
    artifacts: md1 != null ? ["01_공개자료_리서치.md"] : [],
  };
  const md2 = a["02_회의록_분석.md"];
  s[2] = md2 != null
    ? { status: "done", sub: "완료", text: md2, search: [], artifacts: ["02_회의록_분석.md"] }
    : { ...blank(), status: "skip", sub: "회의록 미입력" };
  const md3 = a["03_종합_분석.md"];
  s[3] = { status: md3 != null ? "done" : "", sub: md3 != null ? "완료" : "", text: md3 || "", search: [], artifacts: md3 != null ? ["03_종합_분석.md"] : [] };
  s[4] = { status: r.proposalName ? "done" : "", sub: r.proposalName ? "완료" : "", text: "", search: [], artifacts: r.proposalName ? [r.proposalName] : [] };
  return s;
}

// 결과 마크다운을 타자기처럼 부드럽게 드러내는 애니메이터(리서치·스토리라인 공용).
// 네트워크 버스트와 분리해, 표시 글자수(shown)가 실제 텍스트 길이를 매끄럽게 추격한다.
function MarkdownReveal({ text, running }: { text: string; running: boolean }) {
  const textRef = useRef(text);
  textRef.current = text;
  const [shown, setShown] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setShown((cur) => {
        const len = textRef.current.length;
        if (cur >= len) return cur;
        const remaining = len - cur;
        return Math.min(len, cur + Math.max(14, Math.floor(remaining * 0.14))); // 빠르게 따라잡고 끝에서 감속
      });
    }, 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const typing = shown < text.length || running;
  return (
    <div className={`research ${typing ? "typing" : ""}`} ref={boxRef}>
      <div className="md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text.slice(0, shown)}</ReactMarkdown>
      </div>
      {typing && <span className="cursor">▌</span>}
    </div>
  );
}

function fmt(ms: number): string {
  if (ms <= 0) return "0.0s";
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + "s";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function Home() {
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState<Record<number, StageState>>(initSteps());
  const [jobId, setJobId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ demo: boolean; model: string; effort: string; key: string }>({ demo: false, model: "", effort: "", key: "" });
  // 설정(브라우저 localStorage 보관, 요청마다 서버로 전송)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelSel, setModelSel] = useState("");
  const [effortSel, setEffortSel] = useState("");
  // 설정 모달의 API 잔여량(분 단위 레이트리밋) 조회 결과
  type Usage = { configured: boolean; ok?: boolean; error?: string; message?: string; retry_after?: string | null; limits?: Record<string, string> };
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const stickRef = useRef(true);
  const [error, setError] = useState("");
  const [proposalName, setProposalName] = useState("");
  const [artifacts, setArtifacts] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState<{ status: "done" | "error" } | null>(null);
  const [history, setHistory] = useState<SessionMeta[]>([]);
  const [viewer, setViewer] = useState<{ title: string; body: string } | null>(null);
  const [keypoints, setKeypoints] = useState<{ label: string; value: string }[]>([]);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [attachInfo, setAttachInfo] = useState<{ attached: string[]; skipped: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(0);
  const runStartRef = useRef(0);
  const [runEnd, setRunEnd] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  // 토큰 델타 배칭(~60ms)으로 렌더 폭주 방지.
  const bufRef = useRef<Record<number, string>>({});
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flush() {
    flushRef.current = null;
    const buf = bufRef.current;
    bufRef.current = {};
    const ks = Object.keys(buf);
    if (!ks.length) return;
    setSteps((s) => {
      const next = { ...s };
      for (const k of ks) next[+k] = { ...next[+k], text: next[+k].text + buf[+k] };
      return next;
    });
  }
  function pushDelta(stage: number, t: string) {
    bufRef.current[stage] = (bufRef.current[stage] ?? "") + t;
    if (!flushRef.current) flushRef.current = setTimeout(flush, 60);
  }

  // 설정 로드(브라우저 전용).
  useEffect(() => {
    try {
      setApiKey(localStorage.getItem("rn_apiKey") ?? "");
      setModelSel(localStorage.getItem("rn_model") ?? "");
      setEffortSel(localStorage.getItem("rn_effort") ?? "");
    } catch {
      /* localStorage 불가 환경 무시 */
    }
  }, []);

  // 서버 세션 목록 로드.
  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch("/api/sessions");
      const j = await r.json();
      setHistory(j.sessions ?? []);
    } catch {
      /* 무시 */
    }
  }, []);
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 진행 중 세션이 있으면(또는 현재 실행 중) 주기적으로 목록 갱신 — 비동기 진행 반영.
  const anyRunning = busy || history.some((h) => h.status === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(fetchSessions, 3000);
    return () => clearInterval(id);
  }, [anyRunning, fetchSessions]);

  function saveSettings() {
    try {
      if (apiKey) localStorage.setItem("rn_apiKey", apiKey);
      else localStorage.removeItem("rn_apiKey");
      localStorage.setItem("rn_model", modelSel);
      localStorage.setItem("rn_effort", effortSel);
    } catch {
      /* ignore */
    }
    setSettingsOpen(false);
  }

  // 설정 모달의 API 잔여량(분 단위 레이트리밋) 조회. 현재 입력된 키/모델 기준.
  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsage(null);
    try {
      const r = await fetch("/api/usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey || undefined, model: modelSel || undefined }),
      });
      setUsage(await r.json());
    } catch (e) {
      setUsage({ configured: true, ok: false, error: "fetch", message: String(e) });
    } finally {
      setUsageLoading(false);
    }
  }, [apiKey, modelSel]);

  // 설정 모달이 열릴 때 자동 조회.
  useEffect(() => {
    if (settingsOpen) loadUsage();
  }, [settingsOpen, loadUsage]);

  function fmtReset(v?: string): string {
    if (!v) return "";
    const t = Date.parse(v);
    if (isNaN(t)) return v;
    const s = Math.max(0, Math.round((t - Date.now()) / 1000));
    return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초 후 리셋` : `${s}초 후 리셋`;
  }

  // 라이브 경과시간 틱.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [busy]);

  // 활성/검색 박스 자동 하단 스크롤.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".term, .searchbox").forEach((el) => (el.scrollTop = el.scrollHeight));
  }, [steps]);

  // 페이지 하단 고정 스크롤: 사용자가 하단 근처에 있을 때만 생성 진행을 따라 내려간다.
  useEffect(() => {
    const onScroll = () => {
      stickRef.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (started && busy && stickRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }
  }, [steps, keypoints, started, busy]);
  useEffect(() => {
    if (started) {
      stickRef.current = true;
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }));
    }
  }, [started]);
  // 완료(다운로드 버튼)·오류 시 하단으로 이동.
  useEffect(() => {
    if (proposalName || error) requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }));
  }, [proposalName, error]);

  // 완료/오류 시점: 현재 세션의 산출물(뷰어/다운로드용)을 모으고 서버 목록을 갱신.
  // (서버 영속화는 파이프라인이 담당 — 여기선 현재 화면용 artifacts만 구성)
  useEffect(() => {
    if (!finished || !jobId) return;
    let cancelled = false;
    (async () => {
      const arts: Record<string, string> = {};
      for (const st of STAGES) {
        const nm = steps[st.n]?.artifacts[0];
        if (nm && st.n !== 4) arts[nm] = steps[st.n].text;
      }
      if (finished.status === "done") {
        try {
          arts[`${company}_제안서.html`] = await (await fetch(`/proposals/${jobId}`)).text();
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      setArtifacts(arts);
      fetchSessions();
    })();
    return () => {
      cancelled = true;
    };
    // finished 변화에만 반응. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function setStage(stage: number, patch: Partial<StageState>) {
    setSteps((s) => ({ ...s, [stage]: { ...s[stage], ...patch } }));
  }

  // 회의록 파일 추가(클릭 선택·드래그앤드롭 공용). 이름+크기로 중복 제거.
  function addFiles(list: FileList | File[]) {
    setPickedFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}::${f.size}`));
      const next = [...prev];
      for (const f of Array.from(list)) {
        const k = `${f.name}::${f.size}`;
        if (!seen.has(k)) {
          seen.add(k);
          next.push(f);
        }
      }
      return next;
    });
  }
  function removeFile(i: number) {
    setPickedFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function contentFor(name: string): string | null {
    if (artifacts[name] != null) return artifacts[name];
    for (const st of STAGES) if (steps[st.n]?.artifacts[0] === name) return steps[st.n].text;
    return null;
  }

  // 진행 중 세션 → 라이브 스트림에 다시 붙는다.
  function watchLive(m: SessionMeta) {
    esRef.current?.close();
    setError("");
    setStarted(true);
    setBusy(true);
    setCompany(m.company);
    setUrl(m.url);
    setSteps(initSteps());
    setKeypoints([]);
    setArtifacts({});
    setProposalName("");
    setFinished(null);
    setMeta({ demo: m.demo, model: m.model, effort: m.effort, key: "" });
    setJobId(m.id);
    runStartRef.current = m.createdAt;
    setRunEnd(0);
    attachStream(m.id, m.company);
    requestAnimationFrame(() => document.querySelector(".pipemap")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // 완료/오류 세션 → 서버 전체 레코드로 복원.
  async function restoreSession(m: SessionMeta) {
    esRef.current?.close();
    let r: SessionFull | null = null;
    try {
      r = (await (await fetch(`/api/sessions/${m.id}`)).json()) as SessionFull;
    } catch {
      /* ignore */
    }
    if (!r) return;
    setBusy(false);
    setError(r.status === "error" ? "오류: " + (r.error || "") : "");
    setStarted(true);
    setCompany(r.company);
    setUrl(r.url);
    setSteps(stepsFromRecord(r));
    setKeypoints(r.keypoints || []);
    setAttachInfo(r.attached?.length || r.skipped?.length ? { attached: r.attached, skipped: r.skipped } : null);
    setMeta({ demo: r.demo, model: r.model, effort: r.effort, key: "" });
    setArtifacts(r.artifacts || {});
    setJobId(r.id);
    setProposalName(r.proposalName || "");
    setFinished(null);
    runStartRef.current = r.createdAt;
    setRunEnd(r.finishedAt || r.createdAt);
    stickRef.current = false;
    requestAnimationFrame(() => document.querySelector(".pipemap")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openSession(m: SessionMeta) {
    if (m.status === "running") watchLive(m);
    else restoreSession(m);
  }

  async function deleteSession(id: string) {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
    fetchSessions();
  }

  function openProposal() {
    const html = artifacts[proposalName];
    if (html) {
      const u = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(u, "_blank");
      setTimeout(() => URL.revokeObjectURL(u), 60000);
    } else {
      window.open(`/proposals/${jobId}`, "_blank");
    }
  }
  function downloadHtml() {
    const html = artifacts[proposalName];
    if (!html) return;
    const u = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = proposalName || "proposal.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
  }

  function viewArtifact(name: string) {
    const body = contentFor(name);
    if (body != null) setViewer({ title: name, body });
  }

  // 작업 SSE 스트림에 연결(신규 생성·진행 중 세션 재관전 공용).
  function attachStream(id: string, companyName: string) {
    const es = new EventSource(`/api/jobs/${id}/stream`);
    esRef.current = es;
    es.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      switch (d.kind) {
        case "stage_start":
          if (!runStartRef.current) runStartRef.current = Date.now();
          setStage(d.stage, { status: "run", sub: "생성 중…", startedAt: Date.now() });
          break;
        case "delta":
          pushDelta(d.stage, d.text);
          break;
        case "search":
          setSteps((s) => ({ ...s, [d.stage]: { ...s[d.stage], search: [...s[d.stage].search, d as SearchItem] } }));
          break;
        case "substatus":
          setStage(d.stage, { sub: d.text });
          break;
        case "keypoints":
          setKeypoints(d.items);
          break;
        case "stage_done":
          setStage(d.stage, { status: "done", sub: "완료", endedAt: Date.now(), artifacts: d.artifact ? [d.artifact] : [] });
          break;
        case "stage_skip":
          setStage(d.stage, { status: "skip", sub: d.reason || "건너뜀" });
          break;
        case "error":
          setError("오류: " + d.message);
          es.close();
          setBusy(false);
          setRunEnd(Date.now());
          setFinished({ status: "error" });
          fetchSessions();
          break;
        case "done":
          setProposalName(`${companyName}_제안서.html`);
          es.close();
          setBusy(false);
          setRunEnd(Date.now());
          setFinished({ status: "done" });
          fetchSessions();
          break;
      }
    };
    es.onerror = () => es.close();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStarted(true);
    setError("");
    setProposalName("");
    setArtifacts({});
    setFinished(null);
    setViewer(null);
    setSteps(initSteps());
    setKeypoints([]);
    setAttachInfo(null);
    bufRef.current = {};
    setRunEnd(0);
    runStartRef.current = Date.now();
    setNow(Date.now());
    esRef.current?.close();

    const fd = new FormData();
    fd.set("company", company);
    fd.set("url", url);
    fd.set("notes", notes);
    if (apiKey) fd.set("apiKey", apiKey);
    if (modelSel) fd.set("model", modelSel);
    if (effortSel) fd.set("effort", effortSel);
    for (const f of pickedFiles) fd.append("files", f);
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    if (!res.ok) {
      setError("시작 실패: " + (await res.text()));
      setBusy(false);
      return;
    }
    const j = await res.json();
    setJobId(j.job_id);
    setMeta({ demo: j.demo_mode, model: j.model, effort: j.effort, key: j.key_source ?? "" });
    setAttachInfo({ attached: j.attached ?? [], skipped: j.skipped ?? [] });
    attachStream(j.job_id, company);
    fetchSessions(); // 진행 중 세션이 히스토리에 즉시 노출되도록
  }

  // 파생 계측값
  const totalChars = Object.values(steps).reduce((a, s) => a + s.text.length, 0);
  const totalSearches = Object.values(steps).reduce((a, s) => a + s.search.filter((x) => x.type === "query").length, 0);
  const elapsed = started ? (busy ? now : runEnd || now) - runStartRef.current : 0;
  const doneCount = Object.values(steps).filter((s) => s.status === "done" || s.status === "skip").length;
  const collectedPages = Object.values(steps)
    .flatMap((s) => s.search)
    .filter((x): x is { type: "page"; url: string; title: string; chars: number; ok: boolean } => x.type === "page" && x.ok);

  return (
    <div className="wrap">
      <div className="screen1">
      <button type="button" className="gear corner" onClick={() => setSettingsOpen(true)}>
        ⚙ 설정{apiKey ? <span className="keydot" title="API 키 설정됨" /> : null}
      </button>
      <a href="/api/logout" className="gear corner logout">로그아웃</a>
      <div className="hero">
        <h1 className="logo">리터니즈 <span>제안서 자동 생성</span></h1>
        <p className="tagline">회사명과 홈페이지 URL만 넣으면 리서치 · 페인포인트 · 스토리라인 · 제안서까지 자동 완주</p>
        <form onSubmit={onSubmit} className="heroform">
          <div className="searchbox2">
            <input className="q" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사명 (예: 안다르)" required />
            <span className="divider2" />
            <input className="q" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="홈페이지 URL (https://…)" required />
          </div>
          <button type="button" className="adv" onClick={() => setAdvOpen((v) => !v)}>
            {advOpen ? "– 회의록 첨부 닫기" : "＋ 회의록 첨부 (선택)"}
          </button>
          {advOpen && (
            <div className="advbox">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="회의록/메일/메모를 붙여넣으세요. 페인포인트 추론(STAGE 2)에 반영됩니다." />
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".txt,.md,.markdown,.csv,.tsv,.json,.log,.html,.htm,.docx"
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div
                className={`dropzone ${dragOver ? "over" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
                }}
              >
                파일을 끌어다 놓거나 <span className="browse">클릭해서 선택</span>
                <div className="fhint">지원: txt · md · csv · tsv · json · log · html · docx — 텍스트로 추출해 STAGE 2에 반영</div>
              </div>
              {pickedFiles.length > 0 && (
                <div className="files">
                  {pickedFiles.map((f, i) => (
                    <span className="filechip" key={`${f.name}-${i}`}>
                      📎 {f.name}
                      <span className="rm" title="제거" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <button type="submit" className="cta" disabled={busy}>
            {busy ? "진행 중…" : "제안서 생성 시작"}
          </button>
        </form>

        {history.length > 0 && (
          <div className="histwrap">
            <div className="histtitle">세션 히스토리 <span className="muted">· 서버 저장</span></div>
            <ul className="histlist">
              {history.map((h) => (
                <li key={h.id} className={h.status} onClick={() => openSession(h)}>
                  <span className={`hdot ${h.status}`} />
                  <span className="hco">{h.company}</span>
                  <span className="hurl">{h.url}</span>
                  <span className="htime">
                    {h.status === "running" ? (
                      <span className="hrun">진행 중 {Math.min(h.stage, 4)}/4 ▸ 관전</span>
                    ) : (
                      <>
                        {new Date(h.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {h.status === "done" && h.finishedAt ? ` · ${fmt(h.finishedAt - h.createdAt)}` : ""}
                        {h.status === "error" ? " · 오류" : ""}
                      </>
                    )}
                  </span>
                  <span className="hdel" title="삭제" onClick={(e) => { e.stopPropagation(); deleteSession(h.id); }}>✕</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>{/* /screen1 */}

      {started && (
        <>
          {/* 파이프라인 다이어그램 */}
          <div className="pipemap">
            {STAGES.map((st, i) => {
              const s = steps[st.n];
              return (
                <div className="pmwrap" key={st.n}>
                  <div className={`pmnode ${s.status}`}>
                    <div className="pmcircle">{s.status === "done" ? "✓" : s.status === "skip" ? "–" : st.icon}</div>
                    <div className="pmlabel">{st.title}</div>
                    <div className="pmtime">
                      {s.status === "run" && s.startedAt ? fmt(now - s.startedAt) : ""}
                      {(s.status === "done" || s.status === "skip") && s.startedAt && s.endedAt ? fmt(s.endedAt - s.startedAt) : ""}
                    </div>
                  </div>
                  {i < STAGES.length - 1 && <div className={`pmline ${s.status === "done" || s.status === "skip" ? "fill" : ""}`} />}
                </div>
              );
            })}
          </div>

          {/* 계측 HUD */}
          <div className="hud">
            <div className="chip"><span className="k">경과</span><span className="v">{fmt(elapsed)}</span></div>
            <div className="chip"><span className="k">단계</span><span className="v">{doneCount}/4</span></div>
            <div className="chip"><span className="k">생성</span><span className="v">{totalChars.toLocaleString()}자</span></div>
            <div className="chip"><span className="k">웹검색</span><span className="v">{totalSearches}회</span></div>
            <div className="chip alt"><span className="k">모델</span><span className="v">{meta.model || "—"}</span></div>
            <div className="chip alt"><span className="k">effort</span><span className="v">{meta.effort || "—"}</span></div>
            <div className="chip alt"><span className="k">키</span><span className="v">{meta.key || "—"}</span></div>
            {busy && <div className="chip live"><span className="dotlive" /> LIVE</div>}
          </div>

          {meta.demo && <div className="demo">DEMO 모드: 워크드 안다르 산출물을 스트리밍으로 재생합니다(API 키 미설정).</div>}
          {attachInfo && (attachInfo.attached.length > 0 || attachInfo.skipped.length > 0) && (
            <div className="attach">
              {attachInfo.attached.length > 0 && <>📎 첨부 회의록 {attachInfo.attached.length}건 반영 ({attachInfo.attached.join(", ")})</>}
              {attachInfo.skipped.length > 0 && <span className="skip"> · 미지원 {attachInfo.skipped.length}건 제외 ({attachInfo.skipped.join(", ")})</span>}
            </div>
          )}

          {/* 본문: 좌측 스테이지 스트리밍 / 우측 주요 포인트 정리 */}
          <div className="cols">
          <div className="colmain">
          <div className="stagewrap">
            {STAGES.map((st) => {
              const s = steps[st.n];
              if (s.status === "") return <div className="scard pending" key={st.n}><div className="schead"><span className="sico">{st.icon}</span><span className="stitle">{st.title}</span><span className="sstat">대기</span></div></div>;
              return (
                <div className={`scard ${s.status}`} key={st.n}>
                  <div className="schead">
                    <span className="sico">{s.status === "done" ? "✓" : s.status === "skip" ? "–" : st.icon}</span>
                    <span className="stitle">
                      {st.title}
                      {st.judge && <span className="muted"> · 판단 레이어</span>}
                    </span>
                    <span className="sstat">{s.sub}</span>
                  </div>

                  {s.search.length > 0 && (
                    <div className="searchbox">
                      {s.search.map((it, idx) =>
                        it.type === "page" ? (
                          <div className="sq" key={idx}>
                            <span className={`qchip ${it.ok ? "" : "fail"}`}>{it.ok ? "🌐" : "⚠"} {it.title || it.url}</span>
                            {it.ok && <span className="pgmeta">{it.chars.toLocaleString()}자 · {it.url}</span>}
                          </div>
                        ) : it.type === "query" ? (
                          <div className="sq" key={idx}><span className="qchip">🔎 {it.query}</span></div>
                        ) : (
                          <div className="sr" key={idx}>└ 결과 {it.count}건{it.titles.length ? ` · ${it.titles.join(" · ")}` : ""}</div>
                        ),
                      )}
                    </div>
                  )}

                  {/* 리서치·스토리라인: 결과를 마크다운으로 렌더링하며 타자기 애니메이션(완료 후에도 유지) */}
                  {REVEAL_STAGES.has(st.n) && s.text && <MarkdownReveal text={s.text} running={s.status === "run"} />}

                  {/* 그 외 단계: 진행 중 raw 터미널 스트리밍 */}
                  {!REVEAL_STAGES.has(st.n) && s.text && s.status === "run" && (
                    <pre className="term">{s.text}<span className="cursor">▌</span></pre>
                  )}

                  {s.status === "done" && s.artifacts.map((a) => (
                    <button className="viewbtn" key={a} onClick={() => viewArtifact(a)}>📄 {a} 렌더링 보기</button>
                  ))}
                </div>
              );
            })}
          </div>{/* /stagewrap */}
          </div>{/* /colmain */}

          <aside className="colside">
            <div className="kp">
              <div className="kphead">🎯 주요 포인트</div>

              <div className="kpsec">
                <div className="kplabel">대상</div>
                <div className="kpval">{company || "—"}</div>
                <div className="kpmeta">{meta.model || "—"} · effort {meta.effort || "—"}</div>
              </div>

              {collectedPages.length > 0 && (
                <div className="kpsec">
                  <div className="kplabel">검색봇 수집 페이지 ({collectedPages.length})</div>
                  <div className="kpchips">
                    {collectedPages.map((p, i) => (
                      <span className="kpchip" key={i} title={p.url}>{p.title || p.url}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="kpsec">
                <div className="kplabel">핵심 포인트</div>
                {keypoints.length === 0 ? (
                  <div className="kpempty">스토리라인 설계 완료 시 정리됩니다…</div>
                ) : (
                  <ul className="kplist">
                    {keypoints.map((k, i) => (
                      <li key={i} style={{ animationDelay: `${i * 70}ms` }}>
                        <span className="kpk">{k.label}</span>
                        <span className="kpv">{k.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
          </div>{/* /cols */}

          {error && <div className="card err">{error}</div>}
        </>
      )}

      {proposalName && (
        <div className="card result">
          <div className="resulttitle">✅ 제안서 초안 완성 <span className="muted">· 총 {fmt(elapsed)}</span></div>
          <div className="dlrow">
            <button type="button" className="open" onClick={openProposal}>제안서 열기 (HTML) →</button>
            <a className="dl" href={`/api/jobs/${jobId}/pptx`}>⬇ PowerPoint(.pptx) 다운로드</a>
            <button type="button" className="dl" onClick={downloadHtml}>⬇ HTML 다운로드</button>
          </div>
          <div className="hint">HTML은 브라우저 인쇄(⌘P) → ‘PDF로 저장’으로도 내보낼 수 있고, PPTX는 파워포인트/Keynote/Google 슬라이드에서 바로 편집할 수 있습니다. (PPTX는 해당 세션이 서버에 남아 있을 때 받을 수 있습니다.)</div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal" onClick={() => setSettingsOpen(false)}>
          <div className="modalbox set" onClick={(e) => e.stopPropagation()}>
            <div className="modalhead">
              <span>⚙ 설정</span>
              <span className="x" onClick={() => setSettingsOpen(false)}>닫기 ✕</span>
            </div>
            <div className="setbody">
              <div className="field">
                <label>Anthropic API 키</label>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-... (비우면 서버 .env 키 사용)" autoComplete="off" />
                <div className="fhint">브라우저(localStorage)에만 저장되고 요청 시 서버로 전송됩니다. 비우면 서버 .env의 키를 사용하며, 키가 전혀 없으면 DEMO 모드로 동작합니다.</div>
              </div>
              <div className="row">
                <div className="field">
                  <label>모델</label>
                  <select value={modelSel} onChange={(e) => setModelSel(e.target.value)}>
                    <option value="">서버 기본값(.env)</option>
                    <option value="claude-sonnet-4-6">claude-sonnet-4-6 (빠름)</option>
                    <option value="claude-opus-4-8">claude-opus-4-8 (고품질)</option>
                    <option value="claude-opus-4-7">claude-opus-4-7</option>
                  </select>
                </div>
                <div className="field">
                  <label>effort (속도/품질)</label>
                  <select value={effortSel} onChange={(e) => setEffortSel(e.target.value)}>
                    <option value="">서버 기본값(.env)</option>
                    <option value="low">low (가장 빠름)</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="xhigh">xhigh (최고 품질)</option>
                  </select>
                </div>
              </div>
              <div className="setbtns">
                <button type="button" onClick={saveSettings}>저장</button>
                <button type="button" className="ghost" onClick={() => { setApiKey(""); setModelSel(""); setEffortSel(""); }}>초기화</button>
              </div>

              <div className="field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>API 잔여량 (분 단위 레이트리밋)</span>
                  <button type="button" className="ghost" style={{ padding: "2px 10px", fontSize: 12 }} onClick={loadUsage} disabled={usageLoading}>
                    {usageLoading ? "조회 중…" : "새로고침"}
                  </button>
                </label>
                {usageLoading && <div className="fhint">조회 중…</div>}
                {!usageLoading && usage && (
                  !usage.configured ? (
                    <div className="fhint">API 키가 설정되어 있지 않습니다 (DEMO 모드).</div>
                  ) : (() => {
                    const L = usage.limits || {};
                    const cats: [string, string][] = [["requests", "요청"], ["tokens", "토큰"], ["input-tokens", "입력 토큰"], ["output-tokens", "출력 토큰"]];
                    const rows = cats.filter(([k]) => L[`${k}-remaining`] !== undefined || L[`${k}-limit`] !== undefined);
                    return (
                      <>
                        {!usage.ok && (
                          <div className="fhint" style={{ color: "#c0392b", fontWeight: 700 }}>
                            ⚠️ {usage.error === "rate_limit"
                              ? `레이트리밋 도달${usage.retry_after ? ` · ${usage.retry_after}초 후 재시도 가능` : ""}`
                              : (usage.message || usage.error || "오류")}
                          </div>
                        )}
                        {rows.length === 0 ? (
                          <div className="fhint">레이트리밋 정보를 가져오지 못했습니다.</div>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 6 }}>
                            <tbody>
                              {rows.map(([k, label]) => {
                                const rem = L[`${k}-remaining`];
                                const lim = L[`${k}-limit`];
                                const reset = L[`${k}-reset`];
                                const r = Number(rem), l = Number(lim);
                                const pct = !isNaN(r) && !isNaN(l) && l > 0 ? Math.max(0, Math.min(100, Math.round((r / l) * 100))) : null;
                                return (
                                  <tr key={k} style={{ borderBottom: "1px solid #e3e5e7" }}>
                                    <td style={{ padding: "8px 0", fontWeight: 700, width: 84, verticalAlign: "top" }}>{label}</td>
                                    <td style={{ padding: "8px 0", verticalAlign: "top" }}>
                                      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{rem === undefined ? "?" : Number(rem).toLocaleString()}</span>
                                      {" / "}{lim === undefined ? "?" : Number(lim).toLocaleString()}
                                      {pct !== null && (
                                        <div style={{ height: 6, borderRadius: 4, background: "#eef0f1", marginTop: 6, overflow: "hidden" }}>
                                          <i style={{ display: "block", height: "100%", width: `${pct}%`, background: "#18883B" }} />
                                        </div>
                                      )}
                                      {reset && <div style={{ color: "#6b7280", fontSize: 11.5, marginTop: 4 }}>{fmtReset(reset)}</div>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </>
                    );
                  })()
                )}
                <div className="fhint">Anthropic은 키의 월 잔액·한도를 API로 제공하지 않아 분 단위 레이트리밋 잔여치만 표시합니다.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <div className="modal" onClick={() => setViewer(null)}>
          <div className="modalbox" onClick={(e) => e.stopPropagation()}>
            <div className="modalhead">
              <span>{viewer.title}</span>
              <span className="x" onClick={() => setViewer(null)}>닫기 ✕</span>
            </div>
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewer.body}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
