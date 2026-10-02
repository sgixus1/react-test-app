#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

const auditPath = path.resolve(argValue("--audit", "public/arcanum/ocr/quality-audit.json"));
const ocrRoot = path.resolve(argValue("--ocr-root", "public/arcanum/ocr"));
const outRoot = path.resolve(argValue("--out", "review/arcanum-ocr"));
const includeReviewConfidence = process.argv.includes("--include-review-confidence");

if (!fs.existsSync(auditPath)) throw new Error("Audit not found: " + auditPath);

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8").replace(/^\uFEFF/, ""));
const pageRoot = path.join(ocrRoot, "pages");
const textRoot = path.join(ocrRoot, "text");
fs.mkdirSync(outRoot, { recursive: true });

const records = [];
for (const doc of audit.documents || []) {
  for (const page of doc.flaggedPages || []) {
    const reasons = page.reasons || [];
    const shouldReview =
      page.exhausted === true ||
      reasons.includes("empty") ||
      reasons.includes("low-confidence") ||
      (includeReviewConfidence && reasons.includes("review-confidence"));
    if (!shouldReview) continue;

    const pageBase = page.pageBase || (doc.id + "-p" + String(page.page).padStart(5, "0"));
    const imagePath = path.join(pageRoot, pageBase + ".png");
    const textPath = path.join(textRoot, pageBase + ".txt");
    const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, "utf8").trim() : "";
    records.push({
      id: doc.id,
      filename: doc.filename,
      page: page.page,
      pageBase,
      reasons,
      exhausted: page.exhausted === true,
      exhaustedReason: page.exhaustedReason || null,
      confidence: page.confidence,
      chars: text.length,
      textPreview: text.slice(0, 900),
      imageRelative: fs.existsSync(imagePath) ? path.relative(outRoot, imagePath).replaceAll("\\", "/") : null
    });
  }
}

records.sort((a, b) => {
  const rank = (record) => record.exhausted ? 0 : record.reasons.includes("empty") ? 1 : record.reasons.includes("low-confidence") ? 2 : 3;
  return rank(a) - rank(b) || a.filename.localeCompare(b.filename) || a.page - b.page;
});

