import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 저장소 루트의 .env(상위 디렉터리)를 Next 프로세스로 로드한다.
// Next는 자체 프로젝트 루트(web/)의 .env 만 자동 로드하므로, 공유 .env 를 직접 읽어 주입한다.
// 이미 셸에서 export 된 값이 있으면 덮어쓰지 않는다.
function loadParentEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(here, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // 이 프로젝트에서는 공유 .env 를 단일 진실 소스로 삼아, 셸에 남은 오래된 export 가
    // 조용히 덮어쓰지 못하도록 .env 값을 우선 적용한다.
    if (key) process.env[key] = val;
  }
}

loadParentEnv();

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 상위에 다른 lockfile(bun.lockb 등)이 있어도 이 디렉터리를 워크스페이스 루트로 고정.
  outputFileTracingRoot: here,
  // 파이프라인/콘텐츠 자산(../pipeline, ../content-library, ../rawdata)을 런타임에 fs로 읽는다.
};

export default nextConfig;
