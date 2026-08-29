#!/usr/bin/env node
/**
 * Genera el PDF del informe de nutrición a partir de un JSON de datos.
 *
 *   node report.js datos.json salida.pdf
 *
 * El contrato del JSON está documentado en SKILL.md. Este archivo NO consulta la
 * base de datos: recibe los números ya agregados y se ocupa solo de la maqueta,
 * la geometría de los gráficos y el render. Así el mismo layout sirve para
 * cualquier rango de fechas sin tocar el código.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const S1 = '#2a78d6';   // serie única: slot categórico 1, validado ≥3:1 sobre la superficie
const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#8a8880';
const SURFACE = '#fcfcfb', GRID = '#e8e7e3', RULE = '#d8d7d2';

const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = path.resolve(process.argv[3] || 'reporte-nutricion.pdf');

const num = n => Number(n).toLocaleString('es-CO');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const days = D.days || [];
const avg = D.averages || {};
const goal = D.goal || {};
const withData = days.filter(d => d.kcal != null);
const complete = withData.filter(d => !d.partial);

/* Rótulo con fondo: las líneas de meta y promedio cruzan barras, y sin este
   respaldo el texto se vuelve ilegible justo encima de una columna alta. */
function tag(x, yPos, text, color, size = 8.5) {
  const w = text.length * size * 0.55;
  return `<rect x="${x - w - 3}" y="${yPos - size}" width="${w + 6}" height="${size + 3}" fill="${SURFACE}" opacity="0.9"/>`
       + `<text x="${x}" y="${yPos}" text-anchor="end" font-size="${size}" font-weight="600" fill="${color}">${text}</text>`;
}

/* ── Calorías por día ───────────────────────────────────────────────────────
   Se adapta al número de días: las barras adelgazan y los rótulos del eje se
   ralean para que un rango de 30 días no se convierta en una pared de texto. */
function dailyChart() {
  if (!withData.length) return '<div class="sub">Sin registros en el rango.</div>';
  const n = days.length;
  const dense = n > 14;
  const W = 690, H = dense ? 196 : 208;
  const padL = 32, padR = 8, padT = 15, padB = dense ? 20 : 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const peak = Math.max(...withData.map(d => d.kcal), goal.kcal || 0);
  const yMax = Math.ceil((peak * 1.06) / 250) * 250;
  const tickStep = yMax > 3000 ? 1000 : 500;
  const y = v => padT + plotH - (v / yMax) * plotH;
  const step = plotW / n;
  const bw = Math.max(3, Math.min(30, step - 8));
  const labelEvery = n <= 14 ? 1 : n <= 24 ? 2 : Math.ceil(n / 12);

  // etiquetas directas solo en los extremos y en los días incompletos
  const hi = Math.max(...complete.map(d => d.kcal));
  const lo = Math.min(...complete.map(d => d.kcal));
  const labelled = new Set(complete.filter(d => d.kcal === hi || d.kcal === lo).map(d => d.date));

  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Calorías registradas por día contra la meta">`;
  for (let v = 0; v <= yMax; v += tickStep) {
    s += `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>`;
    s += `<text x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end" font-size="8.5" fill="${MUTED}">${v}</text>`;
  }
  days.forEach((d, i) => {
    const cx = padL + step * i + step / 2;
    if (d.kcal == null) {
      if (!dense) {
        s += `<text x="${cx}" y="${y(0) - 12}" text-anchor="middle" font-size="8" fill="${MUTED}">sin</text>`;
        s += `<text x="${cx}" y="${y(0) - 3}" text-anchor="middle" font-size="8" fill="${MUTED}">reg.</text>`;
      }
    } else {
      const h = Math.max(2, y(0) - y(d.kcal));
      const fill = d.partial ? 'url(#hatch)' : S1;
      const r = Math.min(4, bw / 2);
      s += `<rect x="${cx - bw / 2}" y="${y(d.kcal)}" width="${bw}" height="${h}" rx="${r}" fill="${fill}"/>`;
      s += `<rect x="${cx - bw / 2}" y="${y(d.kcal) + r}" width="${bw}" height="${h - r}" fill="${fill}"/>`;
      if ((labelled.has(d.date) || d.partial) && !dense)
        s += `<text x="${cx}" y="${y(d.kcal) - 5}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${INK2}">${d.kcal}</text>`;
    }
    if (i % labelEvery === 0) {
      s += `<text x="${cx}" y="${H - (dense ? 6 : 15)}" text-anchor="middle" font-size="8.5" fill="${INK2}">${esc(d.dayNum)}</text>`;
      if (!dense) s += `<text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="7" fill="${MUTED}">${esc(d.dow)}</text>`;
    }
  });
  s += `<line x1="${padL}" y1="${y(0)}" x2="${W - padR}" y2="${y(0)}" stroke="${RULE}" stroke-width="1"/>`;
  if (goal.kcal) {
    s += `<line x1="${padL}" y1="${y(goal.kcal)}" x2="${W - padR}" y2="${y(goal.kcal)}" stroke="${INK}" stroke-width="1.5"/>`;
    s += tag(W - padR, y(goal.kcal) - 5, `meta ${num(goal.kcal)} kcal`, INK);
  }
  s += `<line x1="${padL}" y1="${y(avg.kcal)}" x2="${W - padR}" y2="${y(avg.kcal)}" stroke="${S1}" stroke-width="1.5"/>`;
  s += tag(W - padR, y(avg.kcal) - 5, `promedio ${num(avg.kcal)}`, S1);
  s += `<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">`;
  s += `<rect width="6" height="6" fill="${SURFACE}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${S1}" stroke-width="3"/></pattern></defs>`;
  return s + `</svg>`;
}

