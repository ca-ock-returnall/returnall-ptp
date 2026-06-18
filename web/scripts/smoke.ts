/**
 * 스모크 테스트: assemble(DEMO_SPEC) 가
 *  - 미치환 토큰 0개
 *  - class="slide 23개
 * 임을 확인. (포트 동등성 검증)
 *
 * 실행: npx tsx scripts/smoke.ts
 */
import { assemble, TOKEN_RE } from "../lib/assemble";
import { loadTemplate } from "../lib/config";
import { DEMO_SPEC } from "../lib/demoSpec";

function main() {
  const template = loadTemplate();
  const html = assemble(DEMO_SPEC, template);

  // 1) 미치환 토큰 0개
  const leftovers = html.match(TOKEN_RE) || [];
  // 2) class="slide 등장 횟수
  const slideMatches = html.match(/class="slide/g) || [];

  console.log(`leftover tokens: ${leftovers.length}`);
  console.log(`'class="slide' occurrences: ${slideMatches.length}`);

  let ok = true;
  if (leftovers.length !== 0) {
    console.error(`FAIL: 미치환 토큰 ${leftovers.length}개 — ${[...new Set(leftovers)].join(", ")}`);
    ok = false;
  }
  if (slideMatches.length !== 23) {
    console.error(`FAIL: class="slide" 개수가 23이 아님 (${slideMatches.length})`);
    ok = false;
  }

  if (!ok) {
    process.exit(1);
  }
  console.log("SMOKE OK: 0 leftover tokens, 23 slides.");
}

main();
