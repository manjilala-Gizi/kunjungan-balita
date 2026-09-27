/* Impor daftar balita dari file Excel e-PPGBM */
var IMPOR = (function () {
  var KOLOM = {
    nik: ['nik'], nama: ['nama', 'nama balita', 'nama anak'], jk: ['jk', 'jenis kelamin'], tglLahir: ['tgl lahir', 'tanggal lahir'],
    bbl: ['bb lahir', 'berat lahir'], pbl: ['tb lahir', 'pb lahir', 'panjang lahir'], ortu: ['nama ortu', 'nama orang tua', 'orang tua'],
    ayah: ['nama ayah'], ibu: ['nama ibu'], desa: ['desa/kel', 'desa', 'kelurahan', 'desa/kelurahan'], posyandu: ['posyandu'],
    rt: ['rt'], rw: ['rw'], alamat: ['alamat'], tglUkur: ['tanggal pengukuran', 'tgl pengukuran', 'tanggal ukur'],
    bb: ['berat', 'bb'], tb: ['tinggi', 'tb', 'pb/tb'], cara: ['cara ukur'], lila: ['lila'],
    bbu: ['bb/u'], zbbu: ['zs bb/u'], tbu: ['tb/u'], ztbu: ['zs tb/u'], bbtb: ['bb/tb'], zbbtb: ['zs bb/tb'], naik: ['naik berat badan']
  };
  function teks(v) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(function (r) { return r.text; }).join('');
      if (v.text != null) return String(v.text);
      if (v.result != null) return teks(v.result);
      return '';
    }
    return String(v).replace(/ /g, ' ').trim();
  }
  function angka(v) { if (v == null || v === '' || v === '-') return null; var n = typeof v === 'number' ? v : parseFloat(teks(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function tanggal(v) {
    if (v instanceof Date) return v.getUTCFullYear() + '-' + pad(v.getUTCMonth() + 1) + '-' + pad(v.getUTCDate());
    if (v && typeof v === 'object' && v.result instanceof Date) return tanggal(v.result);
    var s = teks(v); var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/))) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    if (typeof v === 'number' && v > 20000 && v < 60000) { var d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); return tanggal(d); }
    return '';
  }
  function nikStr(v) {
    if (v == null) return '';
    if (typeof v === 'number') return v.toFixed(0);
    return teks(v).replace(/^'/, '').replace(/\D/g, '');
  }
  function rapiNama(s) { s = teks(s).replace(/\s+/g, ' ').trim(); return s && s === s.toLowerCase() ? title(s) : s; }
  function pisahOrtu(s) {
    s = rapiNama(s);
    if (!s || s === '-') return { ayah: '', ibu: '' };
    var p = s.split(/\s*[\/&,]\s*|\s+-\s+|\s*-\s*(?=[A-Za-z])|\s+dan\s+/i).map(function (x) { return rapiNama(x); }).filter(Boolean);
    if (p.length >= 2) return { ayah: p[0], ibu: p[1] };
    return { ayah: '', ibu: p[0] };
  }
  function kunci(nama, tgl) { return String(nama || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '|' + tgl; }
  function cariPos(desaRaw, posRaw) {
    var ps = String(posRaw || '').toUpperCase().replace(/^POSYANDU\s+/, '').replace(/\s+/g, ' ').trim();
    var ds = String(desaRaw || '').toUpperCase().replace(/\s+/g, ' ').trim();
    var norm = function (x) { return x.replace(/[^A-Z]/g, ''); };
    var hit = null;
    WILAYAH.forEach(function (w) { w[1].forEach(function (p) { if (!hit && norm(p) === norm(ps) && (!ds || norm(w[0]) === norm(ds) || true)) hit = { desa: w[0], posyandu: p }; }); });
    if (hit && ds && norm(hit.desa) !== norm(ds)) {
      // nama posyandu sama di desa lain? pilih yang desanya cocok
      WILAYAH.forEach(function (w) { if (norm(w[0]) === norm(ds)) w[1].forEach(function (p) { if (norm(p) === norm(ps)) hit = { desa: w[0], posyandu: p }; }); });
    }
    return hit;
  }

  /* Baca file → {tglData, baris:[...], gagal:[{no, alasan}]} */
  function baca(file) {
    if (/\.xls$/i.test(file.name)) return Promise.reject(new Error('File .xls (format lama) belum didukung. Buka di Excel, lalu Simpan Sebagai "Buku Kerja Excel (.xlsx)".'));
    return file.arrayBuffer().then(function (buf) {
      var wb = new ExcelJS.Workbook();
      return wb.xlsx.load(buf).then(function () { return wb; });
    }).then(function (wb) {
      var ws = wb.worksheets[0];
      if (!ws) throw new Error('File tidak berisi lembar kerja.');
      var headRow = 0, col = {}, tglData = '';
      for (var r = 1; r <= Math.min(15, ws.rowCount); r++) {
        var vals = []; ws.getRow(r).eachCell({ includeEmpty: true }, function (c, i) { vals[i] = teks(c.value).toLowerCase(); });
        var t = vals.join(' ');
        var m = t.match(/data tanggal\s*:\s*(\d{4}-\d{2}-\d{2})/); if (m) tglData = m[1];
        if (vals.indexOf('nama') >= 0 && (vals.indexOf('tgl lahir') >= 0 || vals.indexOf('tanggal lahir') >= 0)) {
          headRow = r;
          Object.keys(KOLOM).forEach(function (k) { for (var i = 1; i < vals.length; i++) if (vals[i] && KOLOM[k].indexOf(vals[i].trim()) >= 0 && !col[k]) { col[k] = i; break; } });
          break;
        }
      }
      if (!headRow) throw new Error('Judul kolom "Nama" dan "Tgl Lahir" tidak ditemukan. Pastikan file adalah ekspor daftar balita e-PPGBM.');
      var baris = [], gagal = [];
      for (var rr = headRow + 1; rr <= ws.rowCount; rr++) {
        var row = ws.getRow(rr);
        var g = function (k) { return col[k] ? row.getCell(col[k]).value : null; };
        var nama = rapiNama(g('nama'));
        if (!nama) continue;
        var tl = tanggal(g('tglLahir'));
        var jkRaw = teks(g('jk')).toUpperCase();
        var jk = jkRaw.charAt(0) === 'L' ? 'L' : jkRaw.charAt(0) === 'P' ? 'P' : '';
        var pos = cariPos(teks(g('desa')), teks(g('posyandu')));
        var alasan = [];
        if (!tl) alasan.push('tanggal lahir kosong/tidak terbaca');
        if (!jk) alasan.push('jenis kelamin kosong');
        if (!pos) alasan.push('posyandu "' + teks(g('posyandu')) + '" tidak dikenal');
        if (alasan.length) { gagal.push({ no: rr, nama: nama, alasan: alasan.join(', ') }); continue; }
        var bbl = angka(g('bbl')); if (bbl != null && bbl > 0 && bbl < 10) bbl = Math.round(bbl * 1000); if (bbl != null && (bbl < 500 || bbl > 6000)) bbl = null;
        var pbl = angka(g('pbl')); if (pbl != null && (pbl < 30 || pbl > 60)) pbl = null;
        var ortu = col.ayah || col.ibu ? { ayah: rapiNama(g('ayah')), ibu: rapiNama(g('ibu')) } : pisahOrtu(g('ortu'));
        var rt = teks(g('rt')), rw = teks(g('rw')), al = rapiNama(g('alamat'));
        var alamat = [al, rt && rt !== '-' ? 'RT ' + rt : '', rw && rw !== '-' ? 'RW ' + rw : ''].filter(Boolean).join(' ');
        var tu = tanggal(g('tglUkur'));
        var ep = tu ? {
          tgl: tu, bb: angka(g('bb')), tb: angka(g('tb')), cara: teks(g('cara')), lila: angka(g('lila')),
          bbu: teks(g('bbu')), zbbu: angka(g('zbbu')), tbu: teks(g('tbu')), ztbu: angka(g('ztbu')), bbtb: teks(g('bbtb')), zbbtb: angka(g('zbbtb')),
          naik: teks(g('naik')), unduh: tglData
        } : null;
        baris.push({
          no: rr, nik: nikStr(g('nik')), nama: nama, jk: jk, tglLahir: tl, desa: pos.desa, posyandu: pos.posyandu, alamat: alamat,
          bbl: bbl, pbl: pbl, ayah: ortu.ayah, ibu: ortu.ibu, ortuAsli: rapiNama(g('ortu')), eppgbm: ep
        });
      }
      return { tglData: tglData, baris: baris, gagal: gagal, nama: file.name };
    });
  }

  function isSasaran(b) { var e = b && b.eppgbm; return !!(e && /kurang/i.test(e.bbu || '')); }

  /* Cocokkan dengan data yang ada → {baru:[], perbarui:[{lama, x}]} */
  function cocokkan(hasilBaca) {
    var byNik = {}, byKey = {};
    S.balita.forEach(function (b) { if (b.nik) byNik[b.nik] = b; byKey[kunci(b.nama, b.tglLahir)] = b; });
    var baru = [], perbarui = [];
    hasilBaca.baris.forEach(function (x) {
      var lama = (x.nik && byNik[x.nik]) || byKey[kunci(x.nama, x.tglLahir)];
      if (lama) perbarui.push({ lama: lama, x: x }); else baru.push(x);
    });
    return { baru: baru, perbarui: perbarui };
  }

  function simpan(cocok, pilihPos) {
    var now = Date.now(), recs = [];
    var ok = function (x) { return !pilihPos || pilihPos[x.posyandu]; };
    cocok.baru.filter(ok).forEach(function (x, i) {
      recs.push({
        id: uid() + i.toString(36), nama: x.nama, nik: x.nik, jk: x.jk, tglLahir: x.tglLahir, anakKe: '', desa: x.desa, posyandu: x.posyandu, alamat: x.alamat,
        uk: null, kategoriLahir: '', bbl: x.bbl, pbl: x.pbl, lkl: null,
        ayah: { nama: x.ayah, nik: '', pendidikan: '', pekerjaan: '' }, ibu: { nama: x.ibu, nik: '', pendidikan: '', pekerjaan: '' },
        eppgbm: x.eppgbm, sumber: 'e-PPGBM', ortuAsli: x.ortuAsli, ortuCek: true, createdAt: now, updatedAt: now, _dirty: 1
      });
    });
    cocok.perbarui.filter(function (p) { return ok(p.x); }).forEach(function (p) {
      var b = JSON.parse(JSON.stringify(p.lama)), x = p.x;
      // isi yang masih kosong saja, data yang sudah diedit petugas tidak ditimpa
      ['nik', 'alamat', 'bbl', 'pbl'].forEach(function (k) { if ((b[k] == null || b[k] === '') && x[k] != null && x[k] !== '') b[k] = x[k]; });
      b.ayah = b.ayah || {}; b.ibu = b.ibu || {};
      if (!b.ayah.nama && x.ayah) b.ayah.nama = x.ayah;
      if (!b.ibu.nama && x.ibu) b.ibu.nama = x.ibu;
      if (x.eppgbm && (!b.eppgbm || x.eppgbm.tgl >= b.eppgbm.tgl)) b.eppgbm = x.eppgbm;
      b.updatedAt = now; b._dirty = 1;
      recs.push(b);
    });
    return DB.putMany('balita', recs).then(function () {
      recs.forEach(function (o) { applyMem('balita', o); });
      if (window.SYNC) SYNC.soon();
      return recs.length;
    });
  }
  return { baca: baca, cocokkan: cocokkan, simpan: simpan, isSasaran: isSasaran, pisahOrtu: pisahOrtu };
})();
