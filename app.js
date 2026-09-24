/* Kunjungan Balita Moncongloe — aplikasi offline (PWA) */
'use strict';
var APP_VERSION = '1.1.0';
GIZI.init(WHO_LMS);

/* ================= Master data ================= */
var WILAYAH = [
  ['MONCONGLOE LAPPARA', ['MONCONGLOE LAPPARA', 'BARUGA', 'NIRWANA', 'BALLAPATI', 'ASABRI']],
  ['MONCONGLOE BULU', ['ZIPUR', 'TAMALATE', 'DICCEKANG', 'TOMPO BALANG', 'HOME BASE', 'TAMMU-TAMMU']],
  ['MONCONGLOE', ["BIRING JE'NE", 'PAMANJENGAN', 'PANAIKANG']],
  ['BONTO BUNGA', ['BONTO BUNGA', 'MANJALLING', 'JENE TALLASA']],
  ['BONTO MARANNU', ['TOKKA', 'LEKO', 'JAMBUA']]
];
var PENDIDIKAN = ['Tidak Sekolah', 'SD', 'SMP', 'SMA', 'D3', 'S1 Sederajat', 'S2/S3'];
var PEK_AYAH = ['Petani/Pekebun', 'Buruh Harian', 'Wiraswasta/Pedagang', 'Karyawan Swasta', 'PNS/ASN', 'TNI/Polri', 'Honorer', 'Sopir/Ojek', 'Tukang', 'Tidak Bekerja'];
var PEK_IBU = ['IRT', 'Wiraswasta/Pedagang', 'Karyawan Swasta', 'PNS/ASN', 'Guru', 'Honorer', 'Petani/Pekebun', 'Buruh Harian'];
var MPASI = [['asi', 'ASI', 'Asi'], ['pokok', 'Makanan Pokok', 'Makanan Pokok'], ['hewani', 'Lauk Hewani', 'Hewani'], ['nabati', 'Lauk Nabati', 'Nabati'], ['sayur', 'Sayur', 'Sayur'], ['buah', 'Buah-buahan', 'Buah'], ['telur', 'Telur', 'Telur']];
var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/* ================= Utilitas ================= */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function thisMonth() { return today().slice(0, 7); }
function title(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
function num(v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function fmtNum(v) { return v == null || v === '' ? '' : String(v).replace('.', ','); }
function dmy(iso, sep) { if (!iso) return ''; sep = sep || '/'; return iso.slice(8, 10) + sep + iso.slice(5, 7) + sep + iso.slice(0, 4); }
function tglPanjang(iso) { if (!iso) return ''; return (+iso.slice(8, 10)) + ' ' + BULAN[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); }
function bulanLabel(ym) { return BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
function umurTeks(hari) {
  if (hari == null || hari < 0) return '-';
  var bln = Math.floor(hari / 30.4375);
  if (bln < 1) return hari + ' hari';
  var th = Math.floor(bln / 12), b = bln % 12;
  return bln + ' bln' + (th ? ' (' + th + ' th ' + b + ' bl)' : '');
}
function desaOf(pos) { for (var i = 0; i < WILAYAH.length; i++) if (WILAYAH[i][1].indexOf(pos) >= 0) return WILAYAH[i][0]; return ''; }
function statusClass(kat) {
  if (!kat) return '';
  if (/Sangat|Buruk/.test(kat)) return 'bad';
  if (/Kurang|Pendek/.test(kat)) return 'warn';
  if (/Lebih|Obesitas|Tinggi/.test(kat)) return 'info';
  return 'ok';
}
function chip(label, kat) { return kat ? '<span class="chip ' + statusClass(kat) + '">' + esc(label ? label + ' ' : '') + esc(kat) + '</span>' : ''; }

/* ================= Penyimpanan (IndexedDB) ================= */
var DB = {
  db: null,
  open: function () {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('kunjungan-balita-moncongloe', 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        d.createObjectStore('balita', { keyPath: 'id' });
        var k = d.createObjectStore('kunjungan', { keyPath: 'id' });
        k.createIndex('balitaId', 'balitaId');
        d.createObjectStore('meta', { keyPath: 'key' });
      };
      r.onsuccess = function () { DB.db = r.result; res(); };
      r.onerror = function () { rej(r.error); };
    });
  },
  tx: function (store, mode, fn) {
    return new Promise(function (res, rej) {
      var t = DB.db.transaction(store, mode), s = t.objectStore(store), out;
      var req = fn(s);
      if (req) req.onsuccess = function () { out = req.result; };
      t.oncomplete = function () { res(out); };
      t.onerror = function () { rej(t.error); };
    });
  },
  all: function (store) { return DB.tx(store, 'readonly', function (s) { return s.getAll(); }); },
  get: function (store, key) { return DB.tx(store, 'readonly', function (s) { return s.get(key); }); },
  put: function (store, obj) { return DB.tx(store, 'readwrite', function (s) { return s.put(obj); }); },
  del: function (store, key) { return DB.tx(store, 'readwrite', function (s) { return s.delete(key); }); },
  clear: function (store) { return DB.tx(store, 'readwrite', function (s) { return s.clear(); }); },
  putMany: function (store, arr) { return DB.tx(store, 'readwrite', function (s) { arr.forEach(function (o) { s.put(o); }); }); }
};

var S = { balita: [], kunjungan: [], tomb: [], settings: { key: 'settings', puskesmas: 'MONCONGLOE', petugas: '', nip: '', lastBackup: null }, filter: { q: '', desa: '', pos: '', belum: false } };

function loadAll() {
  return Promise.all([DB.all('balita'), DB.all('kunjungan'), DB.get('meta', 'settings')]).then(function (r) {
    S.tomb = [];
    S.balita = (r[0] || []).filter(function (o) { if (o.deleted) { S.tomb.push({ store: 'balita', rec: o }); return false; } return true; });
    S.kunjungan = (r[1] || []).filter(function (o) { if (o.deleted) { S.tomb.push({ store: 'kunjungan', rec: o }); return false; } return true; });
    if (r[2]) S.settings = Object.assign(S.settings, r[2]);
    try { var f = JSON.parse(localStorage.getItem('kb-filter') || 'null'); if (f) S.filter = Object.assign(S.filter, f, { q: '' }); } catch (e) { }
  });
}
function saveSettings() { return DB.put('meta', S.settings); }
/* Simpan rekaman + tandai belum terkirim (untuk sinkron) */
function applyMem(store, o) {
  var arr = store === 'balita' ? 'balita' : 'kunjungan';
  S[arr] = S[arr].filter(function (x) { return x.id !== o.id; });
  S.tomb = S.tomb.filter(function (t) { return !(t.store === store && t.rec.id === o.id); });
  if (o.deleted) S.tomb.push({ store: store, rec: o }); else S[arr].push(o);
}
function putRec(store, o) {
  o._dirty = 1;
  return DB.put(store, o).then(function () { applyMem(store, o); if (window.SYNC) SYNC.soon(); });
}
function hapusRec(store, o) {
  var t = Object.assign({}, o, { deleted: true, updatedAt: Date.now() });
  return putRec(store, t);
}
function allRecs(store) {
  return (store === 'balita' ? S.balita : S.kunjungan).concat(S.tomb.filter(function (t) { return t.store === store; }).map(function (t) { return t.rec; }));
}
function balitaById(id) { for (var i = 0; i < S.balita.length; i++) if (S.balita[i].id === id) return S.balita[i]; return null; }
function kunjunganById(id) { for (var i = 0; i < S.kunjungan.length; i++) if (S.kunjungan[i].id === id) return S.kunjungan[i]; return null; }
function kunjunganOf(bid) { return S.kunjungan.filter(function (k) { return k.balitaId === bid; }).sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : (a.createdAt < b.createdAt ? 1 : -1); }); }
function lastKunjungan(bid, beforeTgl, exceptId) {
  var ks = kunjunganOf(bid).filter(function (k) { return k.id !== exceptId && (!beforeTgl || k.tgl <= beforeTgl); });
  return ks[0] || null;
}
function hasil(b, k) { return GIZI.hitung({ jk: b.jk, tglLahir: b.tglLahir, tglUkur: k.tgl, bb: k.bb, tb: k.tb, caraUkur: k.caraUkur }); }

