# 리터니즈 제안서 자동 생성 웹서비스 (FastAPI)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 코드 + 런타임에 읽는 자산(pipeline/ content-library/ rawdata/)
COPY app ./app
COPY pipeline ./pipeline
COPY content-library ./content-library
COPY rawdata ./rawdata

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
