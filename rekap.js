/* Pembuat file Excel "Lampiran Kunjungan Lapangan Balita" per posyandu (ExcelJS) */
var REKAP = (function () {
  var BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  var JUDUL = 'KUNJUNGAN LAPANGAN PEMANTAUAN TUMBUH KEMBANG DAN MASALAH GIZI IBU DAN ANAK';
  var THIN = { style: 'thin' };
  var ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  var FONT = { name: 'Calibri', size: 11 };

  function dmy(iso, sep) { return iso ? iso.slice(8, 10) + sep + iso.slice(5, 7) + sep + iso.slice(0, 4) : ''; }
  function tc(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function yn(v) { return v || ''; }
  function nz(v) { return v == null || v === '' ? '' : v; }
  function ukurTeks(v, unit) { return v == null || v === '' ? '' : String(v).replace('.', ',') + ' ' + unit; }
  function nomor(v) { return v == null || v === '' ? '' : Number(v); }
  function sheetName(s) { return String(s).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31); }

  function setCell(ws, addr, value, opt) {
    var c = ws.getCell(addr);
    c.value = value === '' ? null : value;
    c.font = Object.assign({}, FONT, (opt && opt.font) || {});
    c.border = ALL;
    c.alignment = Object.assign({ vertical: 'top', horizontal: 'left' }, (opt && opt.align) || {});
    if (opt && opt.numFmt) c.numFmt = opt.numFmt;
    return c;
  }
  function borderRange(ws, r1, c1, r2, c2) {
    for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) {
      var cell = ws.getCell(r, c); cell.border = ALL; if (!cell.font || !cell.font.name) cell.font = FONT;
    }
  }

  function writeBlock(ws, r, no, b, k, hasil, kmTeks, eduTeks) {
    var h = hasil(b, k);
    var mp = k.mpasi || {};
    var ya = function (x) { return x ? 'Ya' : 'Tidak'; };
    var ayah = b.ayah || {}, ibu = b.ibu || {};
    borderRange(ws, r, 1, r + 9, 12);
    // A: nomor
    ws.mergeCells(r, 1, r + 9, 1);
    setCell(ws, 'A' + r, no, { align: { horizontal: 'center', vertical: 'middle' } });
    // B-C: identitas anak
    var ident = [
      ['NIK', b.nik || ''],
      ['Nama Anak', b.nama],
      ['Anak ke', nomor(b.anakKe)],
      ['Jenis Kelamin', b.jk === 'L' ? 'Laki-laki' : 'Perempuan'],
      ['Tanggal lahir', dmy(b.tglLahir, '/')],
      ['Umur Kehamilan', b.uk != null && b.uk !== '' ? String(b.uk).replace('.', ',') + ' minggu' : (b.kategoriLahir || '')],
      ['BB Lahir', b.bbl != null && b.bbl !== '' ? b.bbl + ' gram' : ''],
      ['PB Lahir', ukurTeks(b.pbl, 'cm')],
      ['LK Lahir', ukurTeks(b.lkl, 'cm')],
      ['Alamat', b.alamat || '']
    ];
    ident.forEach(function (x, i) { setCell(ws, 'B' + (r + i), x[0]); setCell(ws, 'C' + (r + i), x[1], { align: { wrapText: true } }); });
    // D-E: identitas orang tua
    var ortu = [['Nama Ayah', ayah.nama], ['NIK', ayah.nik], ['Pendidikan', ayah.pendidikan], ['Pekerjaan', ayah.pekerjaan],
      ['Nama Ibu', ibu.nama], ['NIK', ibu.nik], ['Pendidikan', ibu.pendidikan]];
    ortu.forEach(function (x, i) { setCell(ws, 'D' + (r + i), x[0]); setCell(ws, 'E' + (r + i), x[1] || ''); });
    ws.mergeCells(r + 7, 4, r + 9, 4); ws.mergeCells(r + 7, 5, r + 9, 5);
    setCell(ws, 'D' + (r + 7), 'Pekerjaan '); setCell(ws, 'E' + (r + 7), ibu.pekerjaan || '');
    // F-G: pemeriksaan & status gizi
    var periksa = [['TGL', dmy(k.tgl, '-')], ['BB', nomor(k.bb)], ['TB', nomor(k.tb)], ['LK', nomor(k.lk)], ['LILA', nomor(k.lila)], ['', '']];
    periksa.forEach(function (x, i) { setCell(ws, 'F' + (r + i), x[0]); setCell(ws, 'G' + (r + i), x[1]); });
    ws.mergeCells(r + 6, 6, r + 6, 7);
    setCell(ws, 'F' + (r + 6), 'STATUS GIZI', { font: { bold: true }, align: { horizontal: 'center' } });
    setCell(ws, 'F' + (r + 7), 'BB/U'); setCell(ws, 'G' + (r + 7), h.BBU || '');
    setCell(ws, 'F' + (r + 8), 'TB/U'); setCell(ws, 'G' + (r + 8), h.TBU || '');
    setCell(ws, 'F' + (r + 9), 'BB/TB'); setCell(ws, 'G' + (r + 9), h.BBTB || '');
    // H-I: MP-ASI berkualitas
    var mpasi = [['Asi', ya(mp.asi)], ['Makanan Pokok', ya(mp.pokok)], ['Hewani', ya(mp.hewani)], ['Nabati', ya(mp.nabati)], ['Sayur', ya(mp.sayur)],
      ['Buah', ya(mp.buah)], ['Telur', ya(mp.telur)], ['Asi Eks.', yn(k.asiEks)], ['ASI >6bln', yn(k.asiLanjut)],
      ['MP_ASI', k.belumMpasi ? 'Belum' : (k.umurMpasi != null && k.umurMpasi !== '' ? k.umurMpasi + ' bln' : '')]];
    mpasi.forEach(function (x, i) { setCell(ws, 'H' + (r + i), x[0]); setCell(ws, 'I' + (r + i), x[1]); });
    // J-K: faktor determinan
    setCell(ws, 'J' + r, 'BPJS/JKN '); setCell(ws, 'K' + r, yn(k.bpjs));
    setCell(ws, 'J' + (r + 1), 'Air Bersih '); setCell(ws, 'K' + (r + 1), yn(k.airBersih));
    setCell(ws, 'J' + (r + 2), 'Jamban '); setCell(ws, 'K' + (r + 2), yn(k.jamban));
    ws.mergeCells(r + 3, 10, r + 3, 11);
    setCell(ws, 'J' + (r + 3), 'Imunisasi (' + (k.imunisasi || '………………..') + ')');
    setCell(ws, 'J' + (r + 4), 'Keluarga Merokok'); setCell(ws, 'K' + (r + 4), yn(k.rokok));
    setCell(ws, 'J' + (r + 5), 'Kecacingan'); setCell(ws, 'K' + (r + 5), yn(k.cacingan));
    setCell(ws, 'J' + (r + 6), 'KEK/NON KEK'); setCell(ws, 'K' + (r + 6), k.kek === 'KEK' ? 'KEK' : (k.kek ? 'NON' : ''));
    ws.mergeCells(r + 7, 10, r + 9, 11);
    setCell(ws, 'J' + (r + 7), 'Penyakit Penyerta : ' + (k.penyakit || 'Tidak ada'), { align: { wrapText: true } });
    // L: kebiasaan makan
    ws.mergeCells(r, 12, r + 9, 12);
    var kmT = kmTeks ? kmTeks(k) : (k.kebiasaan || ''), eduT = eduTeks ? eduTeks(k) : '';
    var cL = setCell(ws, 'L' + r, '', { align: { wrapText: true } });
    if (eduT) cL.value = { richText: [{ text: kmT + (kmT ? '\n\n' : ''), font: FONT }, { text: 'Edukasi: ', font: Object.assign({}, FONT, { bold: true }) }, { text: eduT, font: FONT }] };
    else cL.value = kmT || null;
    // tinggi blok menyesuaikan panjang teks kolom L (lebar ±32 karakter per baris)
    var full = kmT + (eduT ? '\n\nEdukasi: ' + eduT : '');
    var lines = full.split('\n').reduce(function (a, par) { return a + Math.max(1, Math.ceil(par.length / 32)); }, 0);
    var penyakit = Math.ceil(('Penyakit Penyerta : ' + (k.penyakit || 'Tidak ada')).length / 24);
    var tinggi = Math.max(150, lines * 14.5 + 8, penyakit * 15 + 105);
    var perBaris = Math.round(tinggi / 10 * 4) / 4;
    for (var i = 0; i < 10; i++) ws.getRow(r + i).height = perBaris;
    return perBaris * 10;
  }

  function buildPosyandu(opt) {
    var wb = new ExcelJS.Workbook();
    wb.creator = 'Aplikasi Kunjungan Balita Moncongloe';
    wb.created = new Date();
    var ws = wb.addWorksheet(sheetName(tc(opt.posyandu)), {
      pageSetup: { paperSize: 9, orientation: 'landscape', scale: 80, horizontalCentered: true, margins: { left: 0.2, right: 0.2, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } },
      properties: { defaultRowHeight: 15 }
    });
    var widths = [5.14, 15.86, 27.57, 11, 20.43, 8, 13.14, 14.71, 5.57, 18.14, 6.71, 29.43];
    widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    ws.getColumn(12).alignment = { wrapText: true, vertical: 'top' };

    // Kop
    ws.mergeCells('A1:K1');
    var t = ws.getCell('A1'); t.value = JUDUL; t.font = { name: 'Calibri', size: 14, bold: true }; t.alignment = { horizontal: 'center' };
    ws.getRow(1).height = 18.75; ws.getRow(2).height = 21; ws.getRow(3).height = 15.75;
    ws.getCell('A2').value = 'PUSKESMAS'; ws.getCell('C2').value = ': ' + (opt.settings.puskesmas || 'MONCONGLOE');
    ws.getCell('A3').value = 'POSYANDU'; ws.getCell('C3').value = ': ' + opt.posyandu + ' DESA ' + opt.desa;
    ['A2', 'C2', 'A3', 'C3'].forEach(function (a) { ws.getCell(a).font = FONT; ws.getCell(a).alignment = { horizontal: 'left' }; });

    // Header kolom
    var hdr = [['A4', 'A4', 'NO', 10], ['B4', 'C4', 'IDENTITAS ANAK', 10], ['D4', 'E4', 'IDENTITAS ORANG TUA', 10], ['F4', 'G4', 'PEMERIKSAAN', 10],
      ['H4', 'I4', 'MP ASI BERKUALITAS', 11], ['J4', 'K4', 'FAKTOR DETERMINAN', 11], ['L4', 'L4', 'KEBIASAAN MAKAN', 11]];
    borderRange(ws, 4, 1, 4, 12);
    hdr.forEach(function (x) {
      if (x[0] !== x[1]) ws.mergeCells(x[0] + ':' + x[1]);
      var c = ws.getCell(x[0]); c.value = x[2]; c.font = { name: 'Calibri', size: x[3], bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = ALL;
    });

    var r = 5;
    // pemisah halaman otomatis agar satu blok balita tidak terbelah (A4 lanskap, skala 80%)
    var ruang = 535, terpakai = 0; // halaman pertama dikurangi kop
    opt.rows.forEach(function (row, i) {
      var h = writeBlock(ws, r, i + 1, row.b, row.k, opt.hasil, opt.kmTeks, opt.eduTeks);
      if (i > 0 && terpakai + h > ruang) { ws.getRow(r - 1).addPageBreak(); terpakai = 0; ruang = 600; }
      terpakai += h;
      r += 10;
    });
    var last = r - 1;

    // Tanda tangan pelaksana
    var sr = last + 2;
    ws.getCell('J' + sr).value = 'Pelaksana';
    ws.getCell('J' + (sr + 3)).value = opt.settings.petugas || '';
    if (opt.settings.nip) ws.getCell('J' + (sr + 4)).value = 'NIP. ' + opt.settings.nip;
    [sr, sr + 3, sr + 4].forEach(function (x) { ws.getCell('J' + x).font = FONT; ws.getCell('J' + x).alignment = { horizontal: 'left' }; });
    ws.pageSetup.printArea = 'A1:L' + (sr + 4);

    var ym = opt.ym;
    var name = 'LAMPIRAN KUNJUNGAN LAPANGAN BALITA ' + BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) + ' - POSYANDU ' + opt.posyandu.replace(/[\\\/:*?"<>|]/g, '') + '.xlsx';
    return wb.xlsx.writeBuffer().then(function (buf) {
      return { name: name, blob: new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) };
    });
  }
  return { buildPosyandu: buildPosyandu };
})();