/* ================= UI umum ================= */
var view = $('#view');
function toast(msg, ms) {
  var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, ms || 2600);
}
function modal(opts) {
  return new Promise(function (res) {
    var root = $('#modalRoot');
    root.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="box"><h3>' + esc(opts.title) + '</h3><div>' + (opts.html || esc(opts.text || '')) + '</div><div class="row">' +
      (opts.cancel === false ? '' : '<button class="btn" data-a="0" type="button">' + esc(opts.cancel || 'Batal') + '</button>') +
      '<span class="spacer"></span><button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-a="1" type="button">' + esc(opts.ok || 'OK') + '</button></div></div></div>';
    var m = $('.modal', root);
    m.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]');
      if (a || e.target === m) { var v = a ? a.getAttribute('data-a') === '1' : false; var extra = opts.collect ? opts.collect(root) : null; root.innerHTML = ''; res(v ? (extra || true) : false); }
    });
    var ok = $('[data-a="1"]', root); if (ok) ok.focus();
  });
}
function setTitle(t, sub, back) {
  $('#title').innerHTML = esc(t) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '');
  $('#btnBack').hidden = !back;
  $('#btnBack').onclick = function () { if (typeof back === 'string') location.hash = back; else history.back(); };
  document.title = t + ' · Kunjungan Balita';
}
function setNav(k) { $$('.nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === k); }); }
function segHtml(name, opts, val, extraCls) {
  return '<div class="seg ' + (extraCls || '') + '" role="radiogroup">' + opts.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
    return '<label><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (val === v ? ' checked' : '') + '>' + esc(l) + '</label>';
  }).join('') + '</div>';
}
function selectHtml(id, opts, val, placeholder) {
  var has = !val || opts.indexOf(val) >= 0;
  return '<select class="input" id="' + id + '" name="' + id + '"><option value="">' + esc(placeholder || '— pilih —') + '</option>' +
    opts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
    (has ? '' : '<option value="' + esc(val) + '" selected>' + esc(val) + '</option>') + '</select>';
}
function pekHtml(id, opts, val) {
  var isList = !val || opts.indexOf(val) >= 0;
  return selectHtml(id, opts.concat(['Lainnya…']), isList ? val : 'Lainnya…') +
    '<input class="input" id="' + id + 'Lain" name="' + id + 'Lain" placeholder="Tulis pekerjaan" value="' + (isList ? '' : esc(val)) + '"' + (isList ? ' hidden' : '') + '>';
}
function field(label, inner, opts) {
  opts = opts || {};
  return '<div class="field"' + (opts.id ? ' id="f_' + opts.id + '"' : '') + '><' + (opts.forId ? 'label for="' + opts.forId + '"' : 'span class="lbl"') + '>' + esc(label) + (opts.req ? ' <span class="req">*</span>' : '') + '</' + (opts.forId ? 'label' : 'span') + '>' + inner + (opts.help ? '<span class="help">' + opts.help + '</span>' : '') + '</div>';
}
function inp(id, val, o) {
  o = o || {};
  var h = '<input class="input" id="' + id + '" name="' + id + '" value="' + esc(val == null ? '' : val) + '"' +
    (o.type ? ' type="' + o.type + '"' : ' type="text"') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') +
    (o.max ? ' max="' + o.max + '"' : '') + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + ' autocomplete="off">';
  return o.unit ? '<div class="unit">' + h + '<span>' + esc(o.unit) + '</span></div>' : h;
}

/* ================= Router ================= */
function route() {
  var h = location.hash.replace(/^#\/?/, '') || 'beranda';
  var p = h.split('/');
  window.scrollTo(0, 0);
  $('#modalRoot').innerHTML = '';
  if (p[0] === 'beranda') return vBeranda();
  if (p[0] === 'balita' && !p[1]) return vDaftar();
  if (p[0] === 'balita' && p[1] === 'baru') return vFormBalita(null);
  if (p[0] === 'balita' && p[2] === 'edit') return vFormBalita(p[1]);
  if (p[0] === 'balita') return vDetail(p[1]);
  if (p[0] === 'kunjungan' && p[1] === 'baru') return vFormKunjungan(p[2], null);
  if (p[0] === 'kunjungan' && p[2] === 'edit') return vFormKunjungan(null, p[1]);
  if (p[0] === 'rekap') return vRekap();
  if (p[0] === 'pengaturan') return vPengaturan();
  location.hash = '#/beranda';
}
window.addEventListener('hashchange', route);

/* ================= Beranda ================= */
function creditHtml() { return '<div class="credit"><img src="logo-poltekkes.png" alt="Kemenkes Poltekkes Makassar" width="640" height="175"><p>Dikembangkan oleh <b>Manjilala</b> – Poltekkes Kemenkes Makassar</p></div>'; }

function vBeranda() {
  setNav('beranda'); setTitle('Kunjungan Balita', 'Puskesmas ' + title(S.settings.puskesmas));
  var ym = thisMonth();
  var bulanIni = latestPerBalita(ym);
  var dikunjungi = Object.keys(bulanIni).length;
  var cnt = { stunting: 0, wasting: 0, underweight: 0 };
  Object.keys(bulanIni).forEach(function (bid) {
    var b = balitaById(bid); if (!b) return; var r = hasil(b, bulanIni[bid]);
    if (r.zTBU != null && r.zTBU < -2) cnt.stunting++;
    if (r.zBBTB != null && r.zBBTB < -2) cnt.wasting++;
    if (r.zBBU != null && r.zBBU < -2) cnt.underweight++;
  });
  var hariBackup = S.settings.lastBackup ? Math.floor((Date.now() - S.settings.lastBackup) / 86400000) : null;
  var perluBackup = S.kunjungan.length > 0 && (hariBackup == null || hariBackup >= 7);
  var h = '';
  if (perluBackup) h += '<div class="warnbox" style="display:flex;gap:10px;align-items:center"><span style="flex:1">' + (hariBackup == null ? 'Data belum pernah dicadangkan.' : 'Cadangan terakhir ' + hariBackup + ' hari lalu.') + ' Simpan cadangan agar data aman jika HP rusak atau hilang.</span><a class="btn sm" href="#/pengaturan">Cadangkan</a></div>';
  if (!S.settings.petugas) h += '<div class="banner"><span style="flex:1">Nama dan NIP pelaksana belum diisi. Keduanya dipakai di tanda tangan rekap.</span><a class="btn sm" href="#/pengaturan">Isi</a></div>';
  h += '<h2>' + esc(bulanLabel(ym)) + '</h2><div class="stats">' +
    '<div class="stat"><b>' + dikunjungi + '</b><span>dikunjungi dari ' + S.balita.length + ' balita</span></div>' +
    '<div class="stat"><b>' + cnt.stunting + '</b><span>pendek / sangat pendek</span></div>' +
    '<div class="stat"><b>' + cnt.wasting + '</b><span>gizi kurang / buruk</span></div></div>';
  h += '<div class="row" style="margin-top:14px"><a class="btn primary" style="flex:1" href="#/balita/baru">+ Balita baru</a><a class="btn" style="flex:1" href="#/balita">Cari balita</a></div>';

  // Kunjungan terakhir
  var recent = S.kunjungan.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }).slice(0, 6);
  h += '<h2>Terakhir dicatat</h2>';
  if (!recent.length) {
    h += '<div class="panel empty"><b>Belum ada kunjungan</b>Mulai dengan menambahkan balita baru. Setelah identitasnya tersimpan, formulir kunjungan pertama langsung terbuka.' +
      '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn sm" id="btnContoh" type="button">Muat data contoh untuk uji coba</button></div></div>';
  } else {
    h += '<div class="list">' + recent.map(function (k) {
      var b = balitaById(k.balitaId); if (!b) return '';
      var r = hasil(b, k);
      return '<a class="item" href="#/balita/' + b.id + '"><div class="avatar ' + (b.jk === 'P' ? 'p' : '') + '">' + esc(b.nama.charAt(0).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(b.nama) + '</div><div class="s">' + esc(tglPanjang(k.tgl)) + ' · ' + esc(title(b.posyandu)) + '</div><div class="chips">' + chip('', r.TBU) + chip('', r.BBTB) + '</div></div></a>';
    }).join('') + '</div>';
  }
  // Per posyandu bulan ini
  if (S.balita.length) {
    h += '<h2>Per posyandu bulan ini</h2><div class="list">';
    WILAYAH.forEach(function (w) {
      w[1].forEach(function (pos) {
        var terdaftar = S.balita.filter(function (b) { return b.posyandu === pos; });
        if (!terdaftar.length) return;
        var sudah = terdaftar.filter(function (b) { return bulanIni[b.id]; }).length;
        h += '<a class="pos" style="text-decoration:none;color:inherit" href="#/balita" data-pos="' + esc(pos) + '"><span class="n">' + esc(title(pos)) + ' <span class="muted small">· ' + esc(title(w[0])) + '</span></span><span class="num small muted">' + sudah + '/' + terdaftar.length + '</span></a>';
      });
    });
    h += '</div>';
  }
  h += creditHtml();
  view.innerHTML = '<div class="stack">' + h + '</div>';
  $$('[data-pos]', view).forEach(function (a) { a.addEventListener('click', function () { S.filter = { q: '', desa: desaOf(a.getAttribute('data-pos')), pos: a.getAttribute('data-pos'), belum: false }; saveFilter(); }); });
  var bc = $('#btnContoh'); if (bc) bc.onclick = muatContoh;
}
function latestPerBalita(ym) {
  var m = {};
  S.kunjungan.forEach(function (k) { if (k.tgl.slice(0, 7) === ym) { var c = m[k.balitaId]; if (!c || k.tgl > c.tgl || (k.tgl === c.tgl && k.createdAt > c.createdAt)) m[k.balitaId] = k; } });
  return m;
}
function saveFilter() { try { localStorage.setItem('kb-filter', JSON.stringify(S.filter)); } catch (e) { } }

