/* ==========================================================================
   PKSP Negeri Terengganu — logik tukar tema (cerah / gelap)
   - Atribut data-tema diletak pada <html> SEBELUM badan halaman dilukis
     (skrip ini dimuat dalam <head>) supaya tiada kelipan tema salah.
   - Pilihan disimpan dalam localStorage; kali pertama ikut tetapan sistem.
   - Butang: mana-mana elemen dengan atribut data-tema-butang.
   - Graf Chart.js: warna paksi/legenda diambil dari sini (terapkanWarnaChart).
   ========================================================================== */
(function () {
  var KUNCI = 'pksp-tema';
  var akar = document.documentElement;

  function temaSemasa() { return akar.getAttribute('data-tema') || 'cerah'; }

  // Warna lalai Chart.js mesti diset SEBELUM graf dicipta; tidak melukis semula
  // (kalau tidak renderAll() -> terapkanWarnaChart() -> renderAll() = gelung).
  window.terapkanWarnaChart = function () {
    if (typeof Chart === 'undefined') return;
    var gelap = temaSemasa() === 'gelap';
    Chart.defaults.color = gelap ? '#94a3b8' : '#475569';
    Chart.defaults.borderColor = gelap ? '#25324a' : '#e2e8f0';
  };

  function setTema(t, simpan) {
    akar.setAttribute('data-tema', t);
    var gelap = t === 'gelap';
    // Label butang + meta theme-color (warna bar pelayar pada telefon)
    var butang = document.querySelectorAll('[data-tema-butang]');
    for (var i = 0; i < butang.length; i++) {
      butang[i].textContent = gelap ? '☀️ Cerah' : '🌙 Gelap';
      butang[i].setAttribute('aria-pressed', gelap ? 'true' : 'false');
      butang[i].title = gelap ? 'Tukar ke tema cerah' : 'Tukar ke tema gelap';
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', gelap ? '#0b1220' : '#0f172a');
    if (simpan) { try { localStorage.setItem(KUNCI, t); } catch (e) {} }
    if (typeof window.terapkanWarnaChart === 'function') window.terapkanWarnaChart();
  }

  window.setTema = function (t) { setTema(t === 'gelap' ? 'gelap' : 'cerah', true); };
  window.toggleTema = function () { setTema(temaSemasa() === 'gelap' ? 'cerah' : 'gelap', true); };
  window.temaSemasa = temaSemasa;

  // Tema awal — dipasang serta-merta (sebelum <body> dilukis)
  var awal = 'cerah';
  try {
    var simpanan = localStorage.getItem(KUNCI);
    if (simpanan === 'gelap' || simpanan === 'cerah') awal = simpanan;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) awal = 'gelap';
  } catch (e) {}
  setTema(awal, false);

  // Pasang klik pada butang + betulkan label selepas DOM sedia
  function pasang() {
    var butang = document.querySelectorAll('[data-tema-butang]');
    for (var i = 0; i < butang.length; i++) {
      if (butang[i].dataset.temaSiap) continue;
      butang[i].dataset.temaSiap = '1';
      butang[i].addEventListener('click', function (e) {
        e.preventDefault();
        window.toggleTema();
        // Graf Chart.js simpan warna pada masa dicipta -> lukis semula
        if (typeof window.renderAll === 'function') window.renderAll();
      });
    }
    setTema(temaSemasa(), false);   // kemas kini label + meta
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang);
  else pasang();
})();
