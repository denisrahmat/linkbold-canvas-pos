(function(){
  const BOSS_KEY = 'linkbold_boss_hub_v1';
  const getBossData = () => {
    try {
      return JSON.parse(localStorage.getItem(BOSS_KEY)) || { bossPin: '9999', timSales: [], laporanTim: {} };
    } catch (e) {
      return { bossPin: '9999', timSales: [], laporanTim: {} };
    }
  };
  const saveBossData = (d) => localStorage.setItem(BOSS_KEY, JSON.stringify(d));

  // 1. Cek jika link dibuka dengan parameter ?activate=... (Auto-setup HP Sales Baru)
  const params = new URLSearchParams(window.location.search);
  const actPayload = params.get('activate');
  if (actPayload) {
    try {
      const cfg = JSON.parse(decodeURIComponent(escape(atob(actPayload))));
      const storageKey = Object.keys(localStorage).find(k => k.includes('linkbold_pos')) || 'linkbold_pos_motoris_v1';
      let cur = JSON.parse(localStorage.getItem(storageKey) || '{}');
      cur.salesName = cfg.nama || 'Sales Motoris';
      cur.salesId = cfg.id || 'MTR-02';
      cur.rute = cfg.rute || 'Rute Kanvas';
      cur.targetHarian = cfg.target || 2500000;
      if (Array.isArray(cfg.produk) && cfg.produk.length) cur.produk = cfg.produk;
      cur.transaksi = [];
      cur.arsipBulanan = [];
      cur.biayaOps = [];
      cur.kunjunganLog = [];
      cur.salesTrack = [];
      cur.warung = [];
      cur.activeWarung = '';
      localStorage.setItem(storageKey, JSON.stringify(cur));
      if (cfg.pin) localStorage.setItem('linkbold_pin_v1', cfg.pin);
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`✅ AKUN SALES AKTIF!\n\nNama: ${cur.salesName} (${cur.salesId})\nRute: ${cur.rute}\nPIN Login Anda: ${cfg.pin || '1234'}\n\nKatalog produk siap digunakan!`);
      location.reload();
      return;
    } catch (e) {
      console.error('Gagal aktivasi sales:', e);
    }
  }

  // 2. Tambahkan tombol Mode Boss di Header & Tombol Kirim Sync di Analitik
  const hdrRight = document.querySelector('header .flex.items-center.gap-2');
  if (hdrRight && !document.getElementById('btnModeBoss')) {
    const bBoss = document.createElement('button');
    bBoss.type = 'button';
    bBoss.id = 'btnModeBoss';
    bBoss.className = 'bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-1 rounded-lg shadow-sm';
    bBoss.textContent = '👑 Boss';
    bBoss.onclick = () => bukaGerbangBoss();
    hdrRight.insertBefore(bBoss, hdrRight.firstChild);
  }

  const tutupBtn = document.querySelector('button[onclick="tutupBukuDanArsipkan()"]');
  if (tutupBtn && !document.getElementById('btnSyncToBoss')) {
    const bSync = document.createElement('button');
    bSync.type = 'button';
    bSync.id = 'btnSyncToBoss';
    bSync.className = 'w-full bg-slate-900 text-amber-300 border border-amber-400/50 font-extrabold py-2.5 rounded-xl text-xs shadow-sm';
    bSync.textContent = '📤 Export Paket Sync untuk Boss (.json)';
    bSync.onclick = () => {
      const paket = {
        tipe: 'LINKBOLD_SALES_SYNC',
        waktuSync: new Date().toLocaleString('id-ID'),
        salesId: state.salesId || 'MTR-01',
        salesName: state.salesName || 'Sales',
        rute: state.rute || '-',
        targetHarian: state.targetHarian || 0,
        transaksi: state.transaksi || [],
        warung: state.warung || [],
        produk: state.produk || [],
        biayaOps: state.biayaOps || [],
        kunjunganLog: state.kunjunganLog || [],
        salesTrack: state.salesTrack || []
      };
      const blob = new Blob([JSON.stringify(paket, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const tgl = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `SYNC_${paket.salesId}_${paket.salesName.replace(/\s+/g, '_')}_${tgl}.json`;
      a.click();
      alert(`✅ File laporan sync (${a.download}) berhasil diunduh!\nKirimkan file ini ke WhatsApp Boss/Admin untuk dipantau di Dashboard Pusat.`);
    };
    tutupBtn.insertAdjacentElement('beforebegin', bSync);
  }

  // 3. Modal Dashboard Boss / Admin Hub
  const modal = document.createElement('div');
  modal.id = 'modalBossHub';
  modal.className = 'fixed inset-0 z-[95] bg-slate-950/90 backdrop-blur-sm hidden overflow-y-auto p-3';
  modal.innerHTML = `
    <div class="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-2">
      <div class="bg-slate-900 text-white p-3.5 flex justify-between items-center border-b-2 border-amber-400">
        <div>
          <span class="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">Admin & Owner Hub</span>
          <h2 class="text-sm font-black mt-0.5">👑 Dashboard Monitoring Boss</h2>
        </div>
        <button type="button" id="btnCloseBoss" class="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg">✕ Tutup</button>
      </div>

      <div class="p-3.5 space-y-4 text-xs">
        <!-- Ringkasan Gabungan Tim -->
        <div class="bg-slate-900 text-white rounded-xl p-3 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-[10px] text-amber-300 font-bold uppercase">Total Omzet Gabungan Tim</span>
            <button type="button" id="btnGantiPinBoss" class="text-[10px] text-slate-300 underline">🔑 Ubah PIN Boss</button>
          </div>
          <div id="bossTotalOmzet" class="text-xl font-black text-emerald-400">Rp 0</div>
          <div class="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-slate-800">
            <div><span class="text-slate-400 block">Tunai+TF/QRIS</span><strong id="bossTotalLunas" class="text-white">Rp 0</strong></div>
            <div><span class="text-slate-400 block">Piutang/Bon</span><strong id="bossTotalBon" class="text-rose-400">Rp 0</strong></div>
            <div><span class="text-slate-400 block">Biaya Rute</span><strong id="bossTotalOps" class="text-amber-300">Rp 0</strong></div>
          </div>
        </div>

        <!-- Impor File Sync dari Sales -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="font-extrabold text-slate-800">📥 Pantau Laporan Sales (.json)</span>
            <label class="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer">
              + Impor File Sync
              <input type="file" id="inputSyncBoss" accept=".json" multiple class="hidden">
            </label>
          </div>
          <p class="text-[10px] text-slate-600">Pilih 1 atau beberapa file <code>SYNC_MTR-xx.json</code> yang dikirim sales via WA untuk menggabungkan pantauan omzet, stok & GPS.</p>
          <div id="listPantauanSales" class="space-y-2 pt-1"></div>
        </div>

        <!-- Tambah & Kelola Akun Sales Baru -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-extrabold text-slate-800">👥 Kelola & Tambah Sales Baru</span>
            <button type="button" id="btnTambahSalesBaru" class="bg-slate-900 text-amber-300 text-[10px] font-bold px-2.5 py-1.5 rounded-lg">+ Sales Baru</button>
          </div>
          <div id="listAkunSales" class="space-y-1.5"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btnCloseBoss').onclick = () => modal.classList.add('hidden');

  document.getElementById('btnGantiPinBoss').onclick = () => {
    const bd = getBossData();
    const pBaru = prompt('Masukkan PIN Master Boss baru (4 digit angka):', bd.bossPin);
    if (!pBaru || !/^\d{4}$/.test(pBaru.trim())) return alert('PIN harus 4 digit angka.');
    bd.bossPin = pBaru.trim();
    saveBossData(bd);
    alert('✅ PIN Master Boss berhasil diperbarui!');
  };

  document.getElementById('btnTambahSalesBaru').onclick = () => {
    const nama = prompt('Nama Lengkap Sales Baru:', 'Andi Saputra');
    if (!nama) return;
    const id = prompt('Kode ID Motoris (contoh: MTR-02, MTR-03):', 'MTR-02');
    if (!id) return;
    const rute = prompt('Area Rute Kanvas:', 'Rute Cianjur Kota - Cipanas');
    const pin = prompt('Buat PIN Login 4 Digit untuk Sales ini:', '1234') || '1234';
    const target = parseInt((prompt('Target Omzet Harian (Rp):', '2500000') || '2500000').replace(/[^0-9]/g, '')) || 2500000;

    const bd = getBossData();
    bd.timSales = bd.timSales.filter(s => s.id !== id.trim());
    bd.timSales.push({ id: id.trim(), nama: nama.trim(), rute: (rute || '-').trim(), pin: pin.trim(), target });
    saveBossData(bd);
    renderBossHub();
  };

  document.getElementById('inputSyncBoss').onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const bd = getBossData();
    for (const f of files) {
      try {
        const obj = JSON.parse(await f.text());
        if (obj && obj.salesId) {
          bd.laporanTim[obj.salesId] = obj;
        }
      } catch (err) {}
    }
    saveBossData(bd);
    renderBossHub();
    e.target.value = '';
    alert(`✅ ${files.length} file laporan sales berhasil dimuat ke Dashboard Boss!`);
  };

  window.kirimLinkAktivasiSales = (idx) => {
    const bd = getBossData();
    const s = bd.timSales[idx];
    if (!s) return;
    const payloadObj = {
      id: s.id,
      nama: s.nama,
      rute: s.rute,
      pin: s.pin,
      target: s.target,
      produk: Array.isArray(state.produk) ? state.produk : []
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
    const baseUrl = window.location.origin + window.location.pathname;
    const linkAktivasi = `${baseUrl}?activate=${encoded}`;
    const pesan = `*AKTIVASI APLIKASI LINK BOLD CANVAS POS*\n\nHalo *${s.nama}* (${s.id}), akun sales kanvas Anda sudah dibuat oleh Admin/Boss:\n• Rute: ${s.rute}\n• Target Harian: ${rp(s.target)}\n• PIN Login Aplikasi: *${s.pin}*\n\nKetuk link di bawah ini di HP Anda untuk mengaktifkan aplikasi beserta katalog produk secara otomatis:\n${linkAktivasi}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(pesan), '_blank');
  };

  window.hapusAkunSales = (idx) => {
    const bd = getBossData();
    if (!confirm(`Hapus ${bd.timSales[idx]?.nama} dari daftar tim?`)) return;
    bd.timSales.splice(idx, 1);
    saveBossData(bd);
    renderBossHub();
  };

  function renderBossHub() {
    const bd = getBossData();
    // Sertakan data HP ini sendiri sebagai laporan aktif jika belum diimpor
    const semuaLaporan = Object.assign({}, bd.laporanTim);
    if (state && state.salesId) {
      semuaLaporan[state.salesId] = {
        waktuSync: 'Perangkat Ini (Live)',
        salesId: state.salesId,
        salesName: state.salesName,
        rute: state.rute,
        transaksi: state.transaksi || [],
        warung: state.warung || [],
        biayaOps: state.biayaOps || [],
        salesTrack: state.salesTrack || []
      };
    }

    let grandOmzet = 0, grandLunas = 0, grandBon = 0, grandOps = 0;
    const lapList = Object.values(semuaLaporan);
    const pantauEl = document.getElementById('listPantauanSales');
    if (pantauEl) {
      pantauEl.innerHTML = lapList.length ? lapList.map(lap => {
        const txs = lap.transaksi || [];
        const omz = txs.reduce((a, b) => a + (b.total || 0), 0);
        const bon = txs.filter(t => t.metode === 'BON').reduce((a, b) => a + (b.sisaPiutang ?? b.total ?? 0), 0);
        const lunas = omz - bon;
        const ops = (lap.biayaOps || []).reduce((a, b) => a + (b.jumlah || 0), 0);
        grandOmzet += omz; grandLunas += lunas; grandBon += bon; grandOps += ops;

        const lastGps = (lap.salesTrack || [])[0];
        const gpsHtml = lastGps
          ? `<a href="https://www.google.com/maps?q=${lastGps.lat},${lastGps.lng}" target="_blank" class="text-cyan-700 underline font-bold">📍 Posisi ${lastGps.jam}</a>`
          : `<span class="text-slate-400">GPS belum direkam</span>`;

        return `<div class="bg-white border border-emerald-200 rounded-lg p-2 space-y-1">
          <div class="flex justify-between items-center">
            <strong class="text-slate-900">${lap.salesName} (${lap.salesId})</strong>
            <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${lap.waktuSync || '-'}</span>
          </div>
          <div class="text-[10px] text-slate-500">${lap.rute || '-'} • ${gpsHtml}</div>
          <div class="grid grid-cols-3 gap-1 text-[10px] pt-1 border-t border-slate-100">
            <div>Omzet: <strong class="text-slate-900">${rp(omz)}</strong></div>
            <div>Lunas: <strong class="text-emerald-700">${rp(lunas)}</strong></div>
            <div>Bon: <strong class="text-rose-600">${rp(bon)}</strong></div>
          </div>
        </div>`;
      }).join('') : '<p class="text-[10px] text-slate-400">Belum ada laporan sales yang diimpor.</p>';
    }

    document.getElementById('bossTotalOmzet').textContent = rp(grandOmzet);
    document.getElementById('bossTotalLunas').textContent = rp(grandLunas);
    document.getElementById('bossTotalBon').textContent = rp(grandBon);
    document.getElementById('bossTotalOps').textContent = rp(grandOps);

    const akunEl = document.getElementById('listAkunSales');
    if (akunEl) {
      akunEl.innerHTML = bd.timSales.length ? bd.timSales.map((s, idx) => `
        <div class="bg-white border border-slate-200 rounded-lg p-2 flex justify-between items-center gap-2">
          <div>
            <div class="font-extrabold text-slate-900">${s.nama} <span class="text-amber-600">(${s.id})</span></div>
            <div class="text-[10px] text-slate-500">${s.rute} • PIN: <strong>${s.pin}</strong> • Target: ${rp(s.target)}</div>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" onclick="kirimLinkAktivasiSales(${idx})" class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded">📲 Kirim WA</button>
            <button type="button" onclick="hapusAkunSales(${idx})" class="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-1 rounded">✕</button>
          </div>
        </div>
      `).join('') : '<p class="text-[10px] text-slate-400">Belum ada sales tambahan. Ketuk "+ Sales Baru" untuk membuat akun & link aktivasi WA.</p>';
    }
  }

  function bukaGerbangBoss() {
    const bd = getBossData();
    const inputPin = prompt('MASUK MODE BOSS / ADMIN\nMasukkan PIN Master Boss (default awal: 9999):');
    if (!inputPin) return;
    if (inputPin.trim() !== bd.bossPin) {
      return alert('❌ PIN Master Boss salah!');
    }
    renderBossHub();
    modal.classList.remove('hidden');
  }
})();