/* ================= Daftar balita ================= */
function vDaftar() {
  setNav('balita'); setTitle('Daftar Balita', S.balita.length + ' balita terdaftar');
  var f = S.filter;
  var desaOpt = WILAYAH.map(function (w) { return w[0]; });
  var posOpt = f.desa ? (WILAYAH.filter(function (w) { return w[0] === f.desa; })[0] || [0, []])[1] : [];
  view.innerHTML = '<div class="search"><input class="input" id="q" type="search" placeholder="Cari nama, NIK, atau nama ibu" value="' + esc(f.q) + '" autocomplete="off">' +
    '<div class="grid2">' + selectHtml('fDesa', desaOpt, f.desa, 'Semua desa') + selectHtml('fPos', posOpt, f.pos, 'Semua posyandu') + '</div>' +
    '<label class="row small muted" style="gap:8px"><input type="checkbox" id="fBelum"' + (f.belum ? ' checked' : '') + '> Hanya yang belum dikunjungi bulan ini</label></div><div id="listWrap"></div>' +
    '<a class="btn primary fab" href="#/balita/baru">+ Balita baru</a>';
  $$('#fDesa option,#fPos option').forEach(function (o) { if (o.value) o.textContent = title(o.value); });
  function draw() {
    var q = f.q.trim().toLowerCase(), bi = latestPerBalita(thisMonth());
    var rows = S.balita.filter(function (b) {
      if (f.desa && b.desa !== f.desa) return false;
      if (f.pos && b.posyandu !== f.pos) return false;
      if (f.belum && bi[b.id]) return false;
      if (q && (b.nama + ' ' + (b.nik || '') + ' ' + ((b.ibu && b.ibu.nama) || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.nama.localeCompare(b.nama, 'id'); });
    if (!rows.length) {
      $('#listWrap').innerHTML = '<div class="panel empty"><b>' + (S.balita.length ? 'Tidak ada yang cocok' : 'Belum ada balita') + '</b>' + (S.balita.length ? 'Ubah kata kunci atau filter.' : 'Tambahkan balita baru dengan tombol di bawah.') + '</div>';
      return;
    }
    $('#listWrap').innerHTML = '<div class="list">' + rows.map(function (b) {
      var k = lastKunjungan(b.id), r = k ? hasil(b, k) : null;
      var umur = GIZI.umurHari(b.tglLahir, today());
      return '<a class="item" href="#/balita/' + b.id + '"><div class="avatar ' + (b.jk === 'P' ? 'p' : '') + '">' + esc(b.nama.charAt(0).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(b.nama) + '</div>' +
        '<div class="s">' + esc(umurTeks(umur)) + ' · ' + esc(title(b.posyandu)) + (k ? ' · terakhir ' + esc(dmy(k.tgl)) : ' · belum ada kunjungan') + '</div>' +
        (r ? '<div class="chips">' + chip('', r.BBU) + chip('', r.TBU) + chip('', r.BBTB) + '</div>' : '') + '</div>' + (bi[b.id] ? '<span class="done">✓ bulan ini</span>' : '') + '</a>';
    }).join('') + '</div><p class="small muted" style="text-align:center">' + rows.length + ' balita</p>';
  }
  draw();
  $('#q').addEventListener('input', function (e) { f.q = e.target.value; draw(); });
  $('#fDesa').addEventListener('change', function (e) { f.desa = e.target.value; f.pos = ''; saveFilter(); vDaftar(); });
  $('#fPos').addEventListener('change', function (e) { f.pos = e.target.value; saveFilter(); draw(); });
  $('#fBelum').addEventListener('change', function (e) { f.belum = e.target.checked; saveFilter(); draw(); });
}

/* ================= Form balita (data induk) ================= */
function vFormBalita(id) {
  var b = id ? balitaById(id) : null;
  if (id && !b) { location.hash = '#/balita'; return; }
  b = b || { ayah: {}, ibu: {} };
  setNav('balita'); setTitle(id ? 'Ubah Data Induk' : 'Balita Baru', id ? b.nama : 'Data identitas diisi sekali', id ? '#/balita/' + id : '#/balita');
  var posOpt = b.desa ? (WILAYAH.filter(function (w) { return w[0] === b.desa; })[0] || [0, []])[1] : [];
  var h = '<form id="fb" class="stack" novalidate>' +
    '<div class="sect"><p class="sect-h"><b>Identitas Anak</b></p>' +
    field('Nama balita', inp('nama', b.nama, { ph: 'Nama lengkap' }), { req: 1, forId: 'nama', id: 'nama' }) +
    field('NIK balita', inp('nik', b.nik, { mode: 'numeric', maxlength: 16, ph: '16 digit' }), { forId: 'nik', id: 'nik', help: 'Boleh dikosongkan jika belum ada.' }) +
    field('Jenis kelamin', segHtml('jk', [['L', 'Laki-laki'], ['P', 'Perempuan']], b.jk), { req: 1, id: 'jk' }) +
    '<div class="grid2">' + field('Tanggal lahir', inp('tglLahir', b.tglLahir, { type: 'date', max: today() }), { req: 1, forId: 'tglLahir', id: 'tglLahir' }) +
    field('Anak ke-', inp('anakKe', b.anakKe, { mode: 'numeric', ph: '1' }), { forId: 'anakKe' }) + '</div>' +
    '<div class="grid2 stack-sm">' + field('Desa', selectHtml('desa', WILAYAH.map(function (w) { return w[0]; }), b.desa), { req: 1, forId: 'desa', id: 'desa' }) +
    field('Posyandu', selectHtml('posyandu', posOpt, b.posyandu), { req: 1, forId: 'posyandu', id: 'posyandu' }) + '</div>' +
    field('Alamat', inp('alamat', b.alamat, { ph: 'Dusun / blok / nomor rumah' }), { forId: 'alamat' }) + '</div>' +

    '<div class="sect"><p class="sect-h"><b>Riwayat Lahir</b></p>' +
    '<div class="grid2">' + field('Usia kehamilan', inp('uk', b.uk, { mode: 'decimal', unit: 'mgg', ph: '38' }), { forId: 'uk', id: 'uk' }) +
    field('Kategori lahir', segHtml('kategoriLahir', ['Cukup Bulan', 'Prematur'], b.kategoriLahir), { id: 'kategoriLahir' }) + '</div>' +
    '<p class="help" style="margin:-6px 0 0">Kategori terisi otomatis dari usia kehamilan (&lt; 37 minggu = prematur).</p>' +
    '<div class="grid2">' + field('BB lahir', inp('bbl', b.bbl, { mode: 'decimal', unit: 'gram', ph: '3000' }), { forId: 'bbl', id: 'bbl' }) +
    field('PB lahir', inp('pbl', b.pbl, { mode: 'decimal', unit: 'cm', ph: '49' }), { forId: 'pbl', id: 'pbl' }) + '</div>' +
    '<div class="grid2">' + field('LK lahir', inp('lkl', b.lkl, { mode: 'decimal', unit: 'cm', ph: '33' }), { forId: 'lkl', id: 'lkl' }) + '<span></span></div></div>' +

    ortuSect('Ayah', 'ayah', b.ayah || {}, PEK_AYAH) + ortuSect('Ibu', 'ibu', b.ibu || {}, PEK_IBU) +
    '<div id="formErr"></div>' +
    '<div class="savebar">' + (id ? '<a class="btn" href="#/balita/' + id + '">Batal</a>' : '') + '<button class="btn primary" type="submit">' + (id ? 'Simpan perubahan' : 'Simpan &amp; isi kunjungan') + '</button></div></form>';
  view.innerHTML = h;
  $$('#desa option').forEach(function (o) { if (o.value) o.textContent = title(o.value); });
  $$('#posyandu option').forEach(function (o) { if (o.value) o.textContent = title(o.value); });
  var fm = $('#fb');
  $('#desa').addEventListener('change', function (e) {
    var ps = (WILAYAH.filter(function (w) { return w[0] === e.target.value; })[0] || [0, []])[1];
    $('#posyandu').innerHTML = '<option value="">— pilih —</option>' + ps.map(function (p) { return '<option value="' + esc(p) + '">' + esc(title(p)) + '</option>'; }).join('');
  });
  $('#uk').addEventListener('input', function (e) {
    var v = num(e.target.value); if (v == null) return;
    var val = v < 37 ? 'Prematur' : 'Cukup Bulan';
    $$('input[name=kategoriLahir]').forEach(function (r) { r.checked = r.value === val; });
  });
  $('#bbl').addEventListener('blur', function (e) { var v = num(e.target.value); if (v != null && v > 0 && v < 10) { e.target.value = Math.round(v * 1000); toast('BB lahir diubah ke gram: ' + e.target.value + ' g'); } });
  ['ayahPek', 'ibuPek'].forEach(function (k) { $('#' + k).addEventListener('change', function (e) { var o = $('#' + k + 'Lain'); o.hidden = e.target.value !== 'Lainnya…'; if (!o.hidden) o.focus(); }); });
  $('#nik').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('#ayahNik').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('#ibuNik').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });

  fm.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(fm), g = function (k) { var v = fd.get(k); return v == null ? '' : String(v).trim(); };
    var errs = [], warns = [];
    $$('.input.err', fm).forEach(function (x) { x.classList.remove('err'); });
    function bad(idf, msg) { errs.push(msg); var el = $('#' + idf); if (el) el.classList.add('err'); }
    var o = {
      id: b.id || uid(), nama: g('nama'), nik: g('nik'), jk: g('jk'), tglLahir: g('tglLahir'), anakKe: g('anakKe'),
      desa: g('desa'), posyandu: g('posyandu'), alamat: g('alamat'), uk: num(g('uk')), kategoriLahir: g('kategoriLahir'),
      bbl: num(g('bbl')), pbl: num(g('pbl')), lkl: num(g('lkl')),
      ayah: ortuRead(fd, 'ayah'), ibu: ortuRead(fd, 'ibu'),
      createdAt: b.createdAt || Date.now(), updatedAt: Date.now()
    };
    if (!o.nama) bad('nama', 'Nama balita wajib diisi.');
    if (!o.jk) errs.push('Pilih jenis kelamin.');
    if (!o.tglLahir) bad('tglLahir', 'Tanggal lahir wajib diisi.');
    else if (o.tglLahir > today()) bad('tglLahir', 'Tanggal lahir tidak boleh sesudah hari ini.');
    else if (GIZI.umurHari(o.tglLahir, today()) > 1856) warns.push('Umur balita sudah di atas 60 bulan.');
    if (!o.desa) bad('desa', 'Pilih desa.');
    if (!o.posyandu) bad('posyandu', 'Pilih posyandu.');
    if (o.nik && o.nik.length !== 16) bad('nik', 'NIK balita harus 16 digit (atau kosongkan).');
    if (o.ayah.nik && o.ayah.nik.length !== 16) bad('ayahNik', 'NIK ayah harus 16 digit (atau kosongkan).');
    if (o.ibu.nik && o.ibu.nik.length !== 16) bad('ibuNik', 'NIK ibu harus 16 digit (atau kosongkan).');
    if (o.uk != null && (o.uk < 20 || o.uk > 45)) bad('uk', 'Usia kehamilan diisi dalam minggu (20–45).');
    if (o.bbl != null && (o.bbl < 500 || o.bbl > 6000)) bad('bbl', 'BB lahir diisi dalam gram (500–6000).');
    if (o.pbl != null && (o.pbl < 30 || o.pbl > 60)) bad('pbl', 'PB lahir tidak wajar (30–60 cm).');
    if (o.lkl != null && (o.lkl < 20 || o.lkl > 45)) bad('lkl', 'LK lahir tidak wajar (20–45 cm).');
    var dup = S.balita.filter(function (x) { return x.id !== o.id && ((o.nik && x.nik === o.nik) || (x.nama.toLowerCase() === o.nama.toLowerCase() && x.tglLahir === o.tglLahir)); })[0];
    if (errs.length) { $('#formErr').innerHTML = '<div class="warnbox bad"><b>Periksa lagi:</b><ul>' + errs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; $('#formErr').scrollIntoView({ block: 'center' }); return; }
    var go = Promise.resolve(true);
    if (dup) go = modal({ title: 'Mungkin data ganda', text: 'Sudah ada balita "' + dup.nama + '" (' + dmy(dup.tglLahir) + ', ' + title(dup.posyandu) + ') dengan ' + (o.nik && dup.nik === o.nik ? 'NIK yang sama' : 'nama dan tanggal lahir yang sama') + '. Tetap simpan sebagai balita baru?', ok: 'Tetap simpan', cancel: 'Batal' });
    go.then(function (y) {
      if (!y) return;
      if (warns.length) toast(warns[0]);
      putRec('balita', o).then(function () {
        if (id) { toast('Data induk tersimpan'); location.hash = '#/balita/' + o.id; }
        else { toast('Balita tersimpan. Lanjut isi kunjungan.'); location.replace('#/kunjungan/baru/' + o.id); }
      });
    });
  });
}
function ortuSect(label, k, o, pek) {
  return '<div class="sect"><p class="sect-h"><b>Identitas ' + label + '</b></p>' +
    field('Nama ' + label.toLowerCase(), inp(k + 'Nama', o.nama), { forId: k + 'Nama' }) +
    field('NIK ' + label.toLowerCase(), inp(k + 'Nik', o.nik, { mode: 'numeric', maxlength: 16, ph: '16 digit' }), { forId: k + 'Nik', id: k + 'Nik' }) +
    '<div class="grid2 stack-sm">' + field('Pendidikan terakhir', selectHtml(k + 'Pend', PENDIDIKAN, o.pendidikan), { forId: k + 'Pend' }) +
    field('Pekerjaan', pekHtml(k + 'Pek', pek, o.pekerjaan), { forId: k + 'Pek' }) + '</div></div>';
}
function ortuRead(fd, k) {
  var p = String(fd.get(k + 'Pek') || '');
  if (p === 'Lainnya…') p = String(fd.get(k + 'PekLain') || '').trim();
  return { nama: String(fd.get(k + 'Nama') || '').trim(), nik: String(fd.get(k + 'Nik') || '').trim(), pendidikan: String(fd.get(k + 'Pend') || ''), pekerjaan: p };
}

