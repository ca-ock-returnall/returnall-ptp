// 자체 공개자료 검색봇(크롤러). Claude web_search 대신 사용한다.
// 입력 홈페이지에서 시작 → 같은 도메인의 관련 페이지(반품/교환/배송/CS/회사소개/약관/채용 등)를
// 점수화해 따라가며 본문 텍스트를 수집한다. 의존성 없이 fetch + 정규식 파싱.

const UA = "ReturneedsResearchBot/1.0 (+proposal-generator)";

export type CrawledPage = { url: string; title: string; text: string };
export type CrawlProgress = { url: string; title: string; chars: number; ok: boolean };

// 관련도 키워드 (URL 경로 기준 점수화)
const KEYWORDS = [
  "반품", "교환", "환불", "배송", "고객", "이용안내", "문의", "정책", "약관", "회사", "소개", "공지", "채용", "입점", "대량",
  "return", "refund", "exchange", "delivery", "shipping", "cs", "customer", "service", "faq", "terms", "policy",
  "about", "company", "recruit", "career", "guide", "help", "notice", "b2b", "ir", "wholesale",
];

function normalize(input: string): string {
  const s = input.trim();
  return /^https?:\/\//i.test(s) ? s : "https://" + s;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&(#39|apos);/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0, 120) : "";
}

function extractLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      if (u.protocol === "http:" || u.protocol === "https:") {
        u.hash = "";
        out.add(u.href);
      }
    } catch {
      /* 잘못된 href 무시 */
    }
  }
  return [...out];
}

function score(url: string): number {
  let path: string;
  try {
    // 쿼리스트링(returnUrl 등) 오탐을 피하려고 경로만 본다.
    path = decodeURIComponent(new URL(url).pathname.toLowerCase());
  } catch {
    path = url.toLowerCase();
  }
  let s = 0;
  for (const kw of KEYWORDS) if (path.includes(kw)) s += 1;
  return s;
}

async function fetchPage(url: string, timeoutMs = 10000): Promise<{ ok: boolean; html?: string; finalUrl?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok || !ct.includes("text/html")) return { ok: false };
    const html = await res.text();
    return { ok: true, html, finalUrl: res.url };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

export async function crawlSite(
  homepage: string,
  onPage?: (p: CrawlProgress) => void,
  maxPages = 7,
  perPageChars = 4500,
): Promise<CrawledPage[]> {
  const start = normalize(homepage);
  const pages: CrawledPage[] = [];

  const home = await fetchPage(start);
  if (!home.ok || !home.html) {
    onPage?.({ url: start, title: "", chars: 0, ok: false });
    return pages;
  }
  const base = home.finalUrl ?? start;
  const host = new URL(base).host;
  const homeText = stripHtml(home.html).slice(0, perPageChars);
  const homeTitle = titleOf(home.html) || host;
  pages.push({ url: base, title: homeTitle, text: homeText });
  onPage?.({ url: base, title: homeTitle, chars: homeText.length, ok: true });

  // 같은 도메인 + 관련 키워드 점수순으로 후보 선정
  const candidates = extractLinks(home.html, base)
    .filter((u) => {
      try {
        return new URL(u).host === host && u !== base;
      } catch {
        return false;
      }
    })
    .map((u) => ({ u, s: score(u) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const seen = new Set([base]);
  const targets: string[] = [];
  for (const { u } of candidates) {
    if (targets.length >= maxPages - 1) break;
    if (seen.has(u)) continue;
    seen.add(u);
    targets.push(u);
  }

  // 후보 페이지 병렬 수집(완료되는 대로 진행 보고)
  await Promise.all(
    targets.map(async (u) => {
      const r = await fetchPage(u);
      if (r.ok && r.html) {
        const text = stripHtml(r.html).slice(0, perPageChars);
        const title = titleOf(r.html) || u;
        pages.push({ url: u, title, text });
        onPage?.({ url: u, title, chars: text.length, ok: true });
      } else {
        onPage?.({ url: u, title: "", chars: 0, ok: false });
      }
    }),
  );

  return pages;
}
