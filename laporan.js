/* Laporan bulanan (Word .docx): statistik, draf kesimpulan/saran, pembuat dokumen */
var LAPORAN = (function () {
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var JABATAN = ['Nutrisionis Ahli Pertama', 'Nutrisionis Ahli Muda', 'Nutrisionis Ahli Madya', 'Nutrisionis Terampil', 'Bidan Ahli Pertama', 'Bidan Ahli Muda', 'Bidan Terampil', 'Bidan', 'Perawat', 'Kader Posyandu'];

  function pct(n, d) { return d ? (Math.round(n / d * 1000) / 10).toString().replace('.', ',') + '%' : '0%'; }
  function hariTgl(iso) { var d = new Date(iso + 'T00:00:00'); return HARI[d.getDay()] + ' / ' + iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4); }
  function blnLabel(ym) { return BLN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
  function posLabel(p) { return 'Posyandu ' + title(p); }
  function levelKurang(z) { return z == null ? null : z < -3 ? 2 : z < -2 ? 1 : 0; }

  /* ---------- Statistik bulan ---------- */
  function hitung(ym) {
    var per = latestPerBalita(ym), rows = [];
    Object.keys(per).forEach(function (bid) { var b = balitaById(bid); if (b) rows.push({ b: b, k: per[bid], r: hasil(b, per[bid]) }); });
    var st = { ym: ym, n: rows.length, rows: rows };
    // jadwal: semua pasangan (tanggal, posyandu) di bulan itu
    var jad = {};
    S.kunjungan.forEach(function (k) { if (k.tgl.slice(0, 7) !== ym) return; var b = balitaById(k.balitaId); if (!b) return; jad[k.tgl + '|' + b.posyandu] = { tgl: k.tgl, pos: b.posyandu }; });
    var urutPos = []; WILAYAH.forEach(function (w) { urutPos = urutPos.concat(w[1]); });
    st.jadwal = Object.keys(jad).map(function (x) { return jad[x]; }).sort(function (a, c) { return a.tgl < c.tgl ? -1 : a.tgl > c.tgl ? 1 : urutPos.indexOf(a.pos) - urutPos.indexOf(c.pos); });
    var posSet = {}, desaSet = {};
    rows.forEach(function (x) { posSet[x.b.posyandu] = 1; desaSet[x.b.desa] = 1; });
    st.nPos = Object.keys(posSet).length; st.nDesa = Object.keys(desaSet).length; st.posDikunjungi = posSet;
    // per desa
    st.desa = WILAYAH.map(function (w) {
      var rs = rows.filter(function (x) { return x.b.desa === w[0]; });
      return {
        desa: w[0], n: rs.length,
        uw: rs.filter(function (x) { return x.r.zBBU != null && x.r.zBBU < -2; }).length,
        st: rs.filter(function (x) { return x.r.zTBU != null && x.r.zTBU < -2; }).length,
        ws: rs.filter(function (x) { return x.r.zBBTB != null && x.r.zBBTB < -2; }).length,
        ov: rs.filter(function (x) { return x.r.zBBTB != null && x.r.zBBTB > 2; }).length
      };
    });
    st.tot = st.desa.reduce(function (a, d) { a.n += d.n; a.uw += d.uw; a.st += d.st; a.ws += d.ws; a.ov += d.ov; return a; }, { n: 0, uw: 0, st: 0, ws: 0, ov: 0 });
    st.masalahAny = rows.filter(function (x) { return (x.r.zBBU != null && x.r.zBBU < -2) || (x.r.zTBU != null && x.r.zTBU < -2) || (x.r.zBBTB != null && x.r.zBBTB < -2) || (x.r.zBBTB != null && x.r.zBBTB > 2); }).length;
    // distribusi kategori
    function dist(key, cats) {
      var c = {}; cats.forEach(function (k) { c[k] = 0; }); var n = 0;
      rows.forEach(function (x) { var v = x.r[key]; if (v) { c[v] = (c[v] || 0) + 1; n++; } });
      return { n: n, c: c, cats: cats };
    }
    st.dist = [
      ['BB/U', dist('BBU', ['Sangat Kurang', 'Kurang', 'Normal', 'Risiko BB Lebih'])],
      ['TB/U', dist('TBU', ['Sangat Pendek', 'Pendek', 'Normal', 'Tinggi'])],
      ['BB/TB', dist('BBTB', ['Gizi Buruk', 'Gizi Kurang', 'Gizi Baik', 'Berisiko Gizi Lebih', 'Gizi Lebih', 'Obesitas'])]
    ];
    // perkembangan dibanding kunjungan sebelumnya
    var awal = ym + '-01', pk = { n: 0, bbNaik: 0, bbTidak: 0, ind: { 'BB/U': [0, 0, 0], 'TB/U': [0, 0, 0], 'BB/TB': [0, 0, 0] }, pulih: 0, dz: { 'BB/U': [], 'TB/U': [], 'BB/TB': [] } };
    rows.forEach(function (x) {
      var prev = kunjunganOf(x.b.id).filter(function (k) { return k.tgl < awal; })[0];
      if (!prev) return;
      var pr = hasil(x.b, prev); pk.n++;
      if (x.k.bb != null && prev.bb != null) { if (x.k.bb > prev.bb) pk.bbNaik++; else pk.bbTidak++; }
      [['BB/U', 'zBBU'], ['TB/U', 'zTBU'], ['BB/TB', 'zBBTB']].forEach(function (p) {
        var a = levelKurang(pr[p[1]]), c = levelKurang(x.r[p[1]]);
        if (a == null || c == null) return;
        pk.ind[p[0]][c < a ? 0 : c === a ? 1 : 2]++;
        pk.dz[p[0]].push(x.r[p[1]] - pr[p[1]]);
      });
      var dulu = [pr.zBBU, pr.zTBU, pr.zBBTB].some(function (z) { return z != null && z < -2; });
      var kini = [x.r.zBBU, x.r.zTBU, x.r.zBBTB].some(function (z) { return z != null && z < -2; });
      if (dulu && !kini) pk.pulih++;
    });
    st.pk = pk;
    // kebiasaan makan
    st.km = KM.ASPEK.map(function (a) {
      var c = {}, n = 0;
      rows.forEach(function (x) {
        var v = (x.k.km || {})[a[0]]; if (!v || (Array.isArray(v) && !v.length)) return; n++;
        (Array.isArray(v) ? v : [v]).forEach(function (o) { c[o] = (c[o] || 0) + 1; });
      });
      return { key: a[0], label: a[1].replace(/ \(boleh lebih dari satu\)/, ''), n: n, c: c, opts: a[2], banyak: a[3] === 'banyak' };
    });
    // faktor determinan
    function cnt(f, val) { var n = 0, y = 0; rows.forEach(function (x) { var v = x.k[f]; if (v) { n++; if (v === val) y++; } }); return { n: n, y: y }; }
    st.det = [
      ['Memiliki BPJS/JKN', cnt('bpjs', 'Ya')],
      ['Tersedia air bersih', cnt('airBersih', 'Ya')],
      ['Memiliki jamban', cnt('jamban', 'Ya')],
      ['Imunisasi dasar lengkap', cnt('imunisasi', 'Ya, Lengkap')],
      ['Imunisasi dasar tidak lengkap/tidak imunisasi', (function () { var n = 0, y = 0; rows.forEach(function (x) { if (x.k.imunisasi) { n++; if (x.k.imunisasi !== 'Ya, Lengkap') y++; } }); return { n: n, y: y }; })()],
      ['Ada anggota keluarga yang merokok', cnt('rokok', 'Ya')],
      ['Ada riwayat kecacingan', cnt('cacingan', 'Ya')],
      ['Riwayat ibu KEK saat hamil', cnt('kek', 'KEK')],
      ['Mendapat ASI eksklusif', cnt('asiEks', 'Ya')]
    ];
    // edukasi
    var ed = {}, lain = {};
    rows.forEach(function (x) { (x.k.edukasi || []).forEach(function (e) { ed[e] = (ed[e] || 0) + 1; }); if (x.k.edukasiLain) lain[x.k.edukasiLain] = (lain[x.k.edukasiLain] || 0) + 1; });
    st.edu = KM.EDU.filter(function (e) { return ed[e[0]]; }).map(function (e) { return [e[1], ed[e[0]]]; }).sort(function (a, c) { return c[1] - a[1]; });
    Object.keys(lain).forEach(function (t) { st.edu.push([t, lain[t]]); });
    st.nEdu = rows.filter(function (x) { return (x.k.edukasi && x.k.edukasi.length) || x.k.edukasiLain; }).length;
    return st;
  }

  /* ---------- Narasi ---------- */
  function kmSorotan(st) {
    var out = [];
    function share(key, vals) { var a = st.km.filter(function (x) { return x.key === key; })[0]; if (!a || !a.n) return null; var y = 0; vals.forEach(function (v) { y += a.c[v] || 0; }); return { y: y, n: a.n }; }
    var s;
    if ((s = share('makan', ['1x', '2x'])) && s.y) out.push('makan utama hanya 1–2 kali sehari (' + pct(s.y, s.n) + ')');
    if ((s = share('nafsu', ['Kurang', 'Pilih-pilih (GTM)'])) && s.y) out.push('nafsu makan kurang atau pilih-pilih makanan (' + pct(s.y, s.n) + ')');
    if ((s = share('sayur', ['Kadang-kadang', 'Jarang/tidak pernah'])) && s.y) out.push('tidak setiap hari makan sayur (' + pct(s.y, s.n) + ')');
    if ((s = share('buah', ['Kadang-kadang', 'Jarang/tidak pernah'])) && s.y) out.push('tidak setiap hari makan buah (' + pct(s.y, s.n) + ')');
    if ((s = share('hewani', ['Kadang-kadang', 'Jarang/tidak pernah'])) && s.y) out.push('tidak setiap hari mengonsumsi lauk hewani (' + pct(s.y, s.n) + ')');
    if ((s = share('jajan', ['Sering'])) && s.y) out.push('sering mengonsumsi jajanan kemasan/minuman manis (' + pct(s.y, s.n) + ')');
    if ((s = share('susu', ['Kental manis'])) && s.y) out.push('mengonsumsi kental manis (' + pct(s.y, s.n) + ')');
    if ((s = share('cara', ['Sambil main/nonton'])) && s.y) out.push('makan sambil bermain atau menonton (' + pct(s.y, s.n) + ')');
    if ((s = share('cuci', ['Kadang-kadang', 'Tidak'])) && s.y) out.push('tidak selalu mencuci tangan sebelum makan (' + pct(s.y, s.n) + ')');
    return out;
  }
  function det(st, label) { return st.det.filter(function (d) { return d[0] === label; })[0][1]; }

  function draf(st, form) {
    var bl = blnLabel(st.ym), t = st.tot, K = [], Sr = [];
    if (!st.n) return { kesimpulan: 'Belum ada data kunjungan pada bulan ' + bl + '.', saran: '' };
    K.push('Pada bulan ' + bl + ' telah dilakukan kunjungan lapangan terhadap ' + st.n + ' balita di ' + st.nPos + ' posyandu pada ' + st.nDesa + ' desa di wilayah kerja Puskesmas Moncongloe.');
    K.push('Berdasarkan hasil pengukuran antropometri, ditemukan balita dengan berat badan kurang/sangat kurang (underweight) sebanyak ' + t.uw + ' orang (' + pct(t.uw, t.n) + '), pendek/sangat pendek (stunting) sebanyak ' + t.st + ' orang (' + pct(t.st, t.n) + '), gizi kurang/gizi buruk (wasting) sebanyak ' + t.ws + ' orang (' + pct(t.ws, t.n) + ')' + (t.ov ? ', serta gizi lebih/obesitas sebanyak ' + t.ov + ' orang (' + pct(t.ov, t.n) + ')' : '') + '.');
    var pk = st.pk;
    if (pk.n) K.push('Dari ' + pk.n + ' balita yang memiliki data kunjungan sebelumnya, ' + pk.bbNaik + ' balita (' + pct(pk.bbNaik, pk.n) + ') mengalami kenaikan berat badan' + (pk.pulih ? ' dan ' + pk.pulih + ' balita yang sebelumnya bermasalah gizi kini berada pada kategori normal' : '') + '.');
    var sor = kmSorotan(st);
    if (sor.length) K.push('Kebiasaan makan yang perlu mendapat perhatian adalah ' + sor.slice(0, 4).join('; ') + '.');
    var dets = [];
    var rk = det(st, 'Ada anggota keluarga yang merokok'); if (rk.y) dets.push('anggota keluarga yang merokok (' + pct(rk.y, rk.n) + ')');
    var im = det(st, 'Imunisasi dasar tidak lengkap/tidak imunisasi'); if (im.y) dets.push('imunisasi dasar tidak lengkap (' + pct(im.y, im.n) + ')');
    var kek = det(st, 'Riwayat ibu KEK saat hamil'); if (kek.y) dets.push('riwayat ibu KEK saat hamil (' + pct(kek.y, kek.n) + ')');
    var bp = det(st, 'Memiliki BPJS/JKN'); if (bp.n && bp.n - bp.y) dets.push('belum memiliki BPJS/JKN (' + pct(bp.n - bp.y, bp.n) + ')');
    var cc = det(st, 'Ada riwayat kecacingan'); if (cc.y) dets.push('riwayat kecacingan (' + pct(cc.y, cc.n) + ')');
    if (dets.length) K.push('Faktor determinan yang ditemukan antara lain ' + dets.join(', ') + '.');
    if (st.edu.length) K.push('Edukasi gizi telah diberikan kepada ' + st.nEdu + ' keluarga balita, dengan topik terbanyak ' + st.edu.slice(0, 3).map(function (e) { return e[0].toLowerCase(); }).join(', ') + '.');

    Sr.push('Melanjutkan pemantauan pertumbuhan secara rutin setiap bulan di posyandu dan kunjungan rumah bagi balita dengan masalah gizi.');
    if (t.ws) Sr.push('Balita dengan gizi kurang/gizi buruk dikaji lebih lanjut dan ditatalaksana sesuai pedoman, termasuk pemberian makanan tambahan pemulihan berbahan pangan lokal dan rujukan bila disertai penyakit atau komplikasi.');
    if (t.st || t.uw) Sr.push('Meningkatkan edukasi pemberian makan dengan menu gizi seimbang (Isi Piringku) yang mengutamakan protein hewani setiap kali makan, sesuai umur balita.');
    if (pk.bbTidak) Sr.push('Balita yang berat badannya tidak naik (' + pk.bbTidak + ' orang) diprioritaskan untuk kunjungan ulang dan konseling gizi.');
    var shareJajan = st.km.filter(function (x) { return x.key === 'jajan'; })[0];
    if (shareJajan && shareJajan.c['Sering']) Sr.push('Memberikan edukasi jajanan sehat dan pembatasan minuman manis serta makanan ringan kemasan kepada orang tua balita.');
    if (rk.y) Sr.push('Melakukan edukasi rumah bebas asap rokok kepada keluarga balita bekerja sama dengan kader dan pemerintah desa.');
    if (im.y) Sr.push('Berkoordinasi dengan bidan desa untuk melengkapi imunisasi dasar (imunisasi kejar) pada balita yang belum lengkap.');
    if (bp.n && bp.n - bp.y) Sr.push('Memfasilitasi kepemilikan kartu BPJS/JKN bagi keluarga balita yang belum terdaftar bekerja sama dengan pemerintah desa.');
    Sr.push('Memperkuat kerja sama lintas program dan lintas sektor (pemerintah desa, kader posyandu, dan TP-PKK) dalam upaya percepatan penurunan stunting.');
    return { kesimpulan: K.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'), saran: Sr.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') };
  }

  /* ---------- Dokumen Word ---------- */
  function buat(st, f, settings) {
    var D = docx, FONT = 'Times New Roman', SZ = 24, SZT = 21;
    var I1 = 425, I2 = 850, I3 = 1275;
    var paras = [];
    var NIL = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    var LINE = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' };
    function run(t, o) { return new D.TextRun(Object.assign({ text: t, font: FONT, size: SZ }, o || {})); }
    function P(text, o) {
      o = o || {};
      var children = Array.isArray(text) ? text : [run(text, { bold: o.bold, italics: o.italics, size: o.size })];
      return new D.Paragraph({ children: children, alignment: o.align || D.AlignmentType.JUSTIFIED, spacing: { after: o.after != null ? o.after : 120, line: 276, before: o.before || 0 }, indent: o.indent, keepNext: o.keepNext });
    }
    function H(label, text, left, o) {
      o = o || {};
      return new D.Paragraph({ children: [run(label ? label + '\t' + text : text, { bold: true, italics: o.italics })], spacing: { before: o.before != null ? o.before : 160, after: 80 }, indent: label ? { left: left, hanging: 425 } : { left: left - 425 }, keepNext: true });
    }
    function bullets(items, left) { return items.map(function (t) { return new D.Paragraph({ children: [run('–\t' + t)], alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 60, line: 276 }, indent: { left: left + 360, hanging: 360 } }); }); }
    function numbered(text, left) {
      return String(text || '').split('\n').filter(function (x) { return x.trim(); }).map(function (line) {
        var m = line.match(/^\s*(\d+[.)])\s*(.*)$/);
        return m ? new D.Paragraph({ children: [run(m[1] + '\t' + m[2])], alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 80, line: 276 }, indent: { left: left + 360, hanging: 360 } })
          : P(line.trim(), { indent: { left: left } });
      });
    }
    function cell(t, o) {
      o = o || {};
      var lines = String(t == null ? '' : t).split('\n');
      return new D.TableCell({
        children: lines.map(function (ln) { return new D.Paragraph({ children: [run(ln, { size: o.head && !o.w2 ? 20 : SZT, bold: o.bold })], alignment: o.align || D.AlignmentType.LEFT, spacing: { after: 0, line: 240 } }); }),
        shading: o.head ? { type: D.ShadingType.CLEAR, color: 'auto', fill: 'D9D9D9' } : undefined,
        verticalAlign: D.VerticalAlign.CENTER, columnSpan: o.span, rowSpan: o.rowSpan,
        margins: { top: 50, bottom: 50, left: 90, right: 90 }, width: o.w ? { size: o.w, type: D.WidthType.DXA } : undefined
      });
    }
    function table(head, rows, widths, o) {
      o = o || {};
      var C = D.AlignmentType.CENTER;
      var hr = new D.TableRow({ tableHeader: true, children: head.map(function (h, i) { return cell(h, { head: true, bold: true, align: C, w: widths[i] }); }) });
      var body = rows.map(function (r, ri) {
        var tot = o.totalLast && ri === rows.length - 1;
        return new D.TableRow({ cantSplit: true, children: r.map(function (v, i) { return cell(v, { w: widths[i], bold: tot, align: (o.center || []).indexOf(i) >= 0 ? C : undefined, head: tot }); }) });
      });
      return new D.Table({ rows: [hr].concat(body), width: { size: widths.reduce(function (a, b) { return a + b; }, 0), type: D.WidthType.DXA }, columnWidths: widths, indent: { size: o.indent || I1, type: D.WidthType.DXA },
        borders: { top: LINE, bottom: LINE, left: LINE, right: LINE, insideHorizontal: LINE, insideVertical: LINE } });
    }
    var tblNo = 0;
    function caption(t, left) { tblNo++; return new D.Paragraph({ children: [run('Tabel ' + tblNo + '. ', { bold: true, size: 22 }), run(t, { size: 22 })], spacing: { before: 120, after: 60 }, indent: { left: left }, keepNext: true }); }
    function gap() { return new D.Paragraph({ children: [], spacing: { after: 60 } }); }
    var bl = blnLabel(st.ym), W = 9070 - I1; // lebar isi (A4, margin 3 cm & 2 cm) dikurangi indentasi

    // Judul
    paras.push(new D.Paragraph({ children: [run('LAPORAN PERJALANAN DINAS', { bold: true, size: 26 })], alignment: D.AlignmentType.CENTER, spacing: { after: 0 } }));
    paras.push(new D.Paragraph({ children: [run('KUNJUNGAN LAPANGAN BALITA DENGAN MASALAH GIZI', { bold: true, size: 26 })], alignment: D.AlignmentType.CENTER, spacing: { after: 0 } }));
    paras.push(new D.Paragraph({ children: [run('PUSKESMAS ' + (settings.puskesmas || 'MONCONGLOE') + ' KABUPATEN MAROS', { bold: true, size: 26 })], alignment: D.AlignmentType.CENTER, spacing: { after: 0 } }));
    paras.push(new D.Paragraph({ children: [run('BULAN ' + bl.toUpperCase(), { bold: true, size: 26 })], alignment: D.AlignmentType.CENTER, spacing: { after: 360 } }));

    // A. Pendahuluan
    paras.push(H('A.', 'PENDAHULUAN', I1, { before: 0 }));
    paras.push(H('1.', 'Umum', I2));
    var lvIndent = { 2: I2, 3: I3 };
    LAP_TEKS.umum.forEach(function (bk) {
      var left = lvIndent[bk.lv || 2];
      if (bk.t) paras.push(bk.h ? H(bk.h, bk.t, I3) : new D.Paragraph({ children: [run(bk.t, { bold: true })], spacing: { before: 160, after: 80 }, indent: { left: I2 }, keepNext: true }));
      else if (bk.p) paras.push(P(bk.p, { indent: { left: left, firstLine: 567 } }));
      else if (bk.b) paras = paras.concat(bullets(bk.b, left));
    });
    paras.push(H('2.', 'Maksud dan Tujuan', I2));
    paras.push(P(LAP_TEKS.maksud, { indent: { left: I2, firstLine: 567 } }));
    paras.push(H('3.', 'Ruang Lingkup', I2));
    paras.push(P(LAP_TEKS.ruang, { indent: { left: I2, firstLine: 567 } }));
    paras.push(H('4.', 'Dasar Pelaksanaan Kegiatan', I2));
    paras.push(P('Kegiatan ini dilaksanakan berdasarkan Surat Tugas Kepala UPTD Puskesmas ' + title(settings.puskesmas || 'MONCONGLOE') + ' Nomor ' + (f.noSurat || '..........') + '.', { indent: { left: I2, firstLine: 567 } }));

    // B. Kegiatan
    paras.push(H('B.', 'KEGIATAN YANG DILAKSANAKAN', I1));
    var nGizi = (f.petugas || []).filter(function (p) { return /nutrisionis|gizi/i.test(p.jabatan || ''); }).length;
    var nBidan = (f.petugas || []).filter(function (p) { return /bidan/i.test(p.jabatan || ''); }).length;
    var nLain = (f.petugas || []).length - nGizi - nBidan;
    var timTeks = (f.petugas || []).length ? ' oleh tim yang terdiri atas ' + [nGizi ? nGizi + ' tenaga gizi (nutrisionis)' : '', nBidan ? nBidan + ' bidan' : '', nLain ? nLain + ' petugas lainnya' : ''].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' dan $1') : '';
    paras.push(P('Kegiatan kunjungan lapangan balita dilaksanakan pada bulan ' + bl + ' di ' + st.jadwal.map(function (j) { return j.pos; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length + ' posyandu pada ' + st.nDesa + ' desa di wilayah kerja Puskesmas ' + title(settings.puskesmas || 'Moncongloe') + ' Kabupaten Maros' + timTeks + '. Jadwal pelaksanaan kegiatan adalah sebagai berikut.', { indent: { left: I1, firstLine: 567 } }));
    paras.push(caption('Jadwal Pelaksanaan Kunjungan Lapangan Balita', I1));
    paras.push(table(['No', 'Hari/Tanggal', 'Posyandu', 'Desa'], st.jadwal.length ? st.jadwal.map(function (j, i) { return [String(i + 1), hariTgl(j.tgl), title(j.pos), title(desaOf(j.pos))]; }) : [['–', '–', '–', '–']], [620, 2700, 2700, W - 6020], { center: [0] }));
    paras.push(gap());
    paras.push(P('Petugas yang melaksanakan kegiatan ini adalah sebagai berikut.', { indent: { left: I1, firstLine: 567 } }));
    paras.push(caption('Daftar Petugas Pelaksana Kegiatan', I1));
    var pet = (f.petugas || []).map(function (p, i) {
      return [String(i + 1), (p.nama || '') + (p.nip ? '\n' + p.nip : ''), p.pangkat || '–', p.jabatan || '–', (p.tempat || []).map(posLabel).join(', ') || '–'];
    });
    paras.push(table(['No', 'Nama / NIP / NIK', 'Pangkat/Gol. Ruang', 'Jabatan', 'Tempat Kegiatan'], pet.length ? pet : [['–', '–', '–', '–', '–']], [520, 2500, 1500, 1500, W - 6020], { center: [0] }));

    // C. Hasil
    paras.push(H('C.', 'HASIL YANG DICAPAI', I1));
    var t = st.tot;
    paras.push(H('1.', 'Jumlah Balita dan Status Gizi', I2));
    paras.push(P('Jumlah balita yang dikunjungi pada bulan ' + bl + ' sebanyak ' + st.n + ' orang di ' + st.nDesa + ' desa. Dari jumlah tersebut, balita dengan berat badan kurang/sangat kurang (underweight) sebanyak ' + t.uw + ' orang (' + pct(t.uw, t.n) + '), pendek/sangat pendek (stunting) sebanyak ' + t.st + ' orang (' + pct(t.st, t.n) + '), gizi kurang/gizi buruk (wasting) sebanyak ' + t.ws + ' orang (' + pct(t.ws, t.n) + '), dan gizi lebih/obesitas sebanyak ' + t.ov + ' orang (' + pct(t.ov, t.n) + '). Seorang balita dapat mengalami lebih dari satu masalah gizi; secara keseluruhan terdapat ' + st.masalahAny + ' balita (' + pct(st.masalahAny, st.n) + ') dengan sedikitnya satu masalah gizi. Rincian menurut desa disajikan pada tabel berikut.', { indent: { left: I2, firstLine: 567 } }));
    paras.push(caption('Jumlah Balita Dikunjungi dan Masalah Gizi menurut Desa', I2));
    var dRows = st.desa.map(function (d) { return [title(d.desa), d.n + ' orang', d.uw + ' orang', d.st + ' orang', d.ws + ' orang', d.ov + ' orang']; });
    dRows.push(['TOTAL', t.n + ' orang', t.uw + ' orang (' + pct(t.uw, t.n) + ')', t.st + ' orang (' + pct(t.st, t.n) + ')', t.ws + ' orang (' + pct(t.ws, t.n) + ')', t.ov + ' orang (' + pct(t.ov, t.n) + ')']);
    var W2 = 9070 - I2;
    paras.push(table(['Nama Desa', 'Balita\nDikunjungi', 'BB/U\n(Underweight)', 'TB/U\n(Stunting)', 'BB/TB\n(Wasting)', 'BB/TB\n(Gizi Lebih/\nObesitas)'], dRows, [1540, 1200, 1480, 1320, 1280, W2 - 6820], { center: [1, 2, 3, 4, 5], totalLast: true, indent: I2 }));
    paras.push(gap());
    paras.push(P('Sebaran status gizi seluruh balita yang dikunjungi berdasarkan kategori Permenkes Nomor 2 Tahun 2020 adalah sebagai berikut.', { indent: { left: I2, firstLine: 567 } }));
    paras.push(caption('Sebaran Status Gizi Balita menurut Indeks Antropometri', I2));
    var dsRows = [];
    st.dist.forEach(function (d) { d[1].cats.forEach(function (c) { dsRows.push([d[0], c, String(d[1].c[c] || 0), pct(d[1].c[c] || 0, d[1].n)]); }); });
    paras.push(table(['Indeks', 'Kategori', 'Jumlah', 'Persentase'], dsRows, [1500, 3200, 1500, W2 - 6200], { center: [0, 2, 3], indent: I2 }));

    paras.push(H('2.', 'Perkembangan Dibandingkan Kunjungan Sebelumnya', I2));
    var pk = st.pk;
    if (!pk.n) paras.push(P('Belum terdapat data kunjungan sebelumnya untuk balita yang dikunjungi pada bulan ini sehingga perkembangan status gizi belum dapat dibandingkan.', { indent: { left: I2, firstLine: 567 } }));
    else {
      paras.push(P('Sebanyak ' + pk.n + ' balita telah memiliki data kunjungan sebelumnya. Berat badan naik pada ' + pk.bbNaik + ' balita (' + pct(pk.bbNaik, pk.n) + ') dan tidak naik pada ' + pk.bbTidak + ' balita (' + pct(pk.bbTidak, pk.n) + '). ' + (pk.pulih ? pk.pulih + ' balita yang sebelumnya mengalami masalah gizi (underweight, stunting, atau wasting) kini berada pada kategori normal. ' : '') + 'Perubahan status gizi dibandingkan kunjungan sebelumnya disajikan pada tabel berikut.', { indent: { left: I2, firstLine: 567 } }));
      paras.push(caption('Perubahan Status Gizi Dibandingkan Kunjungan Sebelumnya', I2));
      var pRows = ['BB/U', 'TB/U', 'BB/TB'].map(function (k) {
        var v = pk.ind[k], dz = pk.dz[k], mean = dz.length ? dz.reduce(function (a, b) { return a + b; }, 0) / dz.length : null;
        return [k, v[0] + ' orang', v[1] + ' orang', v[2] + ' orang', mean == null ? '–' : (mean > 0 ? '+' : '') + mean.toFixed(2).replace('.', ',')];
      });
      paras.push(table(['Indeks', 'Membaik', 'Tetap', 'Memburuk', 'Rerata perubahan z-skor'], pRows, [1300, 1600, 1600, 1600, W2 - 6100], { center: [0, 1, 2, 3, 4], indent: I2 }));
      paras.push(P('Keterangan: membaik = berpindah ke kategori yang lebih baik (misalnya dari sangat pendek ke pendek atau dari pendek ke normal); memburuk = berpindah ke kategori yang lebih berat.', { indent: { left: I2 }, size: 20, italics: true, before: 60 }));
    }

    paras.push(H('3.', 'Kebiasaan Makan Balita', I2));
    var adaKm = st.km.some(function (a) { return a.n; });
    if (!adaKm) paras.push(P('Data kebiasaan makan dalam bentuk pilihan belum tersedia pada bulan ini.', { indent: { left: I2, firstLine: 567 } }));
    else {
      var sor = kmSorotan(st);
      paras.push(P('Gambaran kebiasaan makan balita yang dikunjungi disajikan pada tabel berikut.' + (sor.length ? ' Hal yang perlu mendapat perhatian antara lain ' + sor.join('; ') + '.' : ''), { indent: { left: I2, firstLine: 567 } }));
      paras.push(caption('Gambaran Kebiasaan Makan Balita', I2));
      var kRows = st.km.filter(function (a) { return a.n; }).map(function (a) {
        return [a.label + (a.banyak ? '*' : ''), a.opts.filter(function (o) { return a.c[o]; }).map(function (o) { return o + ': ' + a.c[o] + ' (' + pct(a.c[o], a.n) + ')'; }).join('\n')];
      });
      paras.push(table(['Aspek', 'Hasil (jumlah dan persentase balita)'], kRows, [3000, W2 - 3000], { indent: I2 }));
      paras.push(P('* Jawaban boleh lebih dari satu sehingga jumlah persentase dapat melebihi 100%.', { indent: { left: I2 }, size: 20, italics: true, before: 60 }));
    }

    paras.push(H('4.', 'Faktor Determinan', I2));
    var detRows = st.det.filter(function (d) { return d[1].n; }).map(function (d) { return [d[0], d[1].y + ' dari ' + d[1].n, pct(d[1].y, d[1].n)]; });
    if (!detRows.length) paras.push(P('Data faktor determinan belum tersedia.', { indent: { left: I2, firstLine: 567 } }));
    else {
      paras.push(P('Faktor determinan yang berkaitan dengan status gizi balita yang dikunjungi disajikan pada tabel berikut.', { indent: { left: I2, firstLine: 567 } }));
      paras.push(caption('Faktor Determinan pada Balita yang Dikunjungi', I2));
      paras.push(table(['Faktor Determinan', 'Jumlah', 'Persentase'], detRows, [4600, 1800, W2 - 6400], { center: [1, 2], indent: I2 }));
    }

    paras.push(H('5.', 'Edukasi Gizi', I2));
    if (!st.edu.length) paras.push(P('Topik edukasi gizi belum tercatat pada bulan ini.', { indent: { left: I2, firstLine: 567 } }));
    else {
      paras.push(P('Edukasi gizi diberikan kepada ' + st.nEdu + ' keluarga balita (' + pct(st.nEdu, st.n) + ') sesuai dengan masalah gizi dan kebiasaan makan yang ditemukan. Topik edukasi yang diberikan adalah sebagai berikut.', { indent: { left: I2, firstLine: 567 } }));
      paras.push(caption('Topik Edukasi Gizi yang Diberikan', I2));
      paras.push(table(['No', 'Topik Edukasi', 'Jumlah Keluarga'], st.edu.map(function (e, i) { return [String(i + 1), e[0], e[1] + ' keluarga']; }), [620, W2 - 2620, 2000], { center: [0, 2], indent: I2 }));
    }

    // D. Kesimpulan dan Saran
    paras.push(H('D.', 'KESIMPULAN DAN SARAN', I1));
    paras.push(H('1.', 'Kesimpulan', I2));
    paras = paras.concat(numbered(f.kesimpulan, I2));
    paras.push(H('2.', 'Saran', I2));
    paras = paras.concat(numbered(f.saran, I2));

    // E. Penutup
    paras.push(H('E.', 'PENUTUP', I1));
    paras.push(P(LAP_TEKS.penutup, { indent: { left: I1, firstLine: 567 }, keepNext: true }));

    // Tanda tangan
    var tgl = f.tglLaporan ? (+f.tglLaporan.slice(8, 10)) + ' ' + BLN[+f.tglLaporan.slice(5, 7) - 1] + ' ' + f.tglLaporan.slice(0, 4) : '';
    function ttd(jab, nama, nip, atas) {
      var ch = [];
      ch.push(new D.Paragraph({ children: [run(atas || ' ')], alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, keepNext: true }));
      ch.push(new D.Paragraph({ children: [run(jab, { bold: true })], alignment: D.AlignmentType.CENTER, spacing: { after: 1100 } }));
      ch.push(new D.Paragraph({ children: [run(nama || '(................................)', { bold: true, underline: {} })], alignment: D.AlignmentType.CENTER, spacing: { after: 0 } }));
      if (nip) ch.push(new D.Paragraph({ children: [run('NIP. ' + nip)], alignment: D.AlignmentType.CENTER, spacing: { after: 0 } }));
      return new D.TableCell({ children: ch, borders: { top: NIL, bottom: NIL, left: NIL, right: NIL }, width: { size: 4535, type: D.WidthType.DXA } });
    }
    paras.push(new D.Paragraph({ children: [], spacing: { after: 240 }, keepNext: true }));
    paras.push(new D.Table({
      rows: [new D.TableRow({ cantSplit: true, children: [ttd('Penanggung Jawab UKM', f.pjNama, f.pjNip, ' '), ttd('Pelaksana', f.pelNama, f.pelNip, (title(settings.puskesmas || 'Moncongloe')) + ', ' + tgl)] })],
      width: { size: 9070, type: D.WidthType.DXA }, columnWidths: [4535, 4535],
      borders: { top: NIL, bottom: NIL, left: NIL, right: NIL, insideHorizontal: NIL, insideVertical: NIL }
    }));

    // Daftar pustaka
    paras.push(new D.Paragraph({ children: [run('DAFTAR PUSTAKA', { bold: true })], alignment: D.AlignmentType.CENTER, pageBreakBefore: true, spacing: { after: 240 } }));
    LAP_TEKS.pustaka.forEach(function (r) { paras.push(new D.Paragraph({ children: [run(r)], alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 120, line: 276 }, indent: { left: 567, hanging: 567 } })); });

    var doc = new D.Document({
      creator: 'Aplikasi Kunjungan Balita Moncongloe', title: 'Laporan Kunjungan Lapangan Balita ' + bl,
      styles: { default: { document: { run: { font: FONT, size: SZ } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1701, right: 1134 } } },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONT, size: 20 })] })] }) },
        children: paras
      }]
    });
    return D.Packer.toBlob(doc).then(function (blob) {
      return { blob: blob, name: 'LAPORAN KUNJUNGAN LAPANGAN BALITA - ' + bl.toUpperCase() + '.docx' };
    });
  }
  return { hitung: hitung, draf: draf, buat: buat, JABATAN: JABATAN, blnLabel: blnLabel, pct: pct };
})();