/* ── Medidores de macro contra meta ───────────────────────────────────────── */
function meters() {
  const rows = [
    ['Calorías', avg.kcal, goal.kcal, 'kcal'],
    ['Proteína', avg.protein, goal.protein, 'g'],
    ['Carbohidratos', avg.carbs, goal.carbs, 'g'],
    ['Grasa', avg.fat, goal.fat, 'g'],
  ].filter(([, v, g]) => v != null && g != null);
  return rows.map(([name, val, g, unit]) => {
    const pct = Math.round((val / g) * 100);
    return `<div class="meter">
      <div class="meter-head"><span class="meter-name">${name}</span>
        <span class="meter-val"><b>${num(val)}</b> / ${num(g)} ${unit} <span class="meter-pct">${pct}%</span></span></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, pct)}%"></div></div>
    </div>`;
  }).join('');
}

/* ── Peso corporal ────────────────────────────────────────────────────────── */
function weightChart() {
  const w = D.weights || [];
  if (w.length < 2) return null;
  const W = 320, H = 112, padL = 28, padR = 12, padT = 14, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = w.map(p => p.kg);
  const span = Math.max(...vals) - Math.min(...vals);
  const pad = Math.max(0.3, span * 0.35);
  const lo = Math.min(...vals) - pad, hi = Math.max(...vals) + pad;
  const y = v => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const x = i => padL + (plotW / (w.length - 1)) * i;

  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15]
    .map(v => Math.round(v * 2) / 2);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Peso corporal en el rango">`;
  [...new Set(ticks)].forEach(v => {
    s += `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>`;
    s += `<text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-size="7.5" fill="${MUTED}">${v.toFixed(1)}</text>`;
  });
  s += `<polyline points="${w.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')}" fill="none" stroke="${S1}" stroke-width="2" stroke-linejoin="round"/>`;
  const labelEvery = w.length <= 12 ? 2 : Math.ceil(w.length / 6);
  w.forEach((p, i) => {
    s += `<circle cx="${x(i)}" cy="${y(p.kg)}" r="2.8" fill="${S1}" stroke="${SURFACE}" stroke-width="2"/>`;
    // solo el extremo lleva etiqueta directa: en el arranque la pisa el rótulo del eje
    if (i === w.length - 1)
      s += `<text x="${x(i)}" y="${y(p.kg) - 8}" text-anchor="middle" font-size="8" font-weight="600" fill="${INK2}">${String(p.kg).replace('.', ',')}</text>`;
    if (i % labelEvery === 0 || i === w.length - 1)
      s += `<text x="${x(i)}" y="${H - 5}" text-anchor="middle" font-size="7.5" fill="${MUTED}">${esc(p.dayNum)}</text>`;
  });
  return s + `</svg>`;
}

/* ── Barras horizontales ──────────────────────────────────────────────────── */
function hbars(items, cls) {
  if (!items.length) return '';
  const max = Math.max(...items.map(i => i.value));
  return items.map(it => `<div class="hbar ${cls}">
      <div class="hbar-label">${esc(it.label)}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${(it.value / max) * 96}%"></div></div>
      <div class="hbar-value">${it.right}</div>
    </div>`).join('');
}

const mealBars = hbars((D.meals || []).map(m => ({
  label: m.name, value: m.kcalPerDay,
  right: `<b>${num(m.kcalPerDay)}</b> kcal · ${num(m.proteinPerDay)} g P`,
})), 'compact');

const foodBars = hbars((D.foods || []).slice(0, 8).map(f => ({
  label: f.name, value: f.kcal,
  right: `<b>${num(f.kcal)}</b> · ${f.days} d`,
})), 'food');

