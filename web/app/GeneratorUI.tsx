"use client";

/**
 * 입력폼 + 4단계 진행 UI 클라이언트 컴포넌트. (web_ui.py _MAIN_PAGE 의 동작 포트)
 *
 * - EventSource 로 /api/jobs/{id}/stream 구독, SSE 이벤트로 단계 카드 갱신
 * - STAGE 2/3 산출물(02_*.md·03_*.md)을 펼쳐 표시
 * - DEMO 배너(!hasApiKey), API 사용량 모달, SSE 자동 재연결(EventSource 기본)
 */
import { useEffect, useRef, useState } from "react";

type StageState = {
  status: "대기" | "진행 중" | "완료" | "건너뜀";
  cls: "" | "active" | "done" | "skip";
  msg: string;
  artifactName?: string;
  artifactText?: string;
};

const INITIAL_STAGES: Record<number, StageState> = {
  1: { status: "대기", cls: "", msg: "" },
  2: { status: "대기", cls: "", msg: "" },
  3: { status: "대기", cls: "", msg: "" },
  4: { status: "대기", cls: "", msg: "" },
};

const STAGE_TITLES: Record<number, string> = {
  1: "공개정보 리서치",
  2: "페인포인트 추론 (판단 레이어)",
  3: "종합 분석 + 스토리라인 (판단 레이어)",
  4: "제안서 조립",
};