/* ================= Detail balita ================= */
function vDetail(id) {
  var b = balitaById(id);
  if (!b) { location.hash = '#/balita'; return; }
  setNav('balita'); setTitle(b.nama, title(b.posyandu) + ' · ' + title(b.desa), '#/balita');
  var ks = kunjunganOf(id);
  var umur = GIZI.umurHari(b.tglLahir, today());
  var bi = latestPerBalita(thisMonth())[id];
  var h = '<div class="panel"><div class="row"><div class="avatar ' + (b.jk === 'P' ? 'p' : '') + '">' + esc(b.nama.charAt(0).toUpperCase()) + '</div><div style="flex:1;min-width:0"><b>' + esc(b.nama) + '</b><div class="small muted">' + (b.jk === 'L' ? 'Laki-laki' : 'Perempuan') + ' · ' + esc(umurTeks(umur)) + ' · lahir ' + esc(dmy(b.tglLahir)) + '</div></div></div>' +
    '<div class="row" style="margin-top:12px"><a class="btn primary" style="flex:1" href="#/kunjungan/baru/' + id + '">' + (bi ? 'Tambah kunjungan lagi' : '+ Kunjungan ' + esc(BULAN[new Date().getMonth()])) + '</a></div>' +
    (bi ? '<p class="small" style="margin:8px 0 0;color:var(--ok)">✓ Sudah dikunjungi bulan ini (' + esc(dmy(bi.tgl)) + ')</p>' : '') + '</div>';

  if (ks.length > 1) h += '<h2>Tren z-score</h2><div class="panel">' + trendSvg(b, ks.slice().reverse()) + '</div>';

  h += '<h2>Riwayat kunjungan (' + ks.length + ')</h2>';
  if (!ks.length) h += '<div class="panel empty"><b>Belum ada kunjungan</b>Tekan tombol di atas untuk mengisi kunjungan pertama.</div>';
  else h += '<div class="list">' + ks.map(function (k, i) {
    var r = hasil(b, k), prev = ks[i + 1];
    var dbb = prev && k.bb != null && prev.bb != null ? Math.round((k.bb - prev.bb) * 100) / 100 : null;
    return '<div class="visit"><div class="top"><b>' + esc(tglPanjang(k.tgl)) + '</b><span class="small muted">umur ' + esc(umurTeks(r.umurHari)) + '</span><span class="spacer"></span><a class="btn sm" href="#/kunjungan/' + k.id + '/edit">Ubah</a></div>' +
      '<div class="meas num">BB ' + fmtNum(k.bb) + ' kg' + (dbb != null ? ' (' + (dbb > 0 ? '+' : '') + fmtNum(dbb) + ')' : '') + ' · ' + (k.caraUkur === 'terlentang' ? 'PB ' : 'TB ') + fmtNum(k.tb) + ' cm' + (k.lk != null ? ' · LK ' + fmtNum(k.lk) : '') + (k.lila != null ? ' · LiLA ' + fmtNum(k.lila) : '') + '</div>' +
      '<div class="chips row" style="gap:4px">' + chip('BB/U', r.BBU) + chip('TB/U', r.TBU) + chip('BB/TB', r.BBTB) + '</div></div>';
  }).join('') + '</div>';

  h += '<h2>Data induk</h2><details class="panel"><summary>Identitas anak, riwayat lahir, orang tua</summary><dl class="kv">' +
    kv('NIK', b.nik) + kv('Anak ke-', b.anakKe) + kv('Alamat', b.alamat) + kv('Posyandu', title(b.posyandu) + ', Desa ' + title(b.desa)) +
    kv('Usia kehamilan', b.uk != null ? fmtNum(b.uk) + ' minggu' + (b.kategoriLahir ? ' (' + b.kategoriLahir + ')' : '') : b.kategoriLahir) +
    kv('BB lahir', b.bbl != null ? b.bbl + ' gram' : '') + kv('PB lahir', b.pbl != null ? fmtNum(b.pbl) + ' cm' : '') + kv('LK lahir', b.lkl != null ? fmtNum(b.lkl) + ' cm' : '') +
    kv('Ayah', [b.ayah.nama, b.ayah.pendidikan, b.ayah.pekerjaan].filter(Boolean).join(' · ')) + kv('NIK ayah', b.ayah.nik) +
    kv('Ibu', [b.ibu.nama, b.ibu.pendidikan, b.ibu.pekerjaan].filter(Boolean).join(' · ')) + kv('NIK ibu', b.ibu.nik) +
    '</dl><div class="row" style="margin-top:14px"><a class="btn sm" href="#/balita/' + id + '/edit">Ubah data induk</a><span class="spacer"></span><button class="btn sm danger" id="btnHapusB" type="button">Hapus balita</button></div></details>';
  view.innerHTML = '<div class="stack">' + h + '</div>';
  $('#btnHapusB').onclick = function () {
    modal({ title: 'Hapus ' + b.nama + '?', text: 'Data induk dan ' + ks.length + ' kunjungan akan dihapus dari HP ini. Tindakan ini tidak bisa dibatalkan.', ok: 'Hapus', danger: true }).then(function (y) {
      if (!y) return;
      Promise.all(ks.map(function (k) { return hapusRec('kunjungan', k); }).concat([hapusRec('balita', b)])).then(function () {
        toast('Balita dihapus'); location.hash = '#/balita';
      });
    });
  };
}
function kv(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + (v == null || v === '' ? '<span class="muted">—</span>' : esc(v)) + '</dd>'; }
function trendSvg(b, ks) {
  var W = 360, H = 170, L = 28, R = 10, T = 10, B = 22;
  var ser = [['zBBU', 'BB/U', 'var(--accent)'], ['zTBU', 'TB/U', 'var(--brand)'], ['zBBTB', 'BB/TB', 'var(--info)']];
  var pts = ks.map(function (k) { return hasil(b, k); });
  var lo = -4, hi = 2;
  pts.forEach(function (r) { ser.forEach(function (s) { var z = r[s[0]]; if (z != null) { lo = Math.min(lo, Math.floor(z)); hi = Math.max(hi, Math.ceil(z)); } }); });
  var n = ks.length, x = function (i) { return L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1)); }, y = function (z) { return T + (hi - z) * (H - T - B) / (hi - lo); };
  var s = '<svg class="trend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tren z-score">';
  for (var z = lo; z <= hi; z++) {
    var strong = z === -2 || z === -3;
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(z) + '" y2="' + y(z) + '" stroke="' + (strong ? 'var(--bad)' : 'var(--line)') + '" stroke-width="1" ' + (strong ? 'stroke-dasharray="4 4" opacity=".6"' : '') + '/>';
    s += '<text x="' + (L - 6) + '" y="' + (y(z) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + (z > 0 ? '+' : '') + z + '</text>';
  }
  ks.forEach(function (k, i) { if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + k.tgl.slice(5, 7) + '/' + k.tgl.slice(2, 4) + '</text>'; });
  ser.forEach(function (sr) {
    var d = '', dots = '';
    pts.forEach(function (r, i) { var z = r[sr[0]]; if (z == null) return; d += (d ? 'L' : 'M') + x(i) + ' ' + y(z); dots += '<circle cx="' + x(i) + '" cy="' + y(z) + '" r="' + (i === n - 1 ? 5 : 3.5) + '" fill="' + sr[2] + '"/>'; });
    s += '<path d="' + d + '" fill="none" stroke="' + sr[2] + '" stroke-width="2.5" stroke-linejoin="round"/>' + dots;
  });
  s += '</svg><div class="row small" style="gap:14px;margin-top:6px">' + ser.map(function (sr) { return '<span class="row" style="gap:6px"><span style="width:12px;height:12px;border-radius:6px;background:' + sr[2] + '"></span>' + sr[1] + '</span>'; }).join('') + '<span class="muted">garis putus: −2 dan −3 SD</span></div>';
  return s;
}

