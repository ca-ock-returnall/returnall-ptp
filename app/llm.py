"""Anthropic 호출 래퍼.

- 리서치(STAGE 1)는 서버사이드 web_search 툴로 실제 공개정보를 수집한다.
- 페인포인트(STAGE 2)·종합분석(STAGE 3)은 앞 단계 산출물을 입력으로 추론한다.
- 스토리라인 사양은 messages.parse + Pydantic 스키마로 구조화 추출한다.
"""
from __future__ import annotations

import anthropic

from . import config
from .config import MODEL
from .schema import StorylineSpec

_RATELIMIT_PREFIX = "anthropic-ratelimit-"

_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 사용
    return _client


WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search"}


def _text_of(message) -> str:
    return "\n".join(b.text for b in message.content if b.type == "text").strip()


def _report_searches(content, searches: int, on_progress) -> int:
    """응답 블록에서 web_search 호출을 세어 진행 콜백으로 흘린다(실시간 진행 표시용)."""
    for b in content:
        if getattr(b, "type", None) == "server_tool_use" and getattr(b, "name", "") == "web_search":
            searches += 1
            query = ""
            inp = getattr(b, "input", None)
            if isinstance(inp, dict):
                query = inp.get("query", "") or ""
            if on_progress is not None:
                on_progress(searches=searches, query=query)
    return searches


def run_with_websearch(system: str, user: str, max_tokens: int = 16000,
                       max_uses: int = 5, on_progress=None) -> str:
    """web_search 서버 툴을 켜고 텍스트 응답을 받는다. pause_turn(서버 툴 반복 한도)을 이어붙인다.

    on_progress(searches:int, query:str) 가 주어지면 검색이 일어날 때마다 호출한다(UI 진행 표시).
    """
    tools = [{**WEB_SEARCH_TOOL, "max_uses": max_uses}]
    messages = [{"role": "user", "content": user}]
    searches = 0
    resp = None
    for _ in range(6):  # pause_turn 재개 상한
        resp = client().messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            tools=tools,
            messages=messages,
        )
        searches = _report_searches(resp.content, searches, on_progress)
        if resp.stop_reason == "pause_turn":
            messages.append({"role": "assistant", "content": resp.content})
            continue
        return _text_of(resp)
    return _text_of(resp)


def run_text(system: str, user: str, max_tokens: int = 16000) -> str:
    """툴 없는 일반 텍스트 추론."""
    resp = client().messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return _text_of(resp)


def _parse_ratelimit(headers) -> dict:
    """응답 헤더에서 anthropic-ratelimit-* 항목만 골라 prefix 를 떼고 돌려준다."""
    out = {}
    for k, v in headers.items():
        kl = k.lower()
        if kl.startswith(_RATELIMIT_PREFIX):
            out[kl[len(_RATELIMIT_PREFIX):]] = v
    return out


def rate_limit_status() -> dict:
    """현재 API 키의 레이트리밋 잔여치를 응답 헤더에서 읽어 온다(설정 모달 표시용).

    Anthropic은 API 키 단위의 '남은 잔액/월 한도'를 조회하는 엔드포인트를 제공하지 않는다.
    얻을 수 있는 잔여 신호는 응답 헤더의 anthropic-ratelimit-*(분 단위 창의 남은 요청/토큰
    수와 리셋 시각)뿐이다. max_tokens=1 의 최소 요청을 보내 그 헤더만 읽는다.
    한도 도달(429) 시에도 헤더와 retry-after 를 그대로 흘려 상태를 보여준다.
    """
    if not config.HAS_API_KEY:
        return {"configured": False}
    try:
        raw = client().messages.with_raw_response.create(
            model=MODEL,
            max_tokens=1,
            messages=[{"role": "user", "content": "."}],
        )
        return {"configured": True, "ok": True, "limits": _parse_ratelimit(raw.headers)}
    except anthropic.RateLimitError as e:
        headers = getattr(e.response, "headers", {}) or {}
        return {
            "configured": True,
            "ok": False,
            "error": "rate_limit",
            "retry_after": headers.get("retry-after"),
            "limits": _parse_ratelimit(headers),
        }
    except anthropic.APIStatusError as e:
        return {"configured": True, "ok": False, "error": e.type or "api_error", "message": e.message}
    except Exception as e:  # 네트워크/그 외 — 모달에 메시지로 노출
        return {"configured": True, "ok": False, "error": "unknown", "message": str(e)}


def parse_storyline(system: str, user: str, max_tokens: int = 16000) -> StorylineSpec:
    """종합분석 본문에서 STORYLINE SPEC을 구조화 추출한다."""
    resp = client().messages.parse(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_format=StorylineSpec,
    )
    if resp.parsed_output is None:
        raise RuntimeError("스토리라인 사양 구조화 실패 (stop_reason=%s)" % resp.stop_reason)
    return resp.parsed_output