const payload = JSON.stringify(records).replaceAll("</script", "<\\/script");
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arcanum OCR Visual Review</title>' +
'<style>:root{color-scheme:dark;--bg:#06080d;--panel:#0c111a;--gold:#d8b365;--ink:#eee6d8;--muted:#9099a7;--line:rgba(216,179,101,.18);--red:#d08072;--green:#8fb98d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,rgba(69,85,145,.16),transparent 28%),var(--bg);color:var(--ink);font:14px/1.5 Inter,Segoe UI,sans-serif}header{position:sticky;top:0;z-index:20;padding:18px 24px;border-bottom:1px solid var(--line);background:rgba(6,8,13,.9);backdrop-filter:blur(16px)}h1{margin:0;font:500 26px Georgia,serif}.sub{color:var(--muted);margin-top:4px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}input,select,button{border:1px solid var(--line);background:#0b1018;color:var(--ink);padding:9px 11px;border-radius:6px}input{min-width:280px;flex:1}button{cursor:pointer}button.active{border-color:var(--gold);color:#f3d99b}.stats{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;color:var(--muted)}.stats b{color:var(--gold)}main{padding:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px}.card{border:1px solid var(--line);background:linear-gradient(180deg,rgba(14,19,29,.96),rgba(7,10,16,.98));border-radius:8px;overflow:hidden;box-shadow:0 18px 46px rgba(0,0,0,.24)}.card.reviewed{opacity:.48}.image{height:470px;background:#030407;display:grid;place-items:center;overflow:hidden}.image img{width:100%;height:100%;object-fit:contain}.missing{color:#756c60}.meta{padding:14px}.meta h2{margin:0 0 4px;font:500 17px Georgia,serif}.meta small{color:var(--muted)}.badges{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.badge{padding:3px 6px;border:1px solid var(--line);border-radius:999px;color:#c6b17e;font-size:11px}.badge.exhausted{color:var(--red)}pre{max-height:170px;overflow:auto;white-space:pre-wrap;padding:10px;border:1px solid rgba(255,255,255,.06);background:#070a10;color:#aeb6c3;font-size:11px}.actions{display:flex;gap:7px}.actions button{flex:1}.actions .good{color:var(--green)}.actions .blank{color:#d7b06c}.actions .manual{color:var(--red)}</style></head><body>' +
'<header><h1>Arcanum OCR Visual Review</h1><div class="sub">Local-only inspection of exhausted and low-quality OCR pages. Nothing here is published.</div><div class="toolbar"><input id="q" placeholder="Filter by book, reason, page, or OCR text…"><select id="status"><option value="all">All statuses</option><option value="unreviewed">Unreviewed</option><option value="good">Usable text</option><option value="blank">Blank / illustration</option><option value="manual">Needs manual OCR</option></select><button data-reason="all" class="active">All</button><button data-reason="exhausted">Exhausted</button><button data-reason="empty">Empty</button><button data-reason="low-confidence">Low confidence</button></div><div class="stats" id="stats"></div></header><main id="grid"></main>' +
'<script>const records=' + payload + ';const storeKey="arcanum-ocr-review-v1";const state=JSON.parse(localStorage.getItem(storeKey)||"{}");let reasonFilter="all";const grid=document.getElementById("grid"),q=document.getElementById("q"),status=document.getElementById("status"),stats=document.getElementById("stats");function esc(v){return String(v).replace(/[&<>"\\x27]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\\x27":"&#39;"})[c]||c})}function save(){localStorage.setItem(storeKey,JSON.stringify(state))}function render(){const needle=q.value.trim().toLowerCase();let shown=0,usable=0,blank=0,manual=0;grid.innerHTML="";records.forEach(function(r){const mark=state[r.pageBase]||"unreviewed";if(mark==="good")usable++;if(mark==="blank")blank++;if(mark==="manual")manual++;const hay=[r.filename,r.page,r.reasons.join(" "),r.textPreview].join(" ").toLowerCase();if(needle&&!hay.includes(needle))return;if(status.value!=="all"&&mark!==status.value)return;if(reasonFilter==="exhausted"&&!r.exhausted)return;if(reasonFilter!=="all"&&reasonFilter!=="exhausted"&&!r.reasons.includes(reasonFilter))return;shown++;const card=document.createElement("article");card.className="card "+(mark!=="unreviewed"?"reviewed":"");const img=r.imageRelative?\'<img loading="lazy" src="\'+r.imageRelative+\'" alt="">\':\'<span class="missing">page image unavailable</span>\';const badges=(r.exhausted?\'<span class="badge exhausted">exhausted</span>\':"")+r.reasons.map(function(x){return \'<span class="badge">\'+esc(x)+"</span>"}).join("");card.innerHTML=\'<div class="image">\'+img+\'</div><div class="meta"><h2>\'+esc(r.filename)+"</h2><small>Page "+r.page+" · "+r.chars+" chars · confidence "+(r.confidence==null?"unknown":r.confidence)+"</small><div class=\\"badges\\">"+badges+"</div><pre>"+esc(r.textPreview||"(no OCR text)")+"</pre><div class=\\"actions\\"><button class=\\"good\\" data-mark=\\"good\\">Usable text</button><button class=\\"blank\\" data-mark=\\"blank\\">Blank / image</button><button class=\\"manual\\" data-mark=\\"manual\\">Needs manual OCR</button></div></div>";card.querySelectorAll("[data-mark]").forEach(function(btn){btn.onclick=function(){state[r.pageBase]=btn.dataset.mark;save();render()}});grid.appendChild(card)});stats.innerHTML="<span><b>"+records.length+"</b> review pages</span><span><b>"+shown+"</b> shown</span><span><b>"+usable+"</b> usable</span><span><b>"+blank+"</b> blank/image</span><span><b>"+manual+"</b> manual OCR</span>"}q.oninput=render;status.onchange=render;document.querySelectorAll("[data-reason]").forEach(function(b){b.onclick=function(){document.querySelectorAll("[data-reason]").forEach(function(x){x.classList.remove("active")});b.classList.add("active");reasonFilter=b.dataset.reason;render()}});render();</script></body></html>';

fs.writeFileSync(path.join(outRoot, "index.html"), html, "utf8");
fs.writeFileSync(path.join(outRoot, "review-records.json"), JSON.stringify(records, null, 2), "utf8");

console.log("Arcanum OCR visual review dashboard built.");
console.log(JSON.stringify({
  reviewPages: records.length,
  exhaustedPages: records.filter((r) => r.exhausted).length,
  emptyPages: records.filter((r) => r.reasons.includes("empty")).length,
  lowConfidencePages: records.filter((r) => r.reasons.includes("low-confidence")).length
}, null, 2));
console.log("Open: " + path.join(outRoot, "index.html"));