/* ================= Form kunjungan ================= */
function vFormKunjungan(balitaId, kid) {
  var k = kid ? kunjunganById(kid) : null;
  if (kid && !k) { location.hash = '#/beranda'; return; }
  var b = balitaById(k ? k.balitaId : balitaId);
  if (!b) { location.hash = '#/balita'; return; }
  var prev = k ? lastKunjungan(b.id, k.tgl, k.id) : lastKunjungan(b.id);
  var isNew = !k;
  var pf = isNew && prev; // prefill dari kunjungan sebelumnya
  if (isNew) {
    k = { tgl: today(), mpasi: {}, penyakit: '', kebiasaan: '' };
    if (pf) ['mpasi', 'asiEks', 'asiLanjut', 'bpjs', 'airBersih', 'jamban', 'imunisasi', 'rokok', 'cacingan', 'kek', 'umurMpasi', 'belumMpasi', 'mpasiKet'].forEach(function (f) { k[f] = f === 'mpasi' ? Object.assign({}, prev.mpasi) : prev[f]; });
  }
  var umurNow = GIZI.umurHari(b.tglLahir, k.tgl);
  if (!k.caraUkur) k.caraUkur = umurNow < 731 ? 'terlentang' : 'berdiri';
  setNav('balita'); setTitle(isNew ? 'Kunjungan Baru' : 'Ubah Kunjungan', b.nama, '#/balita/' + b.id);
  var pfNote = pf ? '<span class="hint">terisi dari kunjungan ' + esc(dmy(prev.tgl)) + ', cek kembali</span>' : '';
  var yn = [['Ya', 'Ya'], ['Tidak', 'Tidak']];
  var h = '<form id="fk" class="stack" novalidate>' +
    '<div class="panel small"><b>' + esc(b.nama) + '</b> · ' + (b.jk === 'L' ? 'Laki-laki' : 'Perempuan') + ' · lahir ' + esc(dmy(b.tglLahir)) + '<br><span class="muted">' + esc(title(b.posyandu)) + ', ' + esc(title(b.desa)) + (b.ibu.nama ? ' · Ibu ' + esc(b.ibu.nama) : '') + '</span></div>' +

    '<div class="sect"><p class="sect-h"><b>Pemeriksaan</b>' + (prev ? '<span class="hint">kunjungan lalu ' + esc(dmy(prev.tgl)) + ': BB ' + fmtNum(prev.bb) + ' kg, ' + (prev.caraUkur === 'terlentang' ? 'PB ' : 'TB ') + fmtNum(prev.tb) + ' cm</span>' : '') + '</p>' +
    field('Tanggal kunjungan', inp('tgl', k.tgl, { type: 'date', max: today() }), { req: 1, forId: 'tgl', id: 'tgl' }) +
    '<div class="grid2">' + field('Berat badan', inp('bb', fmtNum(k.bb), { mode: 'decimal', unit: 'kg', ph: '9,5' }), { req: 1, forId: 'bb', id: 'bb' }) +
    field('Panjang / tinggi', inp('tb', fmtNum(k.tb), { mode: 'decimal', unit: 'cm', ph: '78,5' }), { req: 1, forId: 'tb', id: 'tb' }) + '</div>' +
    field('Diukur', segHtml('caraUkur', [['terlentang', 'Terlentang (PB)'], ['berdiri', 'Berdiri (TB)']], k.caraUkur), { req: 1, id: 'caraUkur', help: 'Standar WHO: di bawah 24 bulan diukur terlentang, 24 bulan ke atas berdiri. Jika berbeda, dikoreksi ±0,7 cm otomatis.' }) +
    '<div class="grid2">' + field('Lingkar kepala', inp('lk', fmtNum(k.lk), { mode: 'decimal', unit: 'cm', ph: '46' }), { forId: 'lk', id: 'lk' }) +
    field('LiLA', inp('lila', fmtNum(k.lila), { mode: 'decimal', unit: 'cm', ph: '14,5' }), { forId: 'lila', id: 'lila' }) + '</div>' +
    '<div id="zbox"></div></div>' +

    '<div class="sect"><p class="sect-h"><b>MP-ASI Berkualitas</b>' + pfNote + '</p>' +
    field('Makanan yang diberikan (pilih semua yang sesuai)', '<div class="seg check">' + MPASI.map(function (m) { return '<label><input type="checkbox" name="m_' + m[0] + '"' + (k.mpasi && k.mpasi[m[0]] ? ' checked' : '') + '>' + esc(m[1]) + '</label>'; }).join('') + '</div>') +
    field('ASI eksklusif (0–6 bulan)', segHtml('asiEks', yn, k.asiEks), { id: 'asiEks' }) +
    field('ASI dilanjutkan usia 6–23 bulan', segHtml('asiLanjut', yn, k.asiLanjut), { id: 'asiLanjut' }) +
    '<div class="grid2">' + field('Mulai MP-ASI umur', inp('umurMpasi', k.umurMpasi, { mode: 'numeric', unit: 'bln', ph: '6' }), { forId: 'umurMpasi', id: 'umurMpasi' }) +
    '<div class="field"><span class="lbl">&nbsp;</span><label class="row small" style="gap:8px;min-height:46px"><input type="checkbox" id="belumMpasi" name="belumMpasi"' + (k.belumMpasi ? ' checked' : '') + '> Belum MP-ASI</label></div></div>' +
    field('Keterangan MP-ASI awal', inp('mpasiKet', k.mpasiKet, { ph: 'mis. bubur instan sampai 9 bln' }), { forId: 'mpasiKet' }) + '</div>' +

    '<div class="sect"><p class="sect-h"><b>Faktor Determinan</b>' + pfNote + '</p>' +
    field('Kepemilikan BPJS/JKN', segHtml('bpjs', yn, k.bpjs)) +
    field('Ketersediaan air bersih', segHtml('airBersih', yn, k.airBersih)) +
    field('Kepemilikan jamban', segHtml('jamban', yn, k.jamban)) +
    field('Imunisasi dasar', segHtml('imunisasi', ['Ya, Lengkap', 'Ya, Tidak Lengkap', 'Tidak'], k.imunisasi)) +
    field('Ada keluarga yang merokok', segHtml('rokok', yn, k.rokok)) +
    field('Ada riwayat kecacingan', segHtml('cacingan', yn, k.cacingan)) +
    field('Riwayat kehamilan ibu', segHtml('kek', ['KEK', 'Tidak KEK'], k.kek)) +
    field('Penyakit penyerta', '<textarea class="input" id="penyakit" name="penyakit" style="min-height:64px" placeholder="Tidak ada">' + esc(k.penyakit) + '</textarea><div class="qchips" data-target="penyakit">' + ['Tidak ada', 'Demam', 'Batuk', 'Flu', 'Diare', 'ISPA', 'Sariawan'].map(function (x) { return '<button type="button">' + x + '</button>'; }).join('') + '</div>', { forId: 'penyakit' }) + '</div>' +

    '<div class="sect"><p class="sect-h"><b>Kebiasaan Makan</b></p>' +
    field('Pola makan balita', '<textarea class="input" id="kebiasaan" name="kebiasaan" placeholder="Frekuensi makan, jenis makanan, jajanan, nafsu makan, kebiasaan cuci tangan…">' + esc(k.kebiasaan) + '</textarea>', { forId: 'kebiasaan' }) + '</div>' +
    '<div id="formErr"></div>' +
    '<div class="savebar">' + (!isNew ? '<button class="btn danger" type="button" id="btnHapusK" style="flex:0 0 auto">Hapus</button>' : '') + '<button class="btn primary" type="submit">Simpan kunjungan</button></div></form>';
  view.innerHTML = h;
  var fm = $('#fk');
  var caraTouched = !isNew;
  function readK() {
    var fd = new FormData(fm), g = function (x) { var v = fd.get(x); return v == null ? '' : String(v).trim(); };
    var mp = {}; MPASI.forEach(function (m) { mp[m[0]] = !!fd.get('m_' + m[0]); });
    return {
      tgl: g('tgl'), bb: num(g('bb')), tb: num(g('tb')), caraUkur: g('caraUkur'), lk: num(g('lk')), lila: num(g('lila')), mpasi: mp,
      asiEks: g('asiEks'), asiLanjut: g('asiLanjut'), umurMpasi: num(g('umurMpasi')), belumMpasi: !!fd.get('belumMpasi'), mpasiKet: g('mpasiKet'),
      bpjs: g('bpjs'), airBersih: g('airBersih'), jamban: g('jamban'), imunisasi: g('imunisasi'), rokok: g('rokok'), cacingan: g('cacingan'), kek: g('kek'),
      penyakit: g('penyakit'), kebiasaan: g('kebiasaan')
    };
  }
  function updateZ() {
    var d = readK();
    var um = d.tgl ? GIZI.umurHari(b.tglLahir, d.tgl) : null;
    if (!caraTouched && um != null) { var want = um < 731 ? 'terlentang' : 'berdiri'; $$('input[name=caraUkur]').forEach(function (r) { r.checked = r.value === want; }); d.caraUkur = want; }
    var r = GIZI.hitung({ jk: b.jk, tglLahir: b.tglLahir, tglUkur: d.tgl, bb: d.bb, tb: d.tb, caraUkur: d.caraUkur });
    var pv = lastKunjungan(b.id, d.tgl, k.id);
    var notes = r.pesan.slice(), info = [];
    if (pv && pv.tgl < d.tgl) {
      if (d.bb != null && pv.bb != null) { var db = Math.round((d.bb - pv.bb) * 100) / 100; if (db <= 0) notes.push('BB tidak naik dibanding ' + dmy(pv.tgl) + ' (' + fmtNum(pv.bb) + ' → ' + fmtNum(d.bb) + ' kg).'); else info.push('BB naik ' + fmtNum(db) + ' kg dari ' + dmy(pv.tgl) + '.'); }
      if (d.tb != null && pv.tb != null && d.tb < pv.tb - 0.5) notes.push('Panjang/tinggi lebih kecil dari kunjungan lalu (' + fmtNum(pv.tb) + ' cm). Cek ulang pengukuran.');
    }
    if (d.bb != null && (d.bb < 1 || d.bb > 30)) notes.push('BB di luar rentang wajar balita (1–30 kg). Pastikan pakai koma/titik desimal.');
    if (d.tb != null && (d.tb < 40 || d.tb > 125)) notes.push('Panjang/tinggi di luar rentang wajar (40–125 cm).');
    var koreksi = r.tbKoreksi != null && d.tb != null && Math.abs(r.tbKoreksi - d.tb) > 0.01 ? ' · dipakai ' + fmtNum(r.tbKoreksi) + ' cm (koreksi ' + (r.tbKoreksi > d.tb ? '+' : '−') + '0,7)' : '';
    var zb = '<div class="zpanel"><div class="zh"><b>Status gizi</b><span class="small muted">umur ' + esc(umurTeks(r.umurHari)) + koreksi + '</span></div><table class="ztable"><tbody>' +
      zrow('BB/U', r.zBBU, r.BBU) + zrow((um != null && um < 731 ? 'PB/U' : 'TB/U'), r.zTBU, r.TBU) + zrow((um != null && um < 731 ? 'BB/PB' : 'BB/TB'), r.zBBTB, r.BBTB) + '</tbody></table></div>';
    if (notes.length) zb += '<div class="warnbox" style="margin-top:10px"><ul>' + notes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    if (info.length) zb += '<div class="warnbox info" style="margin-top:10px">' + esc(info.join(' ')) + '</div>';
    $('#zbox').innerHTML = zb;
  }
  function zrow(l, z, kat) { return '<tr><td>' + l + '</td><td>' + (z == null ? '—' : (z > 0 ? '+' : '') + z.toFixed(2).replace('.', ',')) + '</td><td>' + (kat ? chip('', kat) : '<span class="muted small">isi BB & PB/TB</span>') + '</td></tr>'; }
  fm.addEventListener('input', function (e) { if (['tgl', 'bb', 'tb'].indexOf(e.target.name) >= 0) updateZ(); });
  fm.addEventListener('change', function (e) { if (e.target.name === 'caraUkur') { caraTouched = true; } if (['tgl', 'caraUkur'].indexOf(e.target.name) >= 0) updateZ(); });
  $('#belumMpasi').addEventListener('change', function (e) { if (e.target.checked) $('#umurMpasi').value = ''; });
  $$('.qchips button').forEach(function (bt) {
    bt.addEventListener('click', function () {
      var ta = $('#' + bt.parentNode.getAttribute('data-target')), v = bt.textContent;
      if (v === 'Tidak ada' || !ta.value.trim() || ta.value.trim() === 'Tidak ada') ta.value = v; else ta.value = ta.value.replace(/[\s,]+$/, '') + ', ' + v.toLowerCase();
    });
  });
  updateZ();
  var hb = $('#btnHapusK');
  if (hb) hb.onclick = function () {
    modal({ title: 'Hapus kunjungan ' + dmy(k.tgl) + '?', text: 'Data kunjungan ini akan dihapus dari HP. Data induk balita tetap ada.', ok: 'Hapus', danger: true }).then(function (y) {
      if (!y) return;
      hapusRec('kunjungan', k).then(function () { toast('Kunjungan dihapus'); location.hash = '#/balita/' + b.id; });
    });
  };
  fm.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = readK(), errs = [];
    $$('.input.err', fm).forEach(function (x) { x.classList.remove('err'); });
    function bad(f, m) { errs.push(m); var el = $('#' + f); if (el) el.classList.add('err'); }
    if (!d.tgl) bad('tgl', 'Tanggal kunjungan wajib diisi.');
    else if (d.tgl > today()) bad('tgl', 'Tanggal kunjungan tidak boleh sesudah hari ini.');
    else if (d.tgl < b.tglLahir) bad('tgl', 'Tanggal kunjungan sebelum tanggal lahir.');
    if (d.bb == null) bad('bb', 'Berat badan wajib diisi.'); else if (d.bb < 1 || d.bb > 30) bad('bb', 'BB harus 1–30 kg.');
    if (d.tb == null) bad('tb', 'Panjang/tinggi badan wajib diisi.'); else if (d.tb < 40 || d.tb > 125) bad('tb', 'PB/TB harus 40–125 cm.');
    if (!d.caraUkur) errs.push('Pilih cara ukur (terlentang/berdiri).');
    if (d.lk != null && (d.lk < 25 || d.lk > 60)) bad('lk', 'Lingkar kepala harus 25–60 cm.');
    if (d.lila != null && (d.lila < 7 || d.lila > 25)) bad('lila', 'LiLA harus 7–25 cm.');
    if (d.umurMpasi != null && (d.umurMpasi < 0 || d.umurMpasi > 24)) bad('umurMpasi', 'Umur mulai MP-ASI 0–24 bulan.');
    if (errs.length) { $('#formErr').innerHTML = '<div class="warnbox bad"><b>Periksa lagi:</b><ul>' + errs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; $('#formErr').scrollIntoView({ block: 'center' }); return; }
    var o = Object.assign({}, k, d, { id: k.id || uid(), balitaId: b.id, createdAt: k.createdAt || Date.now(), updatedAt: Date.now() });
    var same = S.kunjungan.filter(function (x) { return x.balitaId === b.id && x.id !== o.id && x.tgl.slice(0, 7) === o.tgl.slice(0, 7); })[0];
    var go = same ? modal({ title: 'Sudah ada kunjungan bulan ini', text: b.nama + ' sudah punya kunjungan tanggal ' + dmy(same.tgl) + '. Rekap memakai kunjungan terakhir di bulan yang sama. Tetap simpan?', ok: 'Tetap simpan' }) : Promise.resolve(true);
    go.then(function (y) {
      if (!y) return;
      putRec('kunjungan', o).then(function () {
        toast('Kunjungan tersimpan'); location.hash = '#/balita/' + b.id;
      });
    });
  });
}

