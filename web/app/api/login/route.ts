import { NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE, checkCredentials, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 프록시 뒤에서 req.url 은 내부 주소(localhost:8000)라 절대 URL 리다이렉트가 깨진다.
// 상대 경로 Location 헤더로 보내면 브라우저가 현재 호스트(https://ptp.returneeds.com) 기준으로 해석한다.
export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (!checkCredentials(username, password)) {
    return new NextResponse(null, { status: 303, headers: { Location: "/login?e=1" } });
  }

  // secure 쿠키는 HTTPS 에서만 브라우저에 저장된다. 로컬 http://localhost 개발에서
  // secure 를 켜면 로그인 후 쿠키가 유실돼 로그인 화면만 반복된다.
  // 프록시(nginx-proxy)는 x-forwarded-proto=https 를 붙이므로 이를 보고 판단한다.
  const proto =
    req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const secure = proto === "https";

  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.set(COOKIE_NAME, await sessionToken(), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