export default function GeneratorUI({ hasApiKey }: { hasApiKey: boolean }) {
  const [stages, setStages] = useState<Record<number, StageState>>(() =>
    structuredClone(INITIAL_STAGES)
  );
  const [busy, setBusy] = useState(false);
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageBody, setUsageBody] = useState("불러오는 중…");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  function patchStage(n: number, patch: Partial<StageState>) {
    setStages((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }));
  }

  async function loadArtifact(n: number, name: string, id: string) {
    try {
      const r = await fetch(
        `/api/jobs/${id}/artifact/${encodeURIComponent(name)}`
      );
      const t = await r.text();
      patchStage(n, { artifactName: name, artifactText: t });
    } catch {
      // ignore
    }
  }

  function handle(ev: any, id: string) {
    if (ev.kind === "demo") {
      // 배너는 이미 표시됨
    }
    if (ev.kind === "stage_start") {
      patchStage(ev.stage, { status: "진행 중", cls: "active", msg: "" });
    }
    if (ev.kind === "progress") {
      patchStage(ev.stage, { msg: ev.message });
    }
    if (ev.kind === "stage_done") {
      patchStage(ev.stage, { status: "완료", cls: "done" });
      if (ev.artifact && ev.stage >= 1 && ev.stage <= 3) {
        loadArtifact(ev.stage, ev.artifact, id);
      }
    }
    if (ev.kind === "stage_skip") {
      patchStage(ev.stage, { status: "건너뜀", cls: "skip", msg: ev.message });
    }
    if (ev.kind === "done") {
      setProposalUrl(ev.proposal_url);
      setBusy(false);
      esRef.current?.close();
    }
    if (ev.kind === "error") {
      alert("오류: " + ev.message);
      setBusy(false);
      esRef.current?.close();
    }
  }

  function connect(id: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/jobs/${id}/stream`);
    es.onmessage = (e) => {
      try {
        handle(JSON.parse(e.data), id);
      } catch {
        // ignore parse errors / keep-alive comments
      }
    };
    es.onerror = () => {
      // 자동 재연결 (EventSource 기본)
    };
    esRef.current = es;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStages(structuredClone(INITIAL_STAGES));
    setProposalUrl(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/generate", { method: "POST", body: fd });
    if (!r.ok) {
      alert("생성 시작 실패");
      setBusy(false);
      return;
    }
    const j = await r.json();
    setJobId(j.job_id);
    connect(j.job_id);
  }

  async function openUsage() {
    setUsageOpen(true);
    setUsageBody("불러오는 중…");
    try {
      const r = await fetch("/api/usage");
      const j = await r.json();
      setUsageBody(JSON.stringify(j, null, 2));
    } catch {
      setUsageBody("조회 실패");
    }
  }

  return (
    <>
      <style>{css}</style>
      <header>
        <div className="l">RETURNIZE · 제안서 자동 생성</div>
        <div>
          <button onClick={openUsage}>API 사용량</button>
          <form method="post" action="/api/logout" style={{ display: "inline" }}>
            <button type="submit">로그아웃</button>
          </form>
        </div>
      </header>
      <div className="wrap">
        {!hasApiKey && (
          <div className="demo-banner">
            DEMO 모드 — ANTHROPIC_API_KEY가 없어 안다르 예시로 동작합니다.
          </div>
        )}
        <div className="grid">
          <div className="card">
            <h2>고객사 입력</h2>
            <form id="genForm" onSubmit={onSubmit}>
              <label>회사명 *</label>
              <input name="company" placeholder="예: 안다르" required />
              <label>홈페이지 URL *</label>
              <input name="url" placeholder="https://..." required />
              <label>회의록 / 메일 (선택)</label>
              <textarea
                name="notes"
                placeholder="1차 미팅 회의록 등 텍스트를 붙여넣으세요"
              />
              <label>회의록 파일 (선택, txt/md/docx)</label>
              <input
                type="file"
                name="files"
                multiple
                accept=".txt,.md,.docx,.csv"
              />
              <button className="go" type="submit" disabled={busy}>
                {busy ? "생성 중…" : "제안서 생성 시작"}
              </button>
            </form>
          </div>
          <div className="card">
            <h2>진행 상황</h2>
            <div className="stages">
              {[1, 2, 3, 4].map((n) => {
                const st = stages[n];
                return (
                  <div key={n} className={`stage ${st.cls}`}>
                    <div className="top">
                      <div className="n">{n}</div>
                      <div className="t">{STAGE_TITLES[n]}</div>
                      <div className="st">{st.status}</div>
                    </div>
                    {st.msg && <div className="msg">{st.msg}</div>}
                    {st.artifactName && (
                      <div className="art">
                        <details>
                          <summary>{st.artifactName} 펼쳐보기</summary>
                          <pre className="md">{st.artifactText}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {proposalUrl && (
              <div className="result" style={{ display: "block" }}>
                <a href={proposalUrl} target="_blank" rel="noreferrer">
                  제안서 열기 →
                </a>
                {jobId && (
                  <a href={`/api/jobs/${jobId}/pptx`}>PPTX 내보내기 ↓</a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {usageOpen && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="box">
            <h3>API 레이트리밋 잔여치</h3>
            <pre>{usageBody}</pre>
            <button onClick={() => setUsageOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
 :root{--navy:#0f2540;--teal:#0fb6a8;--teal-d:#0a8f84;--orange:#ff7a33;--line:#e3e9ef;--muted:#5b6b7c}
 header{background:linear-gradient(90deg,var(--teal),var(--navy));color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:center}
 header .l{font-weight:800;letter-spacing:.05em}
 header a,header button{color:#fff;background:rgba(255,255,255,.16);border:0;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;font-weight:600}
 .wrap{max-width:980px;margin:28px auto;padding:0 20px}
 .demo-banner{background:#fff3ec;color:#b3520f;border:1px solid #ffd9c2;padding:12px 16px;border-radius:10px;margin-bottom:18px;font-weight:600;font-size:14px}
 .grid{display:grid;grid-template-columns:380px 1fr;gap:24px;align-items:start}
 .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px}
 h2{font-size:18px;color:var(--navy);margin-bottom:16px;font-weight:800}
 label{display:block;font-size:13px;font-weight:700;color:var(--muted);margin:14px 0 6px}
 input,textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:inherit}
 textarea{min-height:120px;resize:vertical}
 button.go{width:100%;margin-top:20px;padding:13px;border:0;border-radius:10px;background:var(--teal);color:#04221f;font-weight:800;font-size:15px;cursor:pointer}
 button.go:disabled{opacity:.5;cursor:default}
 .stages{display:flex;flex-direction:column;gap:14px}
 .stage{border:1px solid var(--line);border-radius:14px;padding:16px 18px;transition:.2s}
 .stage .top{display:flex;align-items:center;gap:12px}
 .stage .n{width:30px;height:30px;border-radius:50%;background:#eef2f6;color:var(--muted);font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
 .stage .t{font-weight:800;color:var(--navy)}
 .stage .st{margin-left:auto;font-size:12.5px;font-weight:700;color:var(--muted)}
 .stage.active{border-color:var(--teal);box-shadow:0 0 0 3px rgba(15,182,168,.12)}
 .stage.active .n{background:var(--teal);color:#fff}
 .stage.done .n{background:var(--teal-d);color:#fff}
 .stage.skip{opacity:.55}
 .stage .msg{font-size:13px;color:var(--muted);margin-top:8px;padding-left:42px}
 .stage .art{margin-top:10px;padding-left:42px}
 details{margin-top:8px}
 details summary{cursor:pointer;font-size:13px;color:var(--teal-d);font-weight:700}
 pre.md{white-space:pre-wrap;font-size:12.5px;line-height:1.55;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:14px;margin-top:8px;max-height:280px;overflow:auto}
 .result{margin-top:18px}
 .result a{display:inline-block;padding:12px 20px;background:var(--navy);color:#fff;border-radius:10px;font-weight:800;text-decoration:none;margin-right:10px}
 .modal{position:fixed;inset:0;background:rgba(0,0,0,.4);align-items:center;justify-content:center;z-index:50}
 .modal .box{background:#fff;border-radius:16px;padding:26px;width:420px;max-width:92vw}
 .modal h3{color:var(--navy);margin-bottom:14px}
 .modal pre{font-size:12px;background:#f8fafc;border-radius:8px;padding:12px;white-space:pre-wrap;max-height:60vh;overflow:auto}
 .modal button{margin-top:16px;padding:9px 16px;border:0;border-radius:8px;background:var(--teal);color:#04221f;font-weight:700;cursor:pointer}
`;