/* ================= Rekap ================= */
var libsLoaded = null;
function loadLibs() {
  if (libsLoaded) return libsLoaded;
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }); }
  libsLoaded = load('exceljs.min.js').then(function () { return load('jszip.min.js'); }).then(function () { return load('rekap.js'); });
  libsLoaded.catch(function () { libsLoaded = null; });
  return libsLoaded;
}
function vRekap() {
  setNav('rekap'); setTitle('Rekap Bulanan', 'Excel per posyandu');
  var ym = S.rekapYm || thisMonth();
  view.innerHTML = '<div class="stack"><div class="panel">' + field('Bulan kunjungan', '<input class="input" type="month" id="ym" value="' + ym + '" max="' + thisMonth() + '">', { forId: 'ym' }) +
    '<p class="help" style="margin:8px 0 0">Satu file Excel per posyandu, format Lampiran Kunjungan Lapangan Balita. Jika balita dikunjungi lebih dari sekali dalam sebulan, yang dipakai kunjungan terakhir.</p></div><div id="rekapList"></div></div>';
  function draw() {
    ym = S.rekapYm = $('#ym').value || thisMonth();
    var per = latestPerBalita(ym), byPos = {};
    Object.keys(per).forEach(function (bid) { var b = balitaById(bid); if (!b) return; (byPos[b.posyandu] = byPos[b.posyandu] || []).push({ b: b, k: per[bid] }); });
    var total = Object.keys(per).length;
    var h = '<div class="row"><b style="flex:1">' + esc(bulanLabel(ym)) + ' · ' + total + ' balita</b><button class="btn sm primary" id="btnZip" type="button"' + (total ? '' : ' disabled') + '>Unduh semua (ZIP)</button></div>';
    WILAYAH.forEach(function (w) {
      h += '<h2 class="desa">Desa ' + esc(title(w[0])) + '</h2><div class="list">';
      w[1].forEach(function (pos) {
        var n = (byPos[pos] || []).length;
        h += '<div class="pos"><span class="badge' + (n ? '' : ' zero') + '">' + n + '</span><span class="n">' + esc(title(pos)) + '</span>' +
          (n ? '<button class="btn sm" data-dl="' + esc(pos) + '" type="button">Unduh</button>' + (canShareFiles() ? '<button class="btn sm" data-sh="' + esc(pos) + '" type="button">Bagikan</button>' : '') : '<span class="small muted">tidak ada</span>') + '</div>';
      });
      h += '</div>';
    });
    $('#rekapList').innerHTML = h;
    function run(pos, share) {
      if (!S.settings.petugas) toast('Nama pelaksana belum diisi di Pengaturan; tanda tangan akan kosong.', 3500);
      loadLibs().then(function () {
        return REKAP.buildPosyandu({ posyandu: pos, desa: desaOf(pos), ym: ym, rows: sortRows(byPos[pos]), settings: S.settings, hasil: hasil });
      }).then(function (f) { return share ? shareFile(f) : downloadBlob(f.blob, f.name); }).catch(function (err) { toast('Gagal membuat Excel: ' + err.message, 4000); });
    }
    $$('[data-dl]', view).forEach(function (bt) { bt.onclick = function () { run(bt.getAttribute('data-dl'), false); }; });
    $$('[data-sh]', view).forEach(function (bt) { bt.onclick = function () { run(bt.getAttribute('data-sh'), true); }; });
    var bz = $('#btnZip');
    if (bz) bz.onclick = function () {
      bz.disabled = true; bz.textContent = 'Menyiapkan…';
      loadLibs().then(function () {
        var zip = new JSZip();
        var jobs = Object.keys(byPos).map(function (pos) { return REKAP.buildPosyandu({ posyandu: pos, desa: desaOf(pos), ym: ym, rows: sortRows(byPos[pos]), settings: S.settings, hasil: hasil }).then(function (f) { zip.file(f.name, f.blob); }); });
        return Promise.all(jobs).then(function () { return zip.generateAsync({ type: 'blob' }); });
      }).then(function (blob) { downloadBlob(blob, 'REKAP KUNJUNGAN LAPANGAN BALITA ' + bulanLabel(ym).toUpperCase() + '.zip'); })
        .catch(function (err) { toast('Gagal membuat ZIP: ' + err.message, 4000); })
        .then(function () { bz.disabled = false; bz.textContent = 'Unduh semua (ZIP)'; });
    };
  }
  $('#ym').addEventListener('change', draw);
  draw();
}
function sortRows(rows) { return (rows || []).slice().sort(function (a, b) { return a.k.tgl < b.k.tgl ? -1 : a.k.tgl > b.k.tgl ? 1 : a.b.nama.localeCompare(b.b.nama, 'id'); }); }
function canShareFiles() { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch (e) { return false; } }
function shareFile(f) {
  var file = new File([f.blob], f.name, { type: f.blob.type });
  return navigator.share({ files: [file], title: f.name }).catch(function (e) { if (e && e.name !== 'AbortError') downloadBlob(f.blob, f.name); });
}
function downloadBlob(blob, name) {
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast('Tersimpan: ' + name, 3500);
}

