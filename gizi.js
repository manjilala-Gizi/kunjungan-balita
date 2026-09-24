/* ===== Inti perhitungan status gizi (WHO 2006, kategori PMK 2/2020) ===== */
var GIZI = (function () {
  var LMS = null;
  function init(tables) { LMS = tables; }

  function lmsAt(table, sex, x) {
    var t = LMS[table][sex];
    var pos = (x - t.start) / t.step;
    if (pos < -1e-9 || pos > t.n - 1 + 1e-9) return null;
    var i = Math.floor(pos + 1e-9);
    if (i >= t.n - 1) return t.lms[t.n - 1];
    var f = pos - i;
    if (f < 1e-9) return t.lms[i];
    var a = t.lms[i], b = t.lms[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function zRaw(y, p) {
    var L = p[0], M = p[1], S = p[2];
    if (Math.abs(L) < 1e-12) return Math.log(y / M) / S;
    return (Math.pow(y / M, L) - 1) / (L * S);
  }
  function sdAt(p, k) {
    var L = p[0], M = p[1], S = p[2];
    return M * Math.pow(1 + L * S * k, 1 / L);
  }
  // z-score berbasis berat: penyesuaian WHO di luar +/-3 SD
  function zWeight(y, p) {
    var z = zRaw(y, p);
    if (z > 3) {
      var sd3 = sdAt(p, 3), sd23 = sd3 - sdAt(p, 2);
      z = 3 + (y - sd3) / sd23;
    } else if (z < -3) {
      var sd3n = sdAt(p, -3), sd23n = sdAt(p, -2) - sd3n;
      z = -3 + (y - sd3n) / sd23n;
    }
    return z;
  }
  function r2(z) { return Math.round(z * 100) / 100; }

  function kategoriBBU(z) {
    if (z < -3) return 'Sangat Kurang';
    if (z < -2) return 'Kurang';
    if (z <= 1) return 'Normal';
    return 'Risiko BB Lebih';
  }
  function kategoriTBU(z) {
    if (z < -3) return 'Sangat Pendek';
    if (z < -2) return 'Pendek';
    if (z <= 3) return 'Normal';
    return 'Tinggi';
  }
  function kategoriBBTB(z) {
    if (z < -3) return 'Gizi Buruk';
    if (z < -2) return 'Gizi Kurang';
    if (z <= 1) return 'Gizi Baik';
    if (z <= 2) return 'Berisiko Gizi Lebih';
    if (z <= 3) return 'Gizi Lebih';
    return 'Obesitas';
  }

  function umurHari(tglLahir, tglUkur) {
    var a = Date.UTC(+tglLahir.slice(0, 4), +tglLahir.slice(5, 7) - 1, +tglLahir.slice(8, 10));
    var b = Date.UTC(+tglUkur.slice(0, 4), +tglUkur.slice(5, 7) - 1, +tglUkur.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  /**
   * inp: {jk:'L'|'P', tglLahir:'YYYY-MM-DD', tglUkur:'YYYY-MM-DD', bb, tb, caraUkur:'terlentang'|'berdiri'}
   */
  function hitung(inp) {
    var out = { umurHari: null, umurBulan: null, tbKoreksi: null, pesan: [] };
    if (!inp.tglLahir || !inp.tglUkur || !inp.jk) { out.pesan.push('Tanggal lahir, tanggal ukur, dan jenis kelamin wajib diisi'); return out; }
    var sex = inp.jk === 'L' ? 'male' : 'female';
    var d = umurHari(inp.tglLahir, inp.tglUkur);
    out.umurHari = d;
    out.umurBulan = d / 30.4375;
    if (d < 0) { out.pesan.push('Tanggal lahir sesudah tanggal kunjungan'); return out; }
    if (d > 1856) { out.pesan.push('Umur di atas 60 bulan (di luar standar balita)'); return out; }
    var bb = parseFloat(inp.bb), tb = parseFloat(inp.tb);
    var dibawah2th = d < 731;

    if (bb > 0) {
      var p = lmsAt('wfa', sex, d);
      if (p) { var z = r2(zWeight(bb, p)); out.zBBU = z; out.BBU = kategoriBBU(z); if (z < -6 || z > 5) out.pesan.push('z BB/U di luar batas wajar (cek ulang BB/tanggal lahir)'); }
    }
    if (tb > 0) {
      var tbk = tb;
      if (dibawah2th && inp.caraUkur === 'berdiri') tbk = tb + 0.7;
      if (!dibawah2th && inp.caraUkur === 'terlentang') tbk = tb - 0.7;
      tbk = Math.round(tbk * 10) / 10;
      out.tbKoreksi = tbk;
      var q = lmsAt('lfa', sex, d);
      if (q) { var z2 = r2(zRaw(tbk, q)); out.zTBU = z2; out.TBU = kategoriTBU(z2); if (z2 < -6 || z2 > 6) out.pesan.push('z TB/U di luar batas wajar (cek ulang TB/tanggal lahir)'); }
      if (bb > 0) {
        var tab = dibawah2th ? 'wfl' : 'wfh';
        var r = lmsAt(tab, sex, tbk);
        if (r) { var z3 = r2(zWeight(bb, r)); out.zBBTB = z3; out.BBTB = kategoriBBTB(z3); if (z3 < -5 || z3 > 5) out.pesan.push('z BB/TB di luar batas wajar (cek ulang BB/TB)'); }
        else out.pesan.push(dibawah2th ? 'PB di luar rentang tabel BB/PB (45–110 cm)' : 'TB di luar rentang tabel BB/TB (65–120 cm)');
      }
    }
    return out;
  }

  return { init: init, hitung: hitung, umurHari: umurHari, kategoriBBU: kategoriBBU, kategoriTBU: kategoriTBU, kategoriBBTB: kategoriBBTB };
})();
if (typeof module !== 'undefined') module.exports = GIZI;
