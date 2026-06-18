// 앱 레벨 로그인(세션 쿠키). 외부 의존성 없이 Web Crypto(HMAC)만 사용 — edge·node 양쪽에서 동작.
// 자격증명/비밀키는 빌드+런타임 모두 동일 값이어야 하므로 Dockerfile에서 ENV로 고정 주입한다.

const USERNAME = process.env.APP_USERNAME || "pushtoprod";
const PASSWORD = process.env.APP_PASSWORD || "push2prod!";
const SECRET = process.env.APP_SECRET || `ptp$${PASSWORD}`;

export const COOKIE_NAME = "ptp_auth";
export const MAX_AGE = 7 * 24 * 3600; // 7일

let _token: string | null = null;

async function computeToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("ptp-authenticated"));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v1.${hex}`;
}

export async function sessionToken(): Promise<string> {
  if (_token === null) _token = await computeToken();
  return _token;
}

export function checkCredentials(username: string, password: string): boolean {
  // 길이/내용 비교(내부 게이트 용도). 사용자명·비번 모두 일치해야 함.
  return username === USERNAME && password === PASSWORD;
}

export async function isAuthed(cookieValue: string | undefined | null): Promise<boolean> {
  if (!cookieValue) return false;
  return cookieValue === (await sessionToken());
}
