"use client";

// 언어 상태 훅(클라이언트 전용).
// 초기값: localStorage("rn_lang") 우선 → 없으면 navigator.language 자동 감지.
// SSR/최초 렌더는 "ko"로 고정해 하이드레이션 불일치를 피하고, 마운트 후 감지값으로 교체한다.
import { useEffect, useState } from "react";
import { type Lang, pickLang } from "./i18n";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rn_lang");
      const next: Lang = saved === "ko" || saved === "en" ? saved : pickLang(navigator.language);
      setLang(next);
      document.documentElement.lang = next;
    } catch {
      /* localStorage/navigator 불가 환경 무시 */
    }
  }, []);

  const set = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("rn_lang", l);
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  };

  return [lang, set];
}
