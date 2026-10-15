const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

// Shim DOM yang sama macam tests/kk-utc.cjs — jalankan skrip dashboard sehingga sebelum init().
function load(file, stop) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const elements = {};
  const document = { getElementById(id) { return elements[id] ||= { value: '', innerHTML: '', textContent: '', style: {} }; } };
  const context = vm.createContext({ document, supabase: { createClient: () => ({}) }, console, XLSX: require(path.join(root, 'xlsx.full.min.js')) });
  vm.runInContext(script.slice(0, script.lastIndexOf(stop)), context);
  return { run: code => vm.runInContext(code, context), elements };
}

const dash = load('dashboard.html', 'init();');
const el = id => dash.elements[id].textContent;
const disp = id => dash.elements[id].style.display;

// Data sintetik sahaja — tiada tulisan ke cloud.
// SUMBER SAH kad ini: nilai D KPI 1 dari 6 hospital + 4 PKD.
// 2026-09 KPI: HSNZ 100/200, Dungun 50/100, PKD Hulu Terengganu 10/20 => D=320, N=160
// 2026-08 KPI: HSNZ 1/3                                               => setahun D=323
// Gangguan yang MESTI diabaikan: KK Kuala Berang SMRP D=40, Hospital Setiu SMRP D=999
dash.run(`
allData = [
  {hospital:'Hospital Sultanah Nur Zahirah (HSNZ)', kategori:'hospital', year:2026, month:9, kpi:{kpi1:{numerator:100, denominator:200}}, smrp:{smrp1:{numerator:9, denominator:900}}},
  {hospital:'Hospital Dungun', kategori:'hospital', year:2026, month:9, kpi:{kpi1:{numerator:50, denominator:100}}, smrp:{}},
  {hospital:'Pejabat Kesihatan Hulu Terengganu', kategori:'hospital', year:2026, month:9, kpi:{kpi1:{numerator:10, denominator:20}}, smrp:{}},
  {hospital:'Hospital Sultanah Nur Zahirah (HSNZ)', kategori:'hospital', year:2026, month:8, kpi:{kpi1:{numerator:1, denominator:3}}, smrp:{}},
  {hospital:'KK Kuala Berang', kategori:'kk', year:2026, month:9, kpi:{}, smrp:{smrp1:{numerator:5, denominator:40}}},
  {hospital:'Hospital Setiu', kategori:'hospital', year:2026, month:9, kpi:{}, smrp:{smrp1:{numerator:10, denominator:999}}},
];
$('fYear').value='2026'; $('fMonth').value=''; $('fKat').value=''; $('fMetric').value='kpi:kpi1';
`);

// --- Dua panel: Bulan semasa + Setahun (kumulatif) ---
dash.run('renderKesNegeri();');
assert.equal(disp('kesCard'), 'block', 'kad patut dipapar bila ada data KPI');
assert.equal(el('kesBulanLabel'), 'Bulan September 2026');
assert.equal(el('kesBulanJumlah'), '320', 'jumlah D negeri = 200 + 100 + 20 (SMRP tidak dikira)');
assert.equal(el('kesBulanDetail'), 'Hospital 300 + PKD 20 · 3/10 unit hantar · N=160');
assert.equal(el('kesTahunLabel'), 'Setahun Jan–September 2026');
assert.equal(el('kesTahunJumlah'), '323', 'setahun termasuk Ogos (D=3)');
assert.ok(el('kesMetrik').includes('jumlah keseluruhan pesakit yang dirujuk'));
assert.ok(el('kesMetrik').includes('6 hospital + 4 PKD'));

// --- penapis Metrik = SMRP TIDAK boleh mengubah kad (sumber tunggal = KPI 1) ---
dash.run("$('fMetric').value='smrp:smrp1'; renderKesNegeri();");
assert.equal(el('kesBulanJumlah'), '320', 'kad kekal KPI 1 walau penapis Metrik = SMRP');
assert.ok(el('kesMetrik').includes('KPI 1'));

// --- penapis Kategori tidak menyempitkan jumlah negeri ---
dash.run("$('fKat').value='kk'; renderKesNegeri();");
assert.equal(disp('kesCard'), 'block', 'Kategori=KK tidak boleh menyorok kad negeri');
assert.equal(el('kesBulanJumlah'), '320');
dash.run("$('fKat').value=''; $('fMetric').value='kpi:kpi1';");

// --- penapis Bulan/Tahun masih berfungsi ---
dash.run("$('fMonth').value='8'; renderKesNegeri();");
assert.equal(el('kesBulanLabel'), 'Bulan Ogos 2026');
assert.equal(el('kesBulanJumlah'), '3');
assert.equal(el('kesTahunJumlah'), '323', 'panel setahun tak terkesan oleh penapis Bulan');
dash.run("$('fMonth').value=''; $('fYear').value=''; renderKesNegeri();");
assert.equal(el('kesBulanJumlah'), '320', 'tahun kosong -> guna tahun terkini');

// --- tiada data langsung: sembunyi, bukan NaN ---
dash.run('allData=[]; renderKesNegeri();');
assert.equal(disp('kesCard'), 'none');

console.log('PASS: kad Jumlah Kes — Bulan (semasa) + Setahun (kumulatif) = jumlah D KPI 1 (6 hospital + 4 PKD); SMRP & penapis Metrik/Kategori tidak menjejaskannya.');
