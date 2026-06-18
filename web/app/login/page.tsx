// 로그인 페이지(서버 컴포넌트). 폼은 /api/login 으로 POST.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const error = e ? "아이디 또는 비밀번호가 올바르지 않습니다." : "";

  return (
    <div className="loginwrap">
      <form className="loginbox" method="post" action="/api/login">
        <h1>리터니즈 제안서 자동 생성</h1>
        <p className="sub">계속하려면 로그인하세요.</p>
        {error && <div className="err">{error}</div>}
        <label htmlFor="u">아이디</label>
        <input id="u" name="username" autoComplete="username" autoFocus required />
        <label htmlFor="p">비밀번호</label>
        <input id="p" name="password" type="password" autoComplete="current-password" required />
        <button type="submit">로그인</button>
      </form>

      <style>{`
        .loginwrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f5f6;}
        .loginbox{background:#fff;border:1px solid #e3e5e7;border-radius:14px;padding:32px 28px;max-width:380px;width:100%;
                  box-shadow:0 8px 30px rgba(0,0,0,.06);}
        .loginbox h1{font-size:20px;font-weight:800;letter-spacing:-.4px;color:#222629;}
        .loginbox .sub{color:#6b7280;font-size:13px;margin:6px 0 20px;}
        .loginbox label{display:block;font-size:13px;font-weight:700;margin:0 0 6px;color:#222629;}
        .loginbox input{width:100%;border:1px solid #cfd3d7;border-radius:8px;padding:11px 13px;font-size:14.5px;margin-bottom:14px;}
        .loginbox input:focus{outline:none;border-color:#18883B;}
        .loginbox button{width:100%;background:#18883B;color:#fff;border:0;border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;}
        .loginbox button:hover{background:#0f6e2e;}
        .loginbox .err{background:#fdecea;color:#c0392b;font-size:13px;font-weight:700;border-radius:8px;padding:10px 12px;margin-bottom:14px;}
      `}</style>
    </div>
  );
}
