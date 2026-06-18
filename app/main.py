"""FastAPI 웹서비스: 회사명+URL 입력 → 4단계 자동 진행 → 제안서 초안.

라우트
  GET  /                      입력 폼 + 진행 UI
  POST /api/generate          작업 시작(회사명·URL·회의록), job_id 반환
  GET  /api/jobs/{id}/stream  SSE 진행 스트림
  GET  /api/jobs/{id}/artifact/{name}   단계 산출물(마크다운/HTML) 원문
  GET  /proposals/{id}        조립된 제안서 HTML(브라우저로 열어 인쇄→PDF)
"""
from __future__ import annotations

import json
import queue
import threading

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse

from . import config
from .attachments import extract_files
from .jobs import create_job, get_job
from .llm import rate_limit_status
from .pipeline import run_pipeline
from .web_ui import INDEX_HTML

app = FastAPI(title="리터니즈 제안서 자동 생성")


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return INDEX_HTML


@app.get("/api/usage")
def usage() -> dict:
    """설정 모달이 표시할 레이트리밋 잔여치."""
    return rate_limit_status()


MAX_NOTES_CHARS = 200000


@app.post("/api/generate")
def generate(
    company: str = Form(...),
    url: str = Form(...),
    notes: str = Form(""),
    files: list[UploadFile] = File(default=[]),
):
    company = company.strip()
    url = url.strip()
    if not company or not url:
        raise HTTPException(400, "회사명과 URL은 필수입니다.")

    # 첨부된 회의록 파일에서 텍스트 추출 → 붙여넣은 메모와 합친다.
    raw = [(f.filename or "file", f.file.read()) for f in files if f.filename]
    parts, attached, skipped = extract_files([(n, b) for n, b in raw if b])
    notes = "\n\n".join(s for s in [notes.strip(), *parts] if s)
    if len(notes) > MAX_NOTES_CHARS:
        notes = notes[:MAX_NOTES_CHARS] + "\n…(이하 생략)"

    job = create_job(company, url)
    threading.Thread(target=run_pipeline, args=(job, notes), daemon=True).start()
    return {
        "job_id": job.id,
        "demo_mode": not config.HAS_API_KEY,
        "attached": attached,
        "skipped": skipped,
    }


@app.get("/api/jobs/{job_id}/stream")
def stream(job_id: str) -> StreamingResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")

    def gen():
        # 이미 발생한 로그를 먼저 흘려보낸다(스트림 연결 전 이벤트 보전).
        for ev in list(job.log):
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
        if job.status != "running":
            return
        while True:
            try:
                ev = job.events.get(timeout=30)
            except queue.Empty:
                yield ": keep-alive\n\n"
                continue
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
            if ev["kind"] in ("done", "error"):
                break

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/jobs/{job_id}/artifact/{name}", response_class=PlainTextResponse)
def artifact(job_id: str, name: str) -> str:
    job = get_job(job_id)
    if job is None or name not in job.artifacts:
        raise HTTPException(404, "산출물을 찾을 수 없습니다.")
    return job.artifacts[name]


@app.get("/proposals/{job_id}", response_class=HTMLResponse)
def proposal(job_id: str) -> str:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    key = f"{job.company}_제안서.html"
    if key not in job.artifacts:
        raise HTTPException(404, "제안서가 아직 준비되지 않았습니다.")
    return job.artifacts[key]
