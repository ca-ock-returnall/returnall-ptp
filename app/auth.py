"""앱 레벨 로그인(세션 쿠키 기반). 외부 의존성 없이 표준 라이브러리만 사용.

- 자격증명은 환경변수 APP_USERNAME / APP_PASSWORD (기본값 pushtoprod / push2prod!).
- 쿠키 값은 APP_SECRET 으로 HMAC 서명한 고정 토큰 — 위조 불가, 서버 재시작에도 유지.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from secrets import compare_digest

USERNAME = os.environ.get("APP_USERNAME", "pushtoprod")
PASSWORD = os.environ.get("APP_PASSWORD", "push2prod!")
_SECRET = (os.environ.get("APP_SECRET") or ("ptp$" + PASSWORD)).encode("utf-8")

COOKIE_NAME = "ptp_auth"
_MAX_AGE = 7 * 24 * 3600  # 7일
_TOKEN = "v1." + hmac.new(_SECRET, b"ptp-authenticated", hashlib.sha256).hexdigest()


def check(username: str, password: str) -> bool:
    """로그인 폼 자격증명 검증(상수시간 비교)."""
    return compare_digest(username, USERNAME) and compare_digest(password, PASSWORD)


def is_authed(request) -> bool:
    """요청 쿠키가 유효한 세션 토큰을 담고 있는지."""
    cookie = request.cookies.get(COOKIE_NAME, "")
    return bool(cookie) and compare_digest(cookie, _TOKEN)


def set_cookie(response) -> None:
    response.set_cookie(
        COOKIE_NAME, _TOKEN,
        max_age=_MAX_AGE, httponly=True, secure=True, samesite="lax", path="/",
    )


def clear_cookie(response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def login_html(error: str = "") -> str:
    err = f'<div class="err">{error}</div>' if error else ""
    return _LOGIN_TMPL.replace("<!--ERR-->", err)


_LOGIN_TMPL = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>로그인 · 리터니즈 제안서 자동 생성</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
  :root{--green:#18883B;--green-d:#0f6e2e;--green-l:#e9f5ec;--ink:#222629;--gray:#6b7280;--line:#e3e5e7;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Pretendard",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;
       background:#f4f5f6;color:var(--ink);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:32px 28px;max-width:380px;width:100%;
       box-shadow:0 8px 30px rgba(0,0,0,.06);}
  h1{font-size:20px;font-weight:800;letter-spacing:-.4px;}
  p.sub{color:var(--gray);font-size:13px;margin-top:6px;margin-bottom:20px;}
  label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;}
  .field{margin-bottom:14px;}
  input{width:100%;border:1px solid #cfd3d7;border-radius:8px;padding:11px 13px;font-size:14.5px;font-family:inherit;}
  input:focus{outline:none;border-color:var(--green);}
  button{width:100%;background:var(--green);color:#fff;border:0;border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;}
  button:hover{background:var(--green-d);}
  .err{background:#fdecea;color:#c0392b;font-size:13px;font-weight:700;border-radius:8px;padding:10px 12px;margin-bottom:14px;}
</style>
</head>
<body>
  <form class="box" method="post" action="/login">
    <h1>리터니즈 제안서 자동 생성</h1>
    <p class="sub">계속하려면 로그인하세요.</p>
    <!--ERR-->
    <div class="field"><label>아이디</label><input name="username" autocomplete="username" autofocus required></div>
    <div class="field"><label>비밀번호</label><input name="password" type="password" autocomplete="current-password" required></div>
    <button type="submit">로그인</button>
  </form>
</body>
</html>
"""