/* ================= Pengaturan & cadangan ================= */
function vPengaturan() {
  setNav('pengaturan'); setTitle('Pengaturan', 'Versi ' + APP_VERSION);
  var st = S.settings;
  var hb = st.lastBackup ? new Date(st.lastBackup) : null;
  view.innerHTML = '<div class="stack"><form id="fs" class="sect"><p class="sect-h"><b>Pelaksana</b><span class="hint">untuk tanda tangan rekap</span></p>' +
    field('Nama & gelar', inp('petugas', st.petugas, { ph: 'mis. Nur Fahmi, S.Tr.Gz.' }), { forId: 'petugas' }) +
    field('NIP', inp('nip', st.nip, { mode: 'numeric', ph: '19810510 200604 2 019' }), { forId: 'nip', help: 'Kosongkan jika tidak ada; baris NIP tidak dicetak.' }) +
    field('Nama puskesmas', inp('puskesmas', st.puskesmas), { forId: 'puskesmas' }) +
    '<button class="btn primary" type="submit">Simpan pengaturan</button></form>' +

    (window.SYNC ? SYNC.settingsHtml() : '') +
    '<div class="sect"><p class="sect-h"><b>Cadangan data</b></p>' +
    '<p class="small" style="margin:0">Data di perangkat ini: ' + S.balita.length + ' balita, ' + S.kunjungan.length + ' kunjungan. ' +
    (hb ? 'Cadangan terakhir ' + esc(tglPanjang(hb.toISOString().slice(0, 10))) + '.' : '<b>Belum pernah dicadangkan.</b>') + '</p>' +
    '<p class="help" style="margin:0">Simpan file cadangan secara rutin (mis. seminggu sekali) ke Google Drive atau kirim ke WhatsApp sendiri. File yang sama dipakai untuk memindahkan data ke HP baru.</p>' +
    '<div class="btnrow"><button class="btn primary" id="btnBackup" type="button">Simpan cadangan</button><label class="btn" for="fileRestore">Pulihkan dari file</label><input type="file" id="fileRestore" accept=".json,application/json" hidden></div>' +
    '<p class="small muted" id="persistInfo" style="margin:0"></p></div>' +

    '<div class="sect"><p class="sect-h"><b>Tentang</b></p><p class="small" style="margin:0">Status gizi dihitung dengan WHO Child Growth Standards 2006 (tabel LMS per hari, sama dengan WHO Anthro) dan dikategorikan menurut Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak. PB/TB dikoreksi ±0,7 cm bila cara ukur tidak sesuai umur.</p>' +
    '<button class="btn danger" id="btnReset" type="button">Hapus semua data di perangkat ini</button></div>' + creditHtml() + '</div>';
  if (window.SYNC) SYNC.bindSettings();
  $('#fs').addEventListener('submit', function (e) {
    e.preventDefault();
    st.petugas = $('#petugas').value.trim(); st.nip = $('#nip').value.trim(); st.puskesmas = ($('#puskesmas').value.trim() || 'MONCONGLOE').toUpperCase();
    saveSettings().then(function () { toast('Pengaturan tersimpan'); });
  });
  $('#btnBackup').onclick = function () {
    var data = { app: 'kunjungan-balita-moncongloe', versi: APP_VERSION, dibuat: new Date().toISOString(), settings: st, balita: allRecs('balita'), kunjungan: allRecs('kunjungan') };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var name = 'cadangan-kunjungan-balita-' + today() + '.json';
    st.lastBackup = Date.now(); saveSettings();
    if (canShareFiles()) {
      modal({ title: 'Simpan cadangan', text: 'Pilih "Bagikan" untuk langsung mengirim ke Google Drive/WhatsApp, atau "Unduh" untuk menyimpan di folder Download.', ok: 'Bagikan', cancel: 'Unduh' }).then(function (y) {
        if (y) shareFile({ blob: blob, name: name }); else downloadBlob(blob, name);
        vPengaturan();
      });
    } else { downloadBlob(blob, name); vPengaturan(); }
  };
  $('#fileRestore').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    file.text().then(function (t) {
      var d; try { d = JSON.parse(t); } catch (x) { d = null; }
      if (!d || d.app !== 'kunjungan-balita-moncongloe' || !Array.isArray(d.balita)) { toast('File ini bukan cadangan aplikasi Kunjungan Balita.', 3500); return; }
      modal({
        title: 'Pulihkan cadangan', ok: 'Pulihkan',
        html: '<p class="small" style="margin:0 0 10px">File berisi ' + d.balita.length + ' balita dan ' + (d.kunjungan || []).length + ' kunjungan (dibuat ' + esc((d.dibuat || '').slice(0, 10)) + ').</p>' +
          '<div class="seg"><label><input type="radio" name="mode" value="gabung" checked>Gabungkan dengan data di HP</label><label><input type="radio" name="mode" value="ganti">Ganti semua data di HP</label></div>' +
          '<p class="help" style="margin:8px 0 0">Gabungkan: data yang sama diambil versi terbaru. Ganti: data di HP dihapus dulu.</p>',
        collect: function (root) { var r = $('input[name=mode]:checked', root); return { mode: r ? r.value : 'gabung' }; }
      }).then(function (res) {
        if (!res) return;
        var ganti = res.mode === 'ganti';
        var mergeArr = function (cur, inc) {
          var m = {}; (ganti ? [] : cur).forEach(function (o) { m[o.id] = o; });
          (inc || []).forEach(function (o) { if (!m[o.id] || (o.updatedAt || 0) > (m[o.id].updatedAt || 0)) { o._dirty = 1; m[o.id] = o; } });
          return Object.keys(m).map(function (k) { return m[k]; });
        };
        var nb = mergeArr(allRecs('balita'), d.balita), nk = mergeArr(allRecs('kunjungan'), d.kunjungan);
        var p = ganti ? Promise.all([DB.clear('balita'), DB.clear('kunjungan')]) : Promise.resolve();
        p.then(function () { return Promise.all([DB.putMany('balita', nb), DB.putMany('kunjungan', nk)]); }).then(function () {
          if (d.settings && (ganti || !st.petugas)) { ['petugas', 'nip', 'puskesmas'].forEach(function (x) { if (d.settings[x]) st[x] = d.settings[x]; }); saveSettings(); }
          loadAll().then(function () { toast('Data dipulihkan: ' + S.balita.length + ' balita, ' + S.kunjungan.length + ' kunjungan'); vPengaturan(); if (window.SYNC) SYNC.soon(); });
        });
      });
    });
    e.target.value = '';
  });
  $('#btnReset').onclick = function () {
    modal({ title: 'Hapus semua data?', html: '<p class="small" style="margin:0 0 10px">Semua balita dan kunjungan di perangkat ini akan dihapus. Simpan cadangan dulu jika masih diperlukan. Jika sinkron aktif, data di Google Sheet tidak ikut terhapus dan akan terunduh lagi.</p>' + field('Ketik HAPUS untuk melanjutkan', '<input class="input" id="konf" autocomplete="off">', { forId: 'konf' }), ok: 'Hapus semua', danger: true, collect: function (root) { return { t: $('#konf', root).value.trim() }; } }).then(function (r) {
      if (!r) return; if (r.t !== 'HAPUS') { toast('Dibatalkan: ketikan tidak sesuai.'); return; }
      Promise.all([DB.clear('balita'), DB.clear('kunjungan')]).then(function () { S.balita = []; S.kunjungan = []; S.tomb = []; if (window.SYNC) SYNC.resetPull(); toast('Semua data di perangkat ini dihapus'); vPengaturan(); });
    });
  };
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) { var el = $('#persistInfo'); if (el) el.textContent = p ? 'Penyimpanan permanen aktif: browser tidak akan menghapus data otomatis.' : 'Penyimpanan belum permanen. Pasang aplikasi ke layar utama agar data lebih aman.'; });
}

