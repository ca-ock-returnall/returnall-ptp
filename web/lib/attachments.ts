// 회의록 등 첨부 파일에서 텍스트를 추출한다.
// 지원: txt/md/csv/tsv/json/log/text(평문), html/htm(태그 제거), docx(mammoth).
import mammoth from "mammoth";

const TEXT_EXT = new Set(["txt", "md", "markdown", "csv", "tsv", "json", "log", "text"]);
const HTML_EXT = new Set(["html", "htm"]);
const PER_FILE_CHARS = 60000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export type ExtractResult = { parts: string[]; attached: string[]; skipped: string[] };

export async function extractFiles(files: File[]): Promise<ExtractResult> {
  const parts: string[] = [];
  const attached: string[] = [];
  const skipped: string[] = [];

  for (const f of files) {
    const name = f.name || "file";
    const ext = (name.split(".").pop() || "").toLowerCase();
    try {
      let text = "";
      if (TEXT_EXT.has(ext)) {
        text = await f.text();
      } else if (HTML_EXT.has(ext)) {
        text = stripHtml(await f.text());
      } else if (ext === "docx") {
        const buf = Buffer.from(await f.arrayBuffer());
        text = (await mammoth.extractRawText({ buffer: buf })).value;
      } else {
        skipped.push(name); // pdf 등 미지원 — 텍스트로 변환해 첨부 권장
        continue;
      }
      text = text.trim();
      if (!text) {
        skipped.push(name);
        continue;
      }
      if (text.length > PER_FILE_CHARS) text = text.slice(0, PER_FILE_CHARS) + "\n…(이하 생략)";
      parts.push(`## 첨부 회의록: ${name}\n${text}`);
      attached.push(name);
    } catch {
      skipped.push(name);
    }
  }
  return { parts, attached, skipped };
}
