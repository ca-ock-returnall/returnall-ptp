"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Lang, UI, proposalFileName } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

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
// 단계 메타(아이콘·판단 레이어 여부). 제목은 언어 사전(t)에서 가져온다.
const STAGES = [
  { n: 1, icon: "🔎", key: "stage1" as const, judge: false },
  { n: 2, icon: "🧩", key: "stage2" as const, judge: true },
  { n: 3, icon: "🧭", key: "stage3" as const, judge: true },
  { n: 4, icon: "📑", key: "stage4" as const, judge: false },
];
type T = (typeof UI)[Lang];
const stageTitle = (t: T, key: (typeof STAGES)[number]["key"]) => t[key];

// 결과를 마크다운 애니메이션으로 렌더링할 단계(① 리서치 · ③ 스토리라인).
const REVEAL_STAGES = new Set([1, 3]);

const blank = (): StageState => ({ status: "", sub: "", text: "", search: [], artifacts: [] });
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

// 서버 레코드(완료/오류) → 단계 상태 복원. 산출물 키는 "01_"/"02_"/"03_" 접두로 매칭해 언어 무관.
function stepsFromRecord(r: SessionFull, t: T): Record<number, StageState> {
  const s = initSteps();
  const a = r.artifacts || {};
  const findKey = (prefix: string) => Object.keys(a).find((k) => k.startsWith(prefix));
  const k1 = findKey("01_");
  s[1] = {
    status: k1 ? "done" : "",
    sub: k1 ? t.doneStat : "",
    text: k1 ? a[k1] : "",
    search: (r.pages || []).map((p) => ({ type: "page", url: p.url, title: p.title, chars: p.chars, ok: p.ok }) as SearchItem),
    artifacts: k1 ? [k1] : [],
  };
  const k2 = findKey("02_");
  s[2] = k2
    ? { status: "done", sub: t.doneStat, text: a[k2], search: [], artifacts: [k2] }
    : { ...blank(), status: "skip", sub: t.notesMissing };
  const k3 = findKey("03_");
  s[3] = { status: k3 ? "done" : "", sub: k3 ? t.doneStat : "", text: k3 ? a[k3] : "", search: [], artifacts: k3 ? [k3] : [] };
  s[4] = { status: r.proposalName ? "done" : "", sub: r.proposalName ? t.doneStat : "", text: "", search: [], artifacts: r.proposalName ? [r.proposalName] : [] };
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
  const [lang, setLang] = useLang();
  const t = UI[lang];
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
  function pushDelta(stage: number, text: string) {
    bufRef.current[stage] = (bufRef.current[stage] ?? "") + text;
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
    const ts = Date.parse(v);
    if (isNaN(ts)) return v;
    const s = Math.max(0, Math.round((ts - Date.now()) / 1000));
    return t.resetIn(s);
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
          arts[proposalName || proposalFileName(company, lang)] = await (await fetch(`/proposals/${jobId}`)).text();
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
    setError(r.status === "error" ? t.errPrefix + (r.error || "") : "");
    setStarted(true);
    setCompany(r.company);
    setUrl(r.url);
    setSteps(stepsFromRecord(r, t));
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
          setStage(d.stage, { status: "run", sub: t.generating, startedAt: Date.now() });
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
          setStage(d.stage, { status: "done", sub: t.doneStat, endedAt: Date.now(), artifacts: d.artifact ? [d.artifact] : [] });
          break;
        case "stage_skip":
          setStage(d.stage, { status: "skip", sub: d.reason || t.skipped });
          break;
        case "error":
          setError(t.errPrefix + d.message);
          es.close();
          setBusy(false);
          setRunEnd(Date.now());
          setFinished({ status: "error" });
          fetchSessions();
          break;
        case "done":
          setProposalName(d.proposal || proposalFileName(companyName, lang));
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
    fd.set("lang", lang);
    if (apiKey) fd.set("apiKey", apiKey);
    if (modelSel) fd.set("model", modelSel);
    if (effortSel) fd.set("effort", effortSel);
    for (const f of pickedFiles) fd.append("files", f);
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    if (!res.ok) {
      setError(t.startFail + (await res.text()));
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
      <div className="topbar">
        <button type="button" className="gear lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")} title={t.langName}>
          🌐 {t.langName}
        </button>
        <a href="/api/logout" className="gear logout">{t.logout}</a>
        <button type="button" className="gear" onClick={() => setSettingsOpen(true)}>
          {t.settings}{apiKey ? <span className="keydot" title={t.keySet} /> : null}
        </button>
      </div>
      <div className="hero">
        <h1 className="logo">{t.logoMain} <span>{t.logoSub}</span></h1>
        <p className="tagline">{t.tagline}</p>
        <form onSubmit={onSubmit} className="heroform">
          <div className="searchbox2">
            <input className="q" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.phCompany} required />
            <span className="divider2" />
            <input className="q" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.phUrl} required />
          </div>
          <button type="button" className="adv" onClick={() => setAdvOpen((v) => !v)}>
            {advOpen ? t.attachClose : t.attachOpen}
          </button>
          {advOpen && (
            <div className="advbox">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.phNotes} />
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
                {t.dropPrefix}<span className="browse">{t.dropBrowse}</span>
                <div className="fhint">{t.dropHint}</div>
              </div>
              {pickedFiles.length > 0 && (
                <div className="files">
                  {pickedFiles.map((f, i) => (
                    <span className="filechip" key={`${f.name}-${i}`}>
                      📎 {f.name}
                      <span className="rm" title={t.remove} onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <button type="submit" className="cta" disabled={busy}>
            {busy ? t.ctaBusy : t.ctaStart}
          </button>
        </form>

        {history.length > 0 && (
          <div className="histwrap">
            <div className="histtitle">{t.histTitle} <span className="muted">{t.histSaved}</span></div>
            <ul className="histlist">
              {history.map((h) => (
                <li key={h.id} className={h.status} onClick={() => openSession(h)}>
                  <span className={`hdot ${h.status}`} />
                  <span className="hco">{h.company}</span>
                  <span className="hurl">{h.url}</span>
                  <span className="htime">
                    {h.status === "running" ? (
                      <span className="hrun">{t.histWatch(h.stage)}</span>
                    ) : (
                      <>
                        {new Date(h.createdAt).toLocaleString(t.locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {h.status === "done" && h.finishedAt ? ` · ${fmt(h.finishedAt - h.createdAt)}` : ""}
                        {h.status === "error" ? t.histError : ""}
                      </>
                    )}
                  </span>
                  <span className="hdel" title={t.del} onClick={(e) => { e.stopPropagation(); deleteSession(h.id); }}>✕</span>
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
                    <div className="pmlabel">{stageTitle(t, st.key)}</div>
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
            <div className="chip"><span className="k">{t.hudElapsed}</span><span className="v">{fmt(elapsed)}</span></div>
            <div className="chip"><span className="k">{t.hudStage}</span><span className="v">{doneCount}/4</span></div>
            <div className="chip"><span className="k">{t.hudGen}</span><span className="v">{t.charsUnit(totalChars.toLocaleString())}</span></div>
            <div className="chip"><span className="k">{t.hudSearch}</span><span className="v">{t.searchUnit(totalSearches)}</span></div>
            <div className="chip alt"><span className="k">{t.hudModel}</span><span className="v">{meta.model || t.dash}</span></div>
            <div className="chip alt"><span className="k">{t.hudEffort}</span><span className="v">{meta.effort || t.dash}</span></div>
            <div className="chip alt"><span className="k">{t.hudKey}</span><span className="v">{meta.key || t.dash}</span></div>
            {busy && <div className="chip live"><span className="dotlive" /> LIVE</div>}
          </div>

          {meta.demo && <div className="demo">{t.demoBanner}</div>}
          {attachInfo && (attachInfo.attached.length > 0 || attachInfo.skipped.length > 0) && (
            <div className="attach">
              {attachInfo.attached.length > 0 && <>{t.attachApplied(attachInfo.attached.length, attachInfo.attached.join(", "))}</>}
              {attachInfo.skipped.length > 0 && <span className="skip">{t.attachSkipped(attachInfo.skipped.length, attachInfo.skipped.join(", "))}</span>}
            </div>
          )}

          {/* 본문: 좌측 스테이지 스트리밍 / 우측 주요 포인트 정리 */}
          <div className="cols">
          <div className="colmain">
          <div className="stagewrap">
            {STAGES.map((st) => {
              const s = steps[st.n];
              if (s.status === "") return <div className="scard pending" key={st.n}><div className="schead"><span className="sico">{st.icon}</span><span className="stitle">{stageTitle(t, st.key)}</span><span className="sstat">{t.waiting}</span></div></div>;
              return (
                <div className={`scard ${s.status}`} key={st.n}>
                  <div className="schead">
                    <span className="sico">{s.status === "done" ? "✓" : s.status === "skip" ? "–" : st.icon}</span>
                    <span className="stitle">
                      {stageTitle(t, st.key)}
                      {st.judge && <span className="muted">{t.judgeLayer}</span>}
                    </span>
                    <span className="sstat">{s.sub}</span>
                  </div>

                  {s.search.length > 0 && (
                    <div className="searchbox">
                      {s.search.map((it, idx) =>
                        it.type === "page" ? (
                          <div className="sq" key={idx}>
                            <span className={`qchip ${it.ok ? "" : "fail"}`}>{it.ok ? "🌐" : "⚠"} {it.title || it.url}</span>
                            {it.ok && <span className="pgmeta">{t.charsUnit(it.chars.toLocaleString())} · {it.url}</span>}
                          </div>
                        ) : it.type === "query" ? (
                          <div className="sq" key={idx}><span className="qchip">🔎 {it.query}</span></div>
                        ) : (
                          <div className="sr" key={idx}>{t.searchResult(it.count, it.titles.join(" · "))}</div>
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
                    <button className="viewbtn" key={a} onClick={() => viewArtifact(a)}>{t.viewRender(a)}</button>
                  ))}
                </div>
              );
            })}
          </div>{/* /stagewrap */}
          </div>{/* /colmain */}

          <aside className="colside">
            <div className="kp">
              <div className="kphead">{t.kpTitle}</div>

              <div className="kpsec">
                <div className="kplabel">{t.kpTarget}</div>
                <div className="kpval">{company || t.dash}</div>
                <div className="kpmeta">{meta.model || t.dash} · effort {meta.effort || t.dash}</div>
              </div>

              {collectedPages.length > 0 && (
                <div className="kpsec">
                  <div className="kplabel">{t.kpCollected(collectedPages.length)}</div>
                  <div className="kpchips">
                    {collectedPages.map((p, i) => (
                      <span className="kpchip" key={i} title={p.url}>{p.title || p.url}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="kpsec">
                <div className="kplabel">{t.kpPoints}</div>
                {keypoints.length === 0 ? (
                  <div className="kpempty">{t.kpEmpty}</div>
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
          <div className="resulttitle">{t.resultDone} <span className="muted">{t.totalTime(fmt(elapsed))}</span></div>
          <div className="dlrow">
            <button type="button" className="open" onClick={openProposal}>{t.openHtml}</button>
            <a className="dl" href={`/api/jobs/${jobId}/pptx`}>{t.dlPptx}</a>
            <button type="button" className="dl" onClick={downloadHtml}>{t.dlHtml}</button>
          </div>
          <div className="hint">{t.resultHint}</div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal" onClick={() => setSettingsOpen(false)}>
          <div className="modalbox set" onClick={(e) => e.stopPropagation()}>
            <div className="modalhead">
              <span>{t.settings}</span>
              <span className="x" onClick={() => setSettingsOpen(false)}>{t.close}</span>
            </div>
            <div className="setbody">
              <div className="field">
                <label>{t.setApiKey}</label>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t.phApiKey} autoComplete="off" />
                <div className="fhint">{t.setApiKeyHint}</div>
              </div>
              <div className="row">
                <div className="field">
                  <label>{t.setModel}</label>
                  <select value={modelSel} onChange={(e) => setModelSel(e.target.value)}>
                    <option value="">{t.setModelDefault}</option>
                    <option value="claude-sonnet-4-6">claude-sonnet-4-6 ({t.modelFast})</option>
                    <option value="claude-opus-4-8">claude-opus-4-8 ({t.modelHigh})</option>
                    <option value="claude-opus-4-7">claude-opus-4-7</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.setEffort}</label>
                  <select value={effortSel} onChange={(e) => setEffortSel(e.target.value)}>
                    <option value="">{t.setEffortDefault}</option>
                    <option value="low">low ({t.effortLow})</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="xhigh">xhigh ({t.effortXHigh})</option>
                  </select>
                </div>
              </div>
              <div className="setbtns">
                <button type="button" onClick={saveSettings}>{t.save}</button>
                <button type="button" className="ghost" onClick={() => { setApiKey(""); setModelSel(""); setEffortSel(""); }}>{t.reset}</button>
              </div>

              <div className="field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{t.usageTitle}</span>
                  <button type="button" className="ghost" style={{ padding: "2px 10px", fontSize: 12 }} onClick={loadUsage} disabled={usageLoading}>
                    {usageLoading ? t.loading : t.refresh}
                  </button>
                </label>
                {usageLoading && <div className="fhint">{t.loading}</div>}
                {!usageLoading && usage && (
                  !usage.configured ? (
                    <div className="fhint">{t.usageNoKey}</div>
                  ) : (() => {
                    const Lm = usage.limits || {};
                    const cats: [string, string][] = [["requests", t.catRequests], ["tokens", t.catTokens], ["input-tokens", t.catInputTokens], ["output-tokens", t.catOutputTokens]];
                    const rows = cats.filter(([k]) => Lm[`${k}-remaining`] !== undefined || Lm[`${k}-limit`] !== undefined);
                    return (
                      <>
                        {!usage.ok && (
                          <div className="fhint" style={{ color: "#c0392b", fontWeight: 700 }}>
                            ⚠️ {usage.error === "rate_limit"
                              ? t.usageRateLimit(usage.retry_after || "")
                              : (usage.message || usage.error || t.errPrefix)}
                          </div>
                        )}
                        {rows.length === 0 ? (
                          <div className="fhint">{t.usageNoInfo}</div>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 6 }}>
                            <tbody>
                              {rows.map(([k, label]) => {
                                const rem = Lm[`${k}-remaining`];
                                const lim = Lm[`${k}-limit`];
                                const reset = Lm[`${k}-reset`];
                                const rn = Number(rem), ln = Number(lim);
                                const pct = !isNaN(rn) && !isNaN(ln) && ln > 0 ? Math.max(0, Math.min(100, Math.round((rn / ln) * 100))) : null;
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
                <div className="fhint">{t.usageFootnote}</div>
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
              <span className="x" onClick={() => setViewer(null)}>{t.close}</span>
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
