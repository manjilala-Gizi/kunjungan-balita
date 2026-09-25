/* Sinkron otomatis ke Google Sheet (Google Apps Script Web App) */
var SYNC = (function () {
  var cfg = { key: 'sync', url: '', kode: '', aktif: false, sejak: 0, terakhir: null, error: null, perangkat: '' };
  var busy = false, timer = null, interval = null, started = false;
  var BATCH = 150;

  function load() {
    return DB.get('meta', 'sync').then(function (c) {
      if (c) Object.assign(cfg, c);
      if (!cfg.perangkat) { cfg.perangkat = (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'HP' : 'Laptop') + '-' + uid().slice(-4); return save(); }
    });
  }
  function save() { return DB.put('meta', cfg); }
  function findRec(store, id) {
    var a = S[store] || [];
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    for (var j = 0; j < S.tomb.length; j++) if (S.tomb[j].store === store && S.tomb[j].rec.id === id) return S.tomb[j].rec;
    return null;
  }
  function dirtyList(store) { return allRecs(store).filter(function (o) { return o._dirty; }); }
  function pending() { return dirtyList('balita').length + dirtyList('kunjungan').length + dirtyList('laporan').length; }
  function clean(o) { var c = Object.assign({}, o); delete c._dirty; return c; }

  function post(body) {
    body.kode = cfg.kode; body.perangkat = cfg.perangkat;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
    return fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('Server menjawab ' + r.status); return r.text(); })
      .then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { throw new Error('Jawaban server tidak dikenali. Pastikan akses Web App "Siapa saja".'); }
        if (!j.ok) throw new Error(j.error || 'Gagal');
        return j;
      })
      .catch(function (e) { if (e && e.name === 'AbortError') throw new Error('Koneksi terlalu lambat (waktu habis)'); if (e instanceof TypeError) throw new Error('Tidak bisa menghubungi server. Cek sinyal atau alamat Web App.'); throw e; })
      .finally(function () { clearTimeout(to); });
  }

  function infoK(k) {
    var b = findRec('balita', k.balitaId) || {};
    var h = b.tglLahir ? hasil(b, k) : {};
    return {
      nama: b.nama, nik: b.nik, jk: b.jk, tglLahir: b.tglLahir, desa: b.desa, posyandu: b.posyandu,
      umurBulan: h.umurBulan != null ? Math.round(h.umurBulan * 10) / 10 : '',
      zBBU: h.zBBU, BBU: h.BBU, zTBU: h.zTBU, TBU: h.TBU, zBBTB: h.zBBTB, BBTB: h.BBTB,
      kmTeks: window.KM ? KM.teks(k) : '', edukasi: window.KM ? KM.eduTeks(k) : ''
    };
  }

  function push() {
    var items = dirtyList('balita').map(function (o) { return ['balita', o, o.updatedAt]; })
      .concat(dirtyList('kunjungan').map(function (o) { return ['kunjungan', o, o.updatedAt]; }))
      .concat(dirtyList('laporan').map(function (o) { return ['laporan', o, o.updatedAt]; }));
    var n = 0, chain = Promise.resolve();
    for (var i = 0; i < items.length; i += BATCH) {
      (function (part) {
        chain = chain.then(function () {
          return post({
            aksi: 'kirim',
            balita: part.filter(function (x) { return x[0] === 'balita'; }).map(function (x) { return { data: clean(x[1]) }; }),
            kunjungan: part.filter(function (x) { return x[0] === 'kunjungan'; }).map(function (x) { return { data: clean(x[1]), info: infoK(x[1]) }; }),
            laporan: part.filter(function (x) { return x[0] === 'laporan'; }).map(function (x) { return { data: clean(x[1]) }; })
          });
        }).then(function () {
          return Promise.all(part.map(function (x) {
            var cur = findRec(x[0], x[1].id);
            if (cur && cur._dirty && cur.updatedAt === x[2]) { cur._dirty = 0; return DB.put(x[0], cur); }
          })).then(function () { n += part.length; });
        });
      })(items.slice(i, i + BATCH));
    }
    return chain.then(function () { return n; });
  }

  function pull() {
    var got = 0;
    function step() {
      return post({ aksi: 'ambil', sejak: cfg.sejak }).then(function (j) {
        var ops = [];
        [['balita', j.balita || []], ['kunjungan', j.kunjungan || []], ['laporan', j.laporan || []]].forEach(function (pair) {
          pair[1].forEach(function (r) {
            var cur = findRec(pair[0], r.id), ru = r.updatedAt || 0, cu = cur ? (cur.updatedAt || 0) : -1;
            if (cur && (cu > ru || (cu === ru))) return; // versi di perangkat sama atau lebih baru
            r._dirty = 0; ops.push([pair[0], r]);
          });
        });
        return Promise.all(ops.map(function (op) { return DB.put(op[0], op[1]).then(function () { applyMem(op[0], op[1]); }); }))
          .then(function () { cfg.sejak = j.sampai || cfg.sejak; got += ops.length; return save(); })
          .then(function () { return j.lagi ? step() : got; });
      });
    }
    return step();
  }

  function sync(manual) {
    if (busy) return Promise.resolve();
    if (!cfg.aktif || !cfg.url) { if (manual) toast('Sinkron belum diaktifkan'); return Promise.resolve(); }
    if (!navigator.onLine) { badge(); if (manual) toast('Tidak ada internet. Data akan dikirim saat ada sinyal.'); return Promise.resolve(); }
    busy = true; badge();
    var sent = 0;
    return push().then(function (n) { sent = n; return pull(); }).then(function (got) {
      cfg.terakhir = Date.now(); cfg.error = null; save();
      if (manual) toast('Sinkron selesai: ' + sent + ' terkirim, ' + got + ' diterima');
      if (got) refreshView();
    }).catch(function (e) {
      cfg.error = e.message; save();
      if (manual) toast('Sinkron gagal: ' + e.message, 4500);
    }).then(function () {
      busy = false; badge();
      if (/#\/pengaturan/.test(location.hash)) paintStatus();
    });
  }
  function refreshView() {
    var h = location.hash;
    if (/^#?\/?(beranda)?$/.test(h) || /#\/beranda$/.test(h) || /#\/balita$/.test(h) || /#\/balita\/[^/]+$/.test(h) && !/baru$/.test(h) || /#\/rekap$/.test(h)) route();
  }
  function soon() {
    badge();
    if (!cfg.aktif) return;
    clearTimeout(timer); timer = setTimeout(function () { sync(false); }, 2500);
  }
  function start() {
    if (started) return; started = true;
    load().then(function () {
      badge(); sync(false);
      interval = setInterval(function () { sync(false); }, 5 * 60 * 1000);
      window.addEventListener('online', function () { badge(); sync(false); });
      window.addEventListener('offline', badge);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(false); });
    });
  }
  function resetPull() { cfg.sejak = 0; save(); }

  function badge() {
    var el = document.getElementById('offline'); if (!el) return;
    var n = cfg.aktif ? pending() : 0, txt = '', cls = 'chip';
    if (!navigator.onLine) { txt = n ? 'Offline · ' + n + ' antre' : 'Offline'; }
    else if (cfg.aktif && busy) { txt = 'Sinkron…'; }
    else if (cfg.aktif && cfg.error) { txt = 'Gagal sinkron'; cls += ' bad'; }
    else if (n) { txt = n + ' belum terkirim'; cls += ' warn'; }
    el.className = cls; el.textContent = txt; el.hidden = !txt;
  }

  /* ----- Tampilan di Pengaturan ----- */
  function waktu(ms) { if (!ms) return 'belum pernah'; var d = new Date(ms); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function statusHtml() {
    if (!cfg.aktif) return '<div class="warnbox info">Sinkron <b>belum aktif</b>. Data hanya tersimpan di perangkat ini.</div>';
    var n = pending();
    return '<div class="warnbox ' + (cfg.error ? 'bad' : 'info') + '"><b>Sinkron aktif</b> · perangkat ' + esc(cfg.perangkat) + '<br>Terakhir berhasil: ' + esc(waktu(cfg.terakhir)) + '<br>Belum terkirim: ' + n + ' data' +
      (cfg.error ? '<br>Kesalahan terakhir: ' + esc(cfg.error) : '') + '</div>';
  }
  function paintStatus() { var el = document.getElementById('syncStatus'); if (el) el.innerHTML = statusHtml(); }
  function settingsHtml() {
    return '<div class="sect" id="syncSect"><p class="sect-h"><b>Sinkronisasi Google Sheet</b><span class="hint">otomatis saat ada sinyal</span></p>' +
      '<div id="syncStatus">' + statusHtml() + '</div>' +
      field('Alamat Web App', '<input class="input" id="syncUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(cfg.url) + '">', { forId: 'syncUrl', help: 'Salin dari Apps Script: Terapkan → Kelola deployment → URL aplikasi web.' }) +
      field('Kode akses', '<input class="input" id="syncKode" type="password" autocomplete="off" value="' + esc(cfg.kode) + '">', { forId: 'syncKode', help: 'Sama persis dengan KODE_AKSES di skrip.' }) +
      '<div class="btnrow"><button class="btn primary" id="btnSyncOn" type="button">' + (cfg.aktif ? 'Simpan &amp; uji ulang' : 'Uji &amp; aktifkan') + '</button>' +
      (cfg.aktif ? '<button class="btn" id="btnSyncNow" type="button">Sinkron sekarang</button>' : '') + '</div>' +
      (cfg.aktif ? '<button class="btn sm" id="btnSyncOff" type="button">Nonaktifkan sinkron di perangkat ini</button>' : '') + '</div>';
  }
  function bindSettings() {
    var on = document.getElementById('btnSyncOn'), now = document.getElementById('btnSyncNow'), off = document.getElementById('btnSyncOff');
    if (on) on.onclick = function () {
      var url = document.getElementById('syncUrl').value.trim(), kode = document.getElementById('syncKode').value.trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) { toast('Alamat Web App harus diawali https://script.google.com/macros/s/ dan diakhiri /exec', 4500); return; }
      if (kode.length < 8) { toast('Kode akses minimal 8 karakter', 3500); return; }
      if (!navigator.onLine) { toast('Butuh internet untuk menguji koneksi', 3500); return; }
      on.disabled = true; on.textContent = 'Menguji…';
      var wasActive = cfg.aktif, oldUrl = cfg.url;
      cfg.url = url; cfg.kode = kode;
      post({ aksi: 'uji' }).then(function (j) {
        var first = !wasActive || oldUrl !== url;
        cfg.aktif = true; cfg.error = null;
        if (first) cfg.sejak = 0;
        var jobs = [];
        if (first) { // kirim semua data yang sudah ada di perangkat
          ['balita', 'kunjungan', 'laporan'].forEach(function (st) { allRecs(st).forEach(function (o) { if (!o._dirty) { o._dirty = 1; jobs.push(DB.put(st, o)); } }); });
        }
        return Promise.all(jobs).then(save).then(function () {
          toast(j.pesan || 'Terhubung', 3000);
          vPengaturan(); return sync(true);
        });
      }).catch(function (e) {
        cfg.url = oldUrl; if (!wasActive) cfg.aktif = false;
        toast('Gagal terhubung: ' + e.message, 5000);
        on.disabled = false; on.textContent = wasActive ? 'Simpan & uji ulang' : 'Uji & aktifkan';
      });
    };
    if (now) now.onclick = function () { now.disabled = true; now.textContent = 'Menyinkronkan…'; sync(true).then(function () { now.disabled = false; now.textContent = 'Sinkron sekarang'; paintStatus(); }); };
    if (off) off.onclick = function () {
      modal({ title: 'Nonaktifkan sinkron?', text: 'Data di perangkat ini dan di Google Sheet tetap ada. Perubahan berikutnya hanya tersimpan di perangkat sampai sinkron diaktifkan lagi.', ok: 'Nonaktifkan' }).then(function (y) {
        if (!y) return; cfg.aktif = false; save().then(function () { badge(); vPengaturan(); });
      });
    };
  }

  return { start: start, soon: soon, sync: sync, badge: badge, resetPull: resetPull, settingsHtml: settingsHtml, bindSettings: bindSettings, pending: pending, cfg: function () { return cfg; }, _post: post };
})();
