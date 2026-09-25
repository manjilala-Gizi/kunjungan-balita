/* Kebiasaan makan (pilihan) + Edukasi gizi (pilih lebih dari satu) + saran edukasi otomatis */
var KM = (function () {
  var FREK = ['Setiap hari', 'Kadang-kadang', 'Jarang/tidak pernah'];
  // [kunci, label pertanyaan, pilihan, jenis ('satu' | 'banyak')]
  var ASPEK = [
    ['makan', 'Frekuensi makan utama', ['1x', '2x', '3x', '>3x'], 'satu', '/hari'],
    ['selingan', 'Makanan selingan', ['Tidak ada', '1x', '2x', '≥3x'], 'satu', '/hari'],
    ['jenisSelingan', 'Jenis selingan / jajanan (boleh lebih dari satu)', ['Buah', 'Kue tradisional', 'Biskuit/roti', 'Makanan ringan kemasan (chiki)', 'Minuman manis/kemasan', 'Susu/yogurt', 'Gorengan'], 'banyak'],
    ['nafsu', 'Nafsu makan', ['Baik', 'Kurang', 'Pilih-pilih (GTM)'], 'satu'],
    ['sayur', 'Konsumsi sayur', FREK, 'satu'],
    ['buah', 'Konsumsi buah', FREK, 'satu'],
    ['hewani', 'Lauk hewani (ikan, telur, ayam, daging)', FREK, 'satu'],
    ['jajan', 'Jajanan kemasan / minuman manis', ['Sering', 'Kadang-kadang', 'Jarang/tidak pernah'], 'satu'],
    ['susu', 'Susu yang diminum (boleh lebih dari satu)', ['ASI', 'Susu formula', 'Susu kotak (UHT)', 'Kental manis', 'Tidak minum susu'], 'banyak'],
    ['cara', 'Cara makan (boleh lebih dari satu)', ['Makan sendiri', 'Disuapi', 'Sambil main/nonton'], 'banyak'],
    ['cuci', 'Cuci tangan sebelum makan', ['Selalu', 'Kadang-kadang', 'Tidak'], 'satu']
  ];
  // [kunci, label di formulir, label singkat di Excel]
  var EDU = [
    ['asi', 'ASI eksklusif', 'ASI eksklusif'],
    ['mpasi', 'MP-ASI tepat (usia, tekstur, frekuensi, porsi)', 'MP-ASI tepat'],
    ['piring', 'Isi Piringku / makanan beragam', 'Isi Piringku'],
    ['hewani', 'Protein hewani', 'Protein hewani'],
    ['responsif', 'Pemberian makan responsif', 'Pemberian makan responsif'],
    ['jajan', 'Makanan selingan / jajanan sehat', 'Jajanan sehat'],
    ['sakit', 'Makan saat anak sakit', 'Makan saat anak sakit'],
    ['phbs', 'PHBS / cuci tangan pakai sabun', 'PHBS/cuci tangan'],
    ['cacing', 'Pencegahan kecacingan', 'Pencegahan kecacingan'],
    ['posyandu', 'Rutin ke posyandu (pemantauan pertumbuhan)', 'Rutin ke posyandu'],
    ['stimulasi', 'Stimulasi tumbuh kembang', 'Stimulasi tumbuh kembang'],
    ['ibu', 'Gizi ibu hamil/menyusui', 'Gizi ibu hamil/menyusui']
  ];
  function eduLabel(k, singkat) { for (var i = 0; i < EDU.length; i++) if (EDU[i][0] === k) return EDU[i][singkat ? 2 : 1]; return k; }
  function lc(s) { return String(s || '').toLowerCase().replace(/\b(gtm|uht|asi|mp-asi)\b/g, function (m) { return m.toUpperCase(); }); }
  function has(a, v) { return Array.isArray(a) && a.indexOf(v) >= 0; }
  function adaIsi(km) { if (!km) return false; for (var k in km) { var v = km[k]; if (Array.isArray(v) ? v.length : v) return true; } return false; }

  /* Kalimat ringkas untuk kolom KEBIASAAN MAKAN */
  function teks(k) {
    var km = k.km || {}, p = [];
    if (km.makan || km.selingan) {
      var s = km.makan ? 'Makan ' + km.makan + '/hari' : '';
      if (km.selingan) s += (s ? ', ' : '') + (km.selingan === 'Tidak ada' ? 'tanpa selingan' : 'selingan ' + km.selingan + '/hari');
      p.push(s.charAt(0).toUpperCase() + s.slice(1) + '.');
    }
    if (km.jenisSelingan && km.jenisSelingan.length) p.push('Selingan: ' + km.jenisSelingan.map(lc).join(', ') + '.');
    if (km.nafsu) p.push('Nafsu makan ' + lc(km.nafsu) + '.');
    var f = [];
    if (km.sayur) f.push('sayur ' + lc(km.sayur));
    if (km.buah) f.push('buah ' + lc(km.buah));
    if (km.hewani) f.push('lauk hewani ' + lc(km.hewani));
    if (f.length) { var t = f.join(', '); p.push(t.charAt(0).toUpperCase() + t.slice(1) + '.'); }
    if (km.jajan) p.push((km.jajan === 'Sering' ? 'Sering' : km.jajan === 'Kadang-kadang' ? 'Kadang-kadang' : 'Jarang') + ' jajan kemasan/minuman manis.');
    if (km.susu && km.susu.length) p.push(has(km.susu, 'Tidak minum susu') && km.susu.length === 1 ? 'Tidak minum susu.' : 'Minum: ' + km.susu.filter(function (x) { return x !== 'Tidak minum susu'; }).map(function (x) { return x === 'ASI' ? 'ASI' : lc(x); }).join(', ') + '.');
    if (km.cara && km.cara.length) p.push('Cara makan: ' + km.cara.map(lc).join(', ') + '.');
    if (km.cuci) p.push('Cuci tangan sebelum makan: ' + lc(km.cuci) + '.');
    var cat = (k.kebiasaan || '').trim();
    if (cat) p.push(p.length ? 'Catatan: ' + cat : cat);
    return p.join(' ');
  }
  function eduTeks(k) {
    var a = (k.edukasi || []).map(function (x) { return eduLabel(x, true); });
    if (k.edukasiLain && k.edukasiLain.trim()) a.push(k.edukasiLain.trim());
    return a.join('; ');
  }

  /* Saran edukasi otomatis: [{kunci, alasan}] */
  function saran(d, b, r) {
    var out = {}, km = d.km || {};
    function add(key, why) { (out[key] = out[key] || []).push(why); }
    var bln = r && r.umurBulan != null ? r.umurBulan : null;
    if (km.sayur && km.sayur !== 'Setiap hari') add('piring', 'sayur ' + lc(km.sayur));
    if (km.buah && km.buah !== 'Setiap hari') add('piring', 'buah ' + lc(km.buah));
    if (km.makan === '1x' || km.makan === '2x') add(bln != null && bln >= 6 && bln < 24 ? 'mpasi' : 'piring', 'makan hanya ' + km.makan + '/hari');
    if (km.hewani && km.hewani !== 'Setiap hari') add('hewani', 'lauk hewani ' + lc(km.hewani));
    if (km.jajan === 'Sering') add('jajan', 'sering jajan kemasan/minuman manis');
    if (has(km.jenisSelingan, 'Makanan ringan kemasan (chiki)') || has(km.jenisSelingan, 'Minuman manis/kemasan')) add('jajan', 'selingan berupa jajanan kemasan');
    if (has(km.susu, 'Kental manis')) add('jajan', 'minum kental manis');
    if (has(km.cara, 'Sambil main/nonton')) add('responsif', 'makan sambil main/nonton');
    if (km.nafsu === 'Kurang' || km.nafsu === 'Pilih-pilih (GTM)') add('responsif', 'nafsu makan ' + lc(km.nafsu));
    if (km.cuci === 'Kadang-kadang' || km.cuci === 'Tidak') add('phbs', 'cuci tangan ' + lc(km.cuci));
    if (bln != null && bln < 6 && d.mpasi && (d.mpasi.pokok || d.mpasi.hewani || d.mpasi.nabati || d.mpasi.sayur || d.mpasi.buah || d.mpasi.telur)) add('asi', 'sudah diberi makanan sebelum 6 bulan');
    if (bln != null && bln < 6 && d.asiEks === 'Tidak') add('asi', 'tidak ASI eksklusif');
    if (bln != null && bln >= 6 && bln < 24 && d.asiLanjut === 'Tidak') add('mpasi', 'ASI tidak dilanjutkan');
    if (d.umurMpasi != null && d.umurMpasi < 6) add('mpasi', 'MP-ASI dimulai sebelum 6 bulan');
    if (d.cacingan === 'Ya') add('cacing', 'ada riwayat kecacingan');
    if (/demam|diare|batuk|flu|ispa|sakit|sariawan/i.test(d.penyakit || '') && !/^tidak ada$/i.test((d.penyakit || '').trim())) add('sakit', 'ada penyakit penyerta');
    if (r) {
      if (r.zBBTB != null && r.zBBTB < -2) { add('hewani', 'BB/TB ' + lc(r.BBTB)); add('posyandu', 'BB/TB ' + lc(r.BBTB)); }
      else if (r.zBBU != null && r.zBBU < -2) add('hewani', 'BB/U ' + lc(r.BBU));
      if (r.zTBU != null && r.zTBU < -2) { add('hewani', 'TB/U ' + lc(r.TBU)); add('stimulasi', 'TB/U ' + lc(r.TBU)); }
      if (r.zBBTB != null && r.zBBTB > 1) { add('piring', 'BB/TB ' + lc(r.BBTB)); add('jajan', 'BB/TB ' + lc(r.BBTB)); }
    }
    return EDU.filter(function (e) { return out[e[0]]; }).map(function (e) { return { kunci: e[0], label: e[1], alasan: out[e[0]] }; });
  }

  /* ---------- Formulir ---------- */
  function segBanyak(name, opts, vals) {
    return '<div class="seg check">' + opts.map(function (o) {
      return '<label><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (has(vals, o) ? ' checked' : '') + '>' + esc(o) + '</label>';
    }).join('') + '</div>';
  }
  function formKebiasaan(k, prev) {
    var km = k.km || {};
    var bisaSalin = prev && adaIsi(prev.km);
    var h = '<div class="sect" id="sectKm"><p class="sect-h"><b>Kebiasaan Makan</b><span class="hint">semua boleh dilewati</span></p>';
    if (bisaSalin) h += '<button class="btn sm" type="button" id="btnSalinKm">Salin dari kunjungan ' + esc(dmy(prev.tgl)) + '</button>';
    ASPEK.forEach(function (a) {
      var inner = a[3] === 'satu' ? segHtml('km_' + a[0], a[2], km[a[0]]) : segBanyak('km_' + a[0], a[2], km[a[0]] || []);
      h += field(a[1], inner, { id: 'km_' + a[0] });
    });
    h += field('Catatan tambahan', '<textarea class="input" id="kebiasaan" name="kebiasaan" style="min-height:72px" placeholder="Hal lain yang tidak ada di pilihan: alergi, pantangan, kebiasaan khusus…">' + esc(k.kebiasaan) + '</textarea>', { forId: 'kebiasaan' });
    return h + '</div>';
  }
  function formEdukasi(k, prev) {
    var ed = k.edukasi || [];
    var h = '<div class="sect" id="sectEdu"><p class="sect-h"><b>Edukasi Gizi yang Diberikan</b><span class="hint">boleh lebih dari satu</span></p>';
    if (prev && ((prev.edukasi && prev.edukasi.length) || prev.edukasiLain)) h += '<div class="warnbox info small">Kunjungan ' + esc(dmy(prev.tgl)) + ': ' + esc(eduTeks(prev)) + '</div>';
    h += '<div id="saranBox"></div>';
    h += '<div class="seg check" id="eduChips">' + EDU.map(function (e) {
      return '<label data-edu="' + e[0] + '"><input type="checkbox" name="edu" value="' + e[0] + '"' + (has(ed, e[0]) ? ' checked' : '') + '>' + esc(e[1]) + '</label>';
    }).join('') + '</div>';
    h += field('Topik lainnya', inp('edukasiLain', k.edukasiLain, { ph: 'Tulis jika tidak ada di daftar' }), { forId: 'edukasiLain' });
    return h + '</div>';
  }
  function baca(fd) {
    var km = {};
    ASPEK.forEach(function (a) {
      if (a[3] === 'satu') { var v = fd.get('km_' + a[0]); if (v) km[a[0]] = String(v); }
      else { var arr = fd.getAll('km_' + a[0]).map(String); if (arr.length) km[a[0]] = arr; }
    });
    return { km: km, edukasi: fd.getAll('edu').map(String), edukasiLain: String(fd.get('edukasiLain') || '').trim() };
  }
  function isiDari(form, km) {
    ASPEK.forEach(function (a) {
      $$('input[name="km_' + a[0] + '"]', form).forEach(function (el) {
        el.checked = a[3] === 'satu' ? km[a[0]] === el.value : has(km[a[0]], el.value);
      });
    });
  }
  function tampilSaran(form, list) {
    var box = $('#saranBox', form); if (!box) return;
    $$('#eduChips label', form).forEach(function (l) { l.classList.remove('sug'); });
    if (!list.length) { box.innerHTML = ''; box.removeAttribute('data-html'); return; }
    list.forEach(function (s) { var l = $('#eduChips label[data-edu="' + s.kunci + '"]', form); if (l) l.classList.add('sug'); });
    var belum = list.filter(function (s) { var c = $('#eduChips input[value="' + s.kunci + '"]', form); return c && !c.checked; });
    var html = '<div class="saran"><b>Saran edukasi</b> <span class="small muted">(berdasarkan isian di atas)</span><ul>' +
      list.map(function (s) { return '<li><b>' + esc(s.label) + '</b>: ' + esc(s.alasan.join('; ')) + '</li>'; }).join('') + '</ul>' +
      (belum.length ? '<button class="btn sm" type="button" id="btnPakaiSaran">Centang semua saran (' + belum.length + ')</button>' : '<span class="small" style="color:var(--ok)">✓ Semua saran sudah dicentang</span>') + '</div>';
    if (box.getAttribute('data-html') !== html) { box.innerHTML = html; box.setAttribute('data-html', html); } // jangan ganti tombol yang sedang diketuk
    var bt = $('#btnPakaiSaran', box);
    if (bt) bt.onclick = function () { belum.forEach(function (s) { var c = $('#eduChips input[value="' + s.kunci + '"]', form); if (c) c.checked = true; }); tampilSaran(form, list); };
  }
  function ringkasSheet(k) {
    var km = k.km || {};
    function j(v) { return Array.isArray(v) ? v.join(', ') : (v || ''); }
    return { makan: j(km.makan), selingan: j(km.selingan), jenisSelingan: j(km.jenisSelingan), nafsu: j(km.nafsu), sayur: j(km.sayur), buah: j(km.buah), hewani: j(km.hewani), jajan: j(km.jajan), susu: j(km.susu), cara: j(km.cara), cuci: j(km.cuci) };
  }
  return { ASPEK: ASPEK, EDU: EDU, teks: teks, eduTeks: eduTeks, eduLabel: eduLabel, saran: saran, formKebiasaan: formKebiasaan, formEdukasi: formEdukasi, baca: baca, isiDari: isiDari, tampilSaran: tampilSaran, adaIsi: adaIsi, ringkasSheet: ringkasSheet };
})();
