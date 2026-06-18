"""단일 파일 프런트엔드(폼 + 실시간 진행 + 산출물 뷰). main.py 가 그대로 서빙한다."""

INDEX_HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>리터니즈 제안서 자동 생성</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
  :root{--green:#18883B;--green-d:#0f6e2e;--green-l:#e9f5ec;--orange:#F26F21;--ink:#222629;--gray:#6b7280;--line:#e3e5e7;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Pretendard",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;
       background:#f4f5f6;color:var(--ink);line-height:1.55;}
  .wrap{max-width:880px;margin:0 auto;padding:40px 24px 80px;}
  header h1{font-size:26px;font-weight:800;letter-spacing:-.5px;}
  header p{color:var(--gray);margin-top:6px;font-size:14.5px;}
  .flow{font-size:13px;color:var(--green-d);background:var(--green-l);border-radius:8px;padding:10px 14px;margin-top:14px;}
  .card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px;margin-top:22px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
  label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;}
  input,textarea{width:100%;border:1px solid #cfd3d7;border-radius:8px;padding:11px 13px;font-size:14.5px;font-family:inherit;}
  input:focus,textarea:focus{outline:none;border-color:var(--green);}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .field{margin-bottom:16px;}
  textarea{min-height:90px;resize:vertical;}
  .drop{border:1.5px dashed #cfd3d7;border-radius:10px;padding:18px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;background:#fafbfb;}
  .drop:hover,.drop.over{border-color:var(--green);background:var(--green-l);}
  .drop.over{border-style:solid;}
  .drop .drophint{font-size:13px;color:var(--gray);line-height:1.6;}
  .drop .browse{color:var(--green-d);font-weight:700;text-decoration:underline;}
  .drop small{color:#9aa0a6;font-size:11.5px;}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
  .chips:empty{margin-top:0;}
  .chip{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:4px 10px;font-size:12.5px;}
  .chip .rm{cursor:pointer;color:var(--gray);font-weight:700;line-height:1;}
  .chip .rm:hover{color:#c0392b;}
  .attachNote{font-size:12.5px;color:var(--green-d);margin-top:8px;}
  .attachNote .sk{color:var(--orange);}
  button{background:var(--green);color:#fff;border:0;border-radius:8px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer;}
  button:hover{background:var(--green-d);} button:disabled{opacity:.5;cursor:not-allowed;}
  .demo{font-size:12.5px;color:var(--orange);margin-top:10px;}
  .steps{margin-top:8px;}
  .step{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--line);}
  .step:last-child{border-bottom:0;}
  .dot{flex:0 0 28px;height:28px;border-radius:50%;background:#e7eaec;color:#9aa0a6;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;}
  .step.run .dot{background:var(--orange);color:#fff;animation:pulse 1.2s infinite;}
  .step.done .dot{background:var(--green);color:#fff;}
  .step.skip .dot{background:#cfd3d7;color:#fff;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
  .step .t{font-weight:700;font-size:15px;}
  .step .s{font-size:12.5px;color:var(--gray);margin-top:2px;}
  .step a{font-size:12.5px;color:var(--green-d);font-weight:700;text-decoration:none;margin-right:12px;}
  .step a:hover{text-decoration:underline;}
  .result{margin-top:22px;display:none;}
  .result.show{display:block;}
  .result a.open{display:inline-block;background:var(--green);color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;}
  .hint{font-size:12.5px;color:var(--gray);margin-top:10px;}
  .err{color:#c0392b;font-weight:700;margin-top:14px;display:none;}
  #viewer{margin-top:18px;border:1px solid var(--line);border-radius:8px;background:#fff;display:none;}
  #viewer pre{padding:18px;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.6;max-height:460px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
  #viewer .vh{padding:10px 14px;border-bottom:1px solid var(--line);font-weight:700;font-size:13px;display:flex;justify-content:space-between;}
  #viewer .vh span.x{cursor:pointer;color:var(--gray);}
  header{position:relative;}
  .gear{position:absolute;top:0;right:0;background:#fff;border:1px solid var(--line);color:var(--gray);
        width:38px;height:38px;border-radius:9px;font-size:18px;line-height:1;cursor:pointer;padding:0;}
  .gear:hover{border-color:var(--green);color:var(--green-d);background:var(--green-l);}
  .modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;align-items:center;justify-content:center;padding:20px;}
  .modal .box{background:#fff;border-radius:14px;max-width:480px;width:100%;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,.2);}
  .modal .mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
  .modal .mh h2{font-size:18px;font-weight:800;}
  .modal .mh .x{cursor:pointer;color:var(--gray);font-size:18px;background:none;border:0;}
  .modal .sub{font-size:12.5px;color:var(--gray);margin-bottom:16px;line-height:1.5;}
  .muted{font-size:13px;color:var(--gray);}
  .err2{font-size:13px;color:#c0392b;font-weight:700;margin-bottom:12px;background:#fdecea;border-radius:8px;padding:10px 12px;}
  table.usage{width:100%;border-collapse:collapse;font-size:13px;}
  table.usage td{padding:9px 0;border-bottom:1px solid var(--line);vertical-align:top;}
  table.usage tr:last-child td{border-bottom:0;}
  table.usage td:first-child{font-weight:700;width:84px;}
  table.usage .num{font-variant-numeric:tabular-nums;font-weight:700;}
  table.usage .bar{height:6px;border-radius:4px;background:#eef0f1;margin-top:6px;overflow:hidden;}
  table.usage .bar i{display:block;height:100%;background:var(--green);}
  table.usage .reset{color:var(--gray);font-size:11.5px;margin-top:4px;}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <button class="gear" id="gearBtn" onclick="openSettings()" title="설정" aria-label="설정">⚙</button>
    <h1>리터니즈 제안서 자동 생성</h1>
    <p>고객사 <b>이름 + 홈페이지 URL</b>만 입력하면 리서치 → 페인포인트 추론 → 스토리라인 → 제안서 초안까지 사람 개입 없이 완주합니다.</p>
    <div class="flow">① 공개정보 리서치 → ② 페인포인트 추론 → ③ 스토리라인 설계 → ④ 제안서 초안 조립</div>
  </header>

  <div class="card" id="formCard">
    <form id="genForm">
      <div class="row">
        <div class="field"><label>회사명 *</label><input name="company" placeholder="예: 안다르" required></div>
        <div class="field"><label>홈페이지 URL *</label><input name="url" placeholder="https://www.andar.co.kr" required></div>
      </div>
      <div class="field">
        <label>회의록 / 메일 / 통화 메모 (선택)</label>
        <textarea name="notes" placeholder="있으면 붙여넣으세요. 페인포인트 추론(STAGE 2)에 반영됩니다. 없으면 공개정보만으로 추론합니다."></textarea>
      </div>
      <div class="field">
        <label>회의록 파일 첨부 (선택)</label>
        <div class="drop" id="dropzone">
          <input type="file" id="fileInput" multiple accept=".txt,.md,.markdown,.csv,.tsv,.json,.log,.text,.html,.htm,.docx" hidden>
          <div class="drophint">파일을 끌어다 놓거나 <span class="browse">클릭해서 선택</span><br><small>txt · md · csv · tsv · json · log · html · docx — 텍스트로 추출해 STAGE 2에 반영</small></div>
        </div>
        <div class="chips" id="fileChips"></div>
      </div>
      <button type="submit" id="goBtn">제안서 생성 시작</button>
      <div class="demo" id="demoNote"></div>
      <div class="attachNote" id="attachNote"></div>
    </form>
  </div>

  <div class="card steps" id="stepsCard" style="display:none">
    <div class="step" data-stage="1"><div class="dot">1</div><div><div class="t">공개정보 리서치</div><div class="s">대기 중</div></div></div>
    <div class="step" data-stage="2"><div class="dot">2</div><div><div class="t">페인포인트 추론 <span style="font-weight:400;color:#9aa0a6">· 판단 레이어</span></div><div class="s">대기 중</div></div></div>
    <div class="step" data-stage="3"><div class="dot">3</div><div><div class="t">스토리라인 설계 <span style="font-weight:400;color:#9aa0a6">· 판단 레이어</span></div><div class="s">대기 중</div></div></div>
    <div class="step" data-stage="4"><div class="dot">4</div><div><div class="t">제안서 초안 조립</div><div class="s">대기 중</div></div></div>
    <div class="err" id="errBox"></div>
    <div id="viewer"><div class="vh"><span id="vTitle"></span><span class="x" onclick="document.getElementById('viewer').style.display='none'">닫기 ✕</span></div><pre id="vBody"></pre></div>
  </div>

  <div class="result" id="resultCard">
    <div class="card">
      <div class="t" style="font-weight:800;font-size:16px;margin-bottom:12px;">✅ 제안서 초안 완성</div>
      <a class="open" id="openProposal" target="_blank">제안서 열기 →</a>
      <div class="hint">새 탭에서 열린 뒤 브라우저 인쇄(⌘P) → 'PDF로 저장'으로 내보낼 수 있습니다. 23슬라이드 덱 골격에 고객사 판단(hero·3카드·KPI·로드맵·체크리스트)만 생성됩니다.</div>
    </div>
  </div>
</div>

<div class="modal" id="settingsModal" onclick="if(event.target===this)closeSettings()">
  <div class="box">
    <div class="mh"><h2>설정 · API 사용량</h2><button class="x" onclick="closeSettings()" aria-label="닫기">✕</button></div>
    <div class="sub">현재 API 키의 분 단위 레이트리밋 잔여치입니다. (Anthropic은 키의 월 잔액·한도를 API로 제공하지 않습니다.)</div>
    <div id="settingsBody"></div>
  </div>
</div>

<script>
const form = document.getElementById('genForm');
const goBtn = document.getElementById('goBtn');
const stepsCard = document.getElementById('stepsCard');
const resultCard = document.getElementById('resultCard');
const errBox = document.getElementById('errBox');
let jobId = null;

// ── 회의록 파일 첨부: 클릭 선택 + 드래그앤드롭 ──────────────────
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileChips = document.getElementById('fileChips');
let picked = [];
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
const fkey = (f)=> f.name+'::'+f.size;
function renderChips(){
  fileChips.innerHTML = picked.map((f,i)=>
    '<span class="chip">📎 '+escapeHtml(f.name)+' <span class="rm" data-i="'+i+'" title="제거">✕</span></span>'
  ).join('');
}
function addFiles(list){
  for(const f of list){ if(!picked.some(p=>fkey(p)===fkey(f))) picked.push(f); }
  renderChips();
}
dropzone.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', ()=>{ addFiles(fileInput.files); fileInput.value=''; });
fileChips.addEventListener('click', (e)=>{
  const rm = e.target.closest('.rm'); if(!rm) return;
  picked.splice(+rm.dataset.i, 1); renderChips();
});
['dragenter','dragover'].forEach(ev=> dropzone.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave','dragend'].forEach(ev=> dropzone.addEventListener(ev, ()=> dropzone.classList.remove('over')));
dropzone.addEventListener('drop', (e)=>{ e.preventDefault(); dropzone.classList.remove('over'); if(e.dataTransfer&&e.dataTransfer.files) addFiles(e.dataTransfer.files); });
// 영역 밖에 떨어뜨려도 브라우저가 파일을 열지 않도록 기본 동작 차단.
['dragover','drop'].forEach(ev=> window.addEventListener(ev, (e)=>{ e.preventDefault(); }));

// ── 설정 모달: API 레이트리밋 잔여치 ──────────────────────────────
async function openSettings(){
  const overlay = document.getElementById('settingsModal');
  const body = document.getElementById('settingsBody');
  overlay.style.display = 'flex';
  body.innerHTML = '<div class="muted">조회 중…</div>';
  try{
    const r = await fetch('/api/usage');
    body.innerHTML = renderUsage(await r.json());
  }catch(e){
    body.innerHTML = '<div class="err2">조회 실패: '+e+'</div>';
  }
}
function closeSettings(){ document.getElementById('settingsModal').style.display='none'; }

function fmtReset(v){
  if(!v) return '';
  const t = Date.parse(v);
  if(isNaN(t)) return String(v);
  const s = Math.max(0, Math.round((t-Date.now())/1000));
  if(s>=60) return Math.floor(s/60)+'분 '+(s%60)+'초 후 리셋';
  return s+'초 후 리셋';
}
function usageRow(label, rem, lim, reset){
  const r = Number(rem), l = Number(lim);
  let bar = '';
  if(!isNaN(r) && !isNaN(l) && l>0){
    const pct = Math.max(0, Math.min(100, Math.round(r/l*100)));
    bar = '<div class="bar"><i style="width:'+pct+'%"></i></div>';
  }
  const remTxt = (rem===undefined ? '?' : Number(rem).toLocaleString());
  const limTxt = (lim===undefined ? '?' : Number(lim).toLocaleString());
  return '<tr><td>'+label+'</td><td><span class="num">'+remTxt+'</span> / '+limTxt+
         bar + (reset ? '<div class="reset">'+fmtReset(reset)+'</div>' : '')+'</td></tr>';
}
function renderUsage(d){
  if(!d || !d.configured) return '<div class="err2">API 키가 설정되어 있지 않습니다 (DEMO 모드).</div>';
  let html = '';
  if(!d.ok){
    if(d.error==='rate_limit') html += '<div class="err2">⚠️ 레이트리밋 도달'+(d.retry_after?' · '+d.retry_after+'초 후 재시도 가능':'')+'</div>';
    else html += '<div class="err2">⚠️ '+(d.message||d.error||'오류')+'</div>';
  }
  const L = d.limits || {};
  const cats = [['requests','요청'],['tokens','토큰'],['input-tokens','입력 토큰'],['output-tokens','출력 토큰']];
  const rows = cats.map(([k,label])=>{
    if(L[k+'-remaining']===undefined && L[k+'-limit']===undefined) return '';
    return usageRow(label, L[k+'-remaining'], L[k+'-limit'], L[k+'-reset']);
  }).filter(Boolean).join('');
  if(!rows) return html + '<div class="muted">레이트리밋 정보를 가져오지 못했습니다.</div>';
  return html + '<table class="usage"><tbody>'+rows+'</tbody></table>';
}

function stepEl(stage){ return document.querySelector(`.step[data-stage="${stage}"]`); }
function setStep(stage, cls, sub){
  const el = stepEl(stage); if(!el) return;
  el.classList.remove('run','done','skip'); if(cls) el.classList.add(cls);
  if(sub!==undefined) el.querySelector('.s').textContent = sub;
}
function addArtifactLink(stage, name){
  const el = stepEl(stage); if(!el) return;
  const holder = el.querySelector('div:last-child');
  if(holder.querySelector(`a[data-a="${name}"]`)) return;
  const a = document.createElement('a');
  a.href='#'; a.dataset.a=name; a.textContent='📄 '+name+' 보기';
  a.onclick=(e)=>{e.preventDefault();viewArtifact(name);};
  holder.appendChild(a);
}
async function viewArtifact(name){
  const r = await fetch(`/api/jobs/${jobId}/artifact/${encodeURIComponent(name)}`);
  const txt = await r.text();
  document.getElementById('vTitle').textContent = name;
  document.getElementById('vBody').textContent = txt;
  document.getElementById('viewer').style.display='block';
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  goBtn.disabled=true; goBtn.textContent='진행 중…';
  errBox.style.display='none'; resultCard.classList.remove('show');
  [1,2,3,4].forEach(s=>setStep(s,'','대기 중'));
  stepsCard.style.display='block';

  const fd = new FormData(form);
  picked.forEach(f=> fd.append('files', f));
  const res = await fetch('/api/generate',{method:'POST',body:fd});
  if(!res.ok){ errBox.textContent='시작 실패: '+(await res.text()); errBox.style.display='block'; goBtn.disabled=false; goBtn.textContent='제안서 생성 시작'; return; }
  const {job_id, demo_mode, attached=[], skipped=[]} = await res.json();
  jobId = job_id;
  document.getElementById('demoNote').textContent = demo_mode ? 'DEMO 모드(API 키 미설정): 워크드 안다르 산출물을 재생하고 조립 경로를 실제 실행합니다.' : '';
  const esc = (a)=> a.map(escapeHtml).join(', ');
  let am = '';
  if(attached.length) am += '📎 첨부 회의록 '+attached.length+'건 반영 ('+esc(attached)+')';
  if(skipped.length) am += '<span class="sk"> · 미지원 '+skipped.length+'건 제외 ('+esc(skipped)+')</span>';
  document.getElementById('attachNote').innerHTML = am;

  let finished = false;
  const es = new EventSource(`/api/jobs/${job_id}/stream`);
  es.onopen = ()=>{ errBox.style.display='none'; };
  es.onmessage = (ev)=>{
    const d = JSON.parse(ev.data);
    if(d.kind==='stage_start') setStep(d.stage,'run','진행 중…');
    else if(d.kind==='stage_progress') setStep(d.stage,'run', d.message||'진행 중…');
    else if(d.kind==='stage_done'){ setStep(d.stage,'done','완료'); if(d.artifact) addArtifactLink(d.stage,d.artifact); }
    else if(d.kind==='stage_skip') setStep(d.stage,'skip',d.reason||'건너뜀');
    else if(d.kind==='error'){ finished=true; errBox.textContent='오류: '+d.message; errBox.style.display='block'; es.close(); goBtn.disabled=false; goBtn.textContent='다시 시도'; }
    else if(d.kind==='done'){
      finished=true;
      document.getElementById('openProposal').href = `/proposals/${job_id}`;
      resultCard.classList.add('show'); es.close();
      goBtn.disabled=false; goBtn.textContent='다시 생성';
      resultCard.scrollIntoView({behavior:'smooth'});
    }
  };
  // 연결이 끊겨도 작업이 끝나지 않았으면 EventSource 자동 재연결에 맡긴다.
  // (서버가 재연결 시 그간의 진행 로그를 다시 흘려줘 상태가 복구된다.)
  es.onerror = ()=>{ if(finished){ es.close(); } };
});
</script>
</body>
</html>
"""