const wChart = weightChart();
const kpis = (D.kpis || []).map(k => `<div class="kpi">
    <div class="kpi-label">${esc(k.label)}</div>
    <div class="kpi-value">${esc(k.value)}${k.unit === "%" ? "" : " "}<small>${esc(k.unit || "")}</small></div>
    <div class="kpi-note">${esc(k.note || '')}</div></div>`).join('');

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Reporte de nutrición</title>
<style>
  @page { size: A4; margin: 11mm 12mm; }
  * { box-sizing: border-box; }
  body { margin:0; background:${SURFACE}; color:${INK};
    font: 10.3px/1.47 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size:18px; margin:0 0 1px; letter-spacing:-0.2px; }
  h2 { font-size:10.5px; margin:0 0 6px; letter-spacing:0.04em; text-transform:uppercase; color:${INK2}; }
  .sub { color:${INK2}; font-size:9px; line-height:1.4; }
  header { border-bottom:2px solid ${INK}; padding-bottom:7px; margin-bottom:10px;
    display:flex; justify-content:space-between; align-items:flex-end; }
  section { margin-bottom:14px; }
  .kpis { display:grid; grid-template-columns:repeat(${Math.max(1, (D.kpis || []).length)},1fr); gap:8px; margin-bottom:12px; }
  .kpi { border:1px solid ${RULE}; border-radius:6px; padding:9px 11px; }
  .kpi-label { font-size:8px; text-transform:uppercase; letter-spacing:0.05em; color:${MUTED}; margin-bottom:2px; }
  .kpi-value { font-size:21px; font-weight:650; letter-spacing:-0.5px; line-height:1.05; }
  .kpi-value small { font-size:10px; font-weight:500; color:${INK2}; }
  .kpi-note { font-size:8px; color:${INK2}; margin-top:1px; }
  .meter { margin-bottom:7px; }
  .meter-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px; }
  .meter-name { font-weight:600; }
  .meter-val { font-size:9px; color:${INK2}; }
  .meter-pct { display:inline-block; min-width:28px; text-align:right; font-weight:650; color:${INK}; }
  .track { height:6px; background:${GRID}; border-radius:3px; overflow:hidden; }
  .fill { height:100%; background:${S1}; border-radius:3px; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .hbar { display:grid; gap:7px; align-items:center; margin-bottom:5px; }
  .hbar.compact { grid-template-columns:64px 1fr 96px; }
  .hbar.food { grid-template-columns:150px 1fr 78px; }
  .hbar-label { font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .hbar-track { height:10px; background:${GRID}; border-radius:3px; }
  .hbar-fill { height:100%; background:${S1}; border-radius:3px; }
  .hbar-value { font-size:8.5px; color:${INK2}; text-align:right; }
  .notes { margin:0; padding-left:15px; font-size:9.5px; }
  .notes li { margin-bottom:3px; }
  .notes b { font-weight:650; }
  .flag { border-left:3px solid ${S1}; background:#f4f8fe; padding:7px 10px;
    border-radius:0 5px 5px 0; margin-bottom:7px; font-size:9.5px; }
  .foot { margin-top:10px; padding-top:6px; border-top:1px solid ${RULE};
    font-size:7.5px; color:${MUTED}; line-height:1.4; }
</style></head><body>

<header>
  <div><h1>Reporte de nutrición</h1>
    <div class="sub">${esc(D.meta.rangeLabel)} · ${num(D.meta.totalLogs)} alimentos en ${D.meta.daysWithData} días</div></div>
  <div class="sub" style="text-align:right">${esc(D.meta.userName)}<br>Generado ${esc(D.meta.generatedOn)}</div>
</header>

<div class="kpis">${kpis}</div>

<section>
  <h2>Ingesta diaria contra la meta</h2>
  ${dailyChart()}
  <div class="sub" style="margin-top:3px">${D.captions.daily}</div>
</section>

<div class="two">
  <section>
    <h2>Macronutrientes: promedio contra meta</h2>
    ${meters()}
    <div class="sub">${D.captions.macros}</div>
  </section>
  ${wChart ? `<section>
    <h2>Peso corporal</h2>
    ${wChart}
    <div class="sub">${D.captions.weight}</div>
  </section>` : '<section></section>'}
</div>

<section>
  <h2>Para revisar en consulta</h2>
  <div class="flag"><b>${esc(D.flag.title)}</b> ${D.flag.body}</div>
  <ul class="notes">${(D.notes || []).map(n => `<li>${n}</li>`).join('')}</ul>
</section>

<div class="two">
  <section>
    <h2>Por tiempo de comida</h2>
    ${mealBars}
    <div class="sub" style="margin-top:4px">${D.captions.meals}</div>
  </section>
  <section>
    <h2>Alimentos que más aportan</h2>
    ${foodBars}
    <div class="sub" style="margin-top:4px">${D.captions.foods}</div>
  </section>
</div>

<div class="foot">${D.captions.method}</div>

</body></html>`;

const htmlPath = OUT.replace(/\.pdf$/, '') + '.html';
fs.writeFileSync(htmlPath, html);

const chrome = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable']
  .find(b => { try { execFileSync('which', [b], { stdio: 'pipe' }); return true; } catch { return false; } });
if (!chrome) { console.error('No encontré Chrome/Chromium para renderizar. HTML en:', htmlPath); process.exit(1); }

execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${path.join(path.dirname(OUT), '.chrome-profile')}`,
  '--no-pdf-header-footer', `--print-to-pdf=${OUT}`, `file://${htmlPath}`],
  { stdio: 'pipe' });

console.log('PDF:', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
console.log('HTML:', htmlPath);
