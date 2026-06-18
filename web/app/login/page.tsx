"use client";

// 로그인 페이지(클라이언트 컴포넌트). 폼은 /api/login 으로 POST.
// 언어: 브라우저 자동 감지(useLang) + 우상단 KO/EN 토글. 오류 파라미터(?e=1)는 마운트 후 읽는다.
import { useEffect, useState } from "react";
import { UI } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

export default function LoginPage() {
  const [lang, setLang] = useLang();
  const t = UI[lang];
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      setHasError(new URLSearchParams(window.location.search).has("e"));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="loginwrap">
      <button type="button" className="langtoggle" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
        {t.langName}
      </button>
      <form className="loginbox" method="post" action="/api/login">
        <h1>{t.logoMain} {t.logoSub}</h1>
        <p className="sub">{t.loginSub}</p>
        {hasError && <div className="err">{t.loginError}</div>}
        <label htmlFor="u">{t.loginUser}</label>
        <input id="u" name="username" autoComplete="username" autoFocus required />
        <label htmlFor="p">{t.loginPass}</label>
        <input id="p" name="password" type="password" autoComplete="current-password" required />
        <button type="submit">{t.loginBtn}</button>
      </form>

      <style>{`
        .loginwrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f5f6;position:relative;}
        .langtoggle{position:absolute;top:20px;right:20px;background:#fff;color:#222629;border:1px solid #cfd3d7;
                    padding:8px 14px;font-size:13.5px;font-weight:700;border-radius:8px;cursor:pointer;}
        .langtoggle:hover{border-color:#18883B;color:#0f6e2e;}
        .loginbox{background:#fff;border:1px solid #e3e5e7;border-radius:14px;padding:32px 28px;max-width:380px;width:100%;
                  box-shadow:0 8px 30px rgba(0,0,0,.06);}
        .loginbox h1{font-size:20px;font-weight:800;letter-spacing:-.4px;color:#222629;}
        .loginbox .sub{color:#6b7280;font-size:13px;margin:6px 0 20px;}
        .loginbox label{display:block;font-size:13px;font-weight:700;margin:0 0 6px;color:#222629;}
        .loginbox input{width:100%;border:1px solid #cfd3d7;border-radius:8px;padding:11px 13px;font-size:14.5px;margin-bottom:14px;}
        .loginbox input:focus{outline:none;border-color:#18883B;}
        .loginbox button[type=submit]{width:100%;background:#18883B;color:#fff;border:0;border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;}
        .loginbox button[type=submit]:hover{background:#0f6e2e;}
        .loginbox .err{background:#fdecea;color:#c0392b;font-size:13px;font-weight:700;border-radius:8px;padding:10px 12px;margin-bottom:14px;}
      `}</style>
    </div>
  );
}