/* ================= Data contoh (uji coba) ================= */
function muatContoh() {
  var t = new Date(), ym = function (back, day) { var d = new Date(t.getFullYear(), t.getMonth() - back, day); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var mk = function (o) { return Object.assign({ _dirty: 1, id: uid(), createdAt: Date.now(), updatedAt: Date.now(), anakKe: '2', uk: 39, kategoriLahir: 'Cukup Bulan', bbl: 3000, pbl: 49, lkl: 33 }, o); };
  var bs = [
    mk({ nama: 'Contoh Andi Saputra', jk: 'L', tglLahir: ym(28, 12), desa: 'MONCONGLOE BULU', posyandu: 'TAMMU-TAMMU', alamat: 'Tammu-tammu', nik: '', ayah: { nama: 'Contoh Rudi', pendidikan: 'SMA', pekerjaan: 'Wiraswasta/Pedagang', nik: '' }, ibu: { nama: 'Contoh Sari', pendidikan: 'SMP', pekerjaan: 'IRT', nik: '' } }),
    mk({ nama: 'Contoh Nur Aisyah', jk: 'P', tglLahir: ym(15, 3), desa: 'MONCONGLOE LAPPARA', posyandu: 'BALLAPATI', alamat: 'Blok C2/7', bbl: 2600, pbl: 47, ayah: { nama: 'Contoh Hasan', pendidikan: 'SD', pekerjaan: 'Buruh Harian', nik: '' }, ibu: { nama: 'Contoh Rahma', pendidikan: 'SMA', pekerjaan: 'IRT', nik: '' } }),
    mk({ nama: 'Contoh Fajar Ramadhan', jk: 'L', tglLahir: ym(40, 20), desa: 'BONTO BUNGA', posyandu: 'MANJALLING', alamat: 'Manjalling', uk: 36, kategoriLahir: 'Prematur', bbl: 2300, pbl: 46, ayah: { nama: 'Contoh Amir', pendidikan: 'SMA', pekerjaan: 'Petani/Pekebun', nik: '' }, ibu: { nama: 'Contoh Wati', pendidikan: 'SMA', pekerjaan: 'IRT', nik: '' } })
  ];
  var base = { asiEks: 'Ya', asiLanjut: 'Ya', umurMpasi: 6, bpjs: 'Ya', airBersih: 'Ya', jamban: 'Ya', imunisasi: 'Ya, Lengkap', rokok: 'Ya', cacingan: 'Tidak', kek: 'Tidak KEK', penyakit: 'Tidak ada', mpasi: { asi: false, pokok: true, hewani: true, nabati: true, sayur: true, buah: true, telur: true } };
  var ks = [];
  var add = function (b, back, day, bb, tb, cara, extra) { ks.push(Object.assign({}, base, { _dirty: 1, id: uid(), balitaId: b.id, tgl: ym(back, day), bb: bb, tb: tb, caraUkur: cara, lk: 47, lila: 14.5, kebiasaan: 'Makan 3x sehari (nasi, ikan, sayur bening). Suka jajan biskuit dan minuman kemasan. Jarang makan buah.', createdAt: Date.now() - back * 1e6, updatedAt: Date.now() - back * 1e6 }, extra || {})); };
  add(bs[0], 2, 10, 10.6, 84.9, 'berdiri'); add(bs[0], 1, 11, 10.8, 85.6, 'berdiri'); add(bs[0], 0, 1, 11.0, 86.2, 'berdiri');
  add(bs[1], 2, 12, 7.6, 72.0, 'terlentang', { mpasi: { asi: true, pokok: true, hewani: false, nabati: true, sayur: true, buah: false, telur: true } });
  add(bs[1], 0, 1, 7.9, 73.4, 'terlentang', { mpasi: { asi: true, pokok: true, hewani: false, nabati: true, sayur: true, buah: false, telur: true }, penyakit: 'Demam, batuk' });
  add(bs[2], 1, 13, 10.9, 88.0, 'berdiri', { kek: 'KEK', rokok: 'Tidak', imunisasi: 'Ya, Tidak Lengkap' }); add(bs[2], 0, 1, 11.1, 88.6, 'berdiri', { kek: 'KEK', rokok: 'Tidak', imunisasi: 'Ya, Tidak Lengkap' });
  Promise.all([DB.putMany('balita', bs), DB.putMany('kunjungan', ks)]).then(function () { S.balita = S.balita.concat(bs); S.kunjungan = S.kunjungan.concat(ks); toast('Data contoh dimuat (3 balita)'); vBeranda(); if (window.SYNC) SYNC.soon(); });
}

/* ================= Start ================= */
function onlineState() { if (window.SYNC) SYNC.badge(); else $('#offline').hidden = navigator.onLine; }
window.addEventListener('online', onlineState); window.addEventListener('offline', onlineState);
DB.open().then(loadAll).then(function () {
  onlineState(); route();
  if (window.SYNC) SYNC.start();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { });
}).catch(function (e) {
  view.innerHTML = '<div class="warnbox bad">Penyimpanan HP tidak bisa dibuka (' + esc(e && e.message) + '). Pastikan tidak memakai mode penyamaran (incognito).</div>';
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      nw && nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          var bn = document.createElement('div'); bn.className = 'toast'; bn.innerHTML = 'Versi baru tersedia. <button class="btn sm" style="margin-left:8px">Muat ulang</button>';
          document.body.appendChild(bn); $('button', bn).onclick = function () { location.reload(); };
        }
      });
    });
  }).catch(function () { });
}
