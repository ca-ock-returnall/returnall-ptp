# nginx-proxy + SSL

`docker-compose.yml`의 `nginx-proxy` + `acme` 가 이 디렉터리를 볼륨으로 쓴다.

- `certs/` — 발급된 인증서 저장 (자동)
- `vhost.d/` — 호스트별 nginx 설정 조각 (필요 시)
- `html/` — ACME challenge / 정적
- `acme/` — acme.sh 상태

## SSE(Server-Sent Events) 주의
제안서 생성 진행은 SSE로 흐른다. nginx-proxy는 기본적으로 프록시 버퍼링을 하므로,
`vhost.d/<VIRTUAL_HOST>` 파일에 아래를 넣어 버퍼링을 끄는 것을 권장한다(앱이 `X-Accel-Buffering: no`도 보냄):

```
proxy_buffering off;
proxy_read_timeout 3600s;
```

## 배포
```bash
cp .env.example .env   # 값 채우기 (ANTHROPIC_API_KEY, VIRTUAL_HOST, LETSENCRYPT_* 등)
docker compose up -d --build        # Python(app) + nginx-proxy + ssl
# Next.js 버전도 함께 띄우려면:
WEB_VIRTUAL_HOST=web.example.com docker compose --profile web up -d --build
```
