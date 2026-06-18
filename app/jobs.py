"""인메모리 작업 저장소 + 진행 이벤트 큐(SSE용). 단일 프로세스 데모 범위."""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from queue import Queue
from typing import Any, Dict, List, Optional


@dataclass
class Job:
    id: str
    company: str
    url: str
    status: str = "running"          # running | done | error
    error: Optional[str] = None
    artifacts: Dict[str, str] = field(default_factory=dict)  # 단계명 -> 마크다운/HTML
    events: "Queue[dict]" = field(default_factory=Queue)
    log: List[dict] = field(default_factory=list)
    proposal_path: Optional[str] = None

    def emit(self, kind: str, **data: Any) -> None:
        ev = {"kind": kind, **data}
        self.log.append(ev)
        self.events.put(ev)


_jobs: Dict[str, Job] = {}
_lock = threading.Lock()


def create_job(company: str, url: str) -> Job:
    job = Job(id=uuid.uuid4().hex[:12], company=company, url=url)
    with _lock:
        _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    with _lock:
        return _jobs.get(job_id)
