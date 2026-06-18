#!/usr/bin/env bash
# 리터니즈 제안서 자동 생성 웹서비스 실행기
set -e
cd "$(dirname "$0")"

# .env 가 있으면 로드 (ANTHROPIC_API_KEY 등)
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORT="${PORT:-8000}"
echo "▶ http://127.0.0.1:${PORT}  (API 키 ${ANTHROPIC_API_KEY:+설정됨}${ANTHROPIC_API_KEY:-미설정 → DEMO 모드})"
exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
