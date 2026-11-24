(function(){
  const hdrRight = document.querySelector('header .flex.items-center.gap-2');
  let audioCtx = null, isPlaying = false, seqTimer = null;

  const toggleMusic = async (btn) => {
    if (isPlaying) {
      isPlaying = false;
      clearInterval(seqTimer);
      btn.textContent = '🎵 Santai';
      btn.className = 'bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg';
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    isPlaying = true;
    btn.textContent = '⏸️ Stop';
    btn.className = 'bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-pulse';

    // Progresi chord santai & bass hangat dengan volume jelas (gain 0.22)
    const chords = [
      { bass: 130.81, notes: [261.63, 329.63, 392.00] }, // C
      { bass: 110.00, notes: [220.00, 261.63, 329.63] }, // Am
      { bass: 87.31,  notes: [174.61, 220.00, 261.63] }, // F
      { bass: 98.00,  notes: [196.00, 246.94, 293.66] }  // G
    ];
    let step = 0;
    const playBeat = () => {
      if (!isPlaying) return;
      const now = audioCtx.currentTime;
      const bar = chords[Math.floor(step / 4) % chords.length];

      // Ketukan Bass lembut pada hitungan 0 & 2
      if (step % 2 === 0) {
        const bOsc = audioCtx.createOscillator(), bGain = audioCtx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bar.bass, now);
        bGain.gain.setValueAtTime(0.24, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        bOsc.connect(bGain); bGain.connect(audioCtx.destination);
        bOsc.start(now); bOsc.stop(now + 0.36);
      }

      // Petikan off-beat reggae akustik pada hitungan 1 & 3
      if (step % 2 === 1) {
        bar.notes.forEach(freq => {
          const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(0.14, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(g); g.connect(audioCtx.destination);
          osc.start(now); osc.stop(now + 0.29);
        });
      }
      step++;
    };
    playBeat();
    seqTimer = setInterval(playBeat, 430);
  };

  if (hdrRight) {
    const bar = document.createElement('div');
    bar.className = 'flex items-center gap-1';
    bar.innerHTML = `<button type="button" id="btnAudioSantai" class="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg">🎵 Santai</button><button type="button" id="btnOutdoorMode" class="bg-slate-800 text-amber-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg">☀️</button>`;
    hdrRight.prepend(bar);
    document.getElementById('btnAudioSantai').onclick = function() { toggleMusic(this); };
    let highContrast = false;
    document.getElementById('btnOutdoorMode').onclick = function() {
      highContrast = !highContrast;
      document.body.style.filter = highContrast ? 'contrast(1.18) brightness(1.06)' : '';
      this.className = highContrast ? 'bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-lg' : 'bg-slate-800 text-amber-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg';
    };
  }

  // Tempelkan bar pintasan langsung di dalam kotak WARUNG AKTIF
  const gantiBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Ganti Warung'));
  const warungCard = gantiBtn ? gantiBtn.parentElement.parentElement : null;
  if (warungCard && !document.getElementById('quickWarungBar')) {
    const quickBar = document.createElement('div');
    quickBar.id = 'quickWarungBar';
    quickBar.className = 'grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-slate-800';
    quickBar.innerHTML = `<button type="button" id="btnQuickMaps" class="bg-slate-800 text-sky-300 text-[10px] font-bold py-1.5 rounded-lg border border-slate-700">📍 Maps</button><button type="button" id="btnLockGps" class="bg-slate-800 text-rose-300 text-[10px] font-bold py-1.5 rounded-lg border border-slate-700">📌 Kunci GPS</button><button type="button" id="btnQuickWaWarung" class="bg-slate-800 text-emerald-300 text-[10px] font-bold py-1.5 rounded-lg border border-slate-700">💬 Chat WA</button><button type="button" id="btnCatatVisit" class="bg-amber-500/20 text-amber-300 text-[10px] font-bold py-1.5 rounded-lg border border-amber-500/40">📝 Visit No-Order</button>`;
    warungCard.appendChild(quickBar);

    const getActiveWarung = () => (state.warung || []).find(w => w.nama === state.activeWarung) || { nama: state.activeWarung || 'Warung' };

    document.getElementById('btnQuickMaps').onclick = () => {
      const w = getActiveWarung();
      if (w.lat && w.lng) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}`, '_blank');
      } else {
        const q = encodeURIComponent((w.nama || '') + ' ' + (w.alamat || state.rute || 'Cipanas Cianjur'));
        window.open('https://www.google.com/maps/search/?api=1&query=' + q, '_blank');
      }
    };

    document.getElementById('btnLockGps').onclick = () => {
      const w = getActiveWarung();
      if (!w || !w.nama) return alert('Pilih warung terlebih dahulu.');
      if (!navigator.geolocation) return alert('GPS tidak didukung di browser ini.');
      const btn = document.getElementById('btnLockGps');
      btn.textContent = '⏳ GPS...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          w.lat = pos.coords.latitude.toFixed(6);
          w.lng = pos.coords.longitude.toFixed(6);
          if (typeof save === 'function') save();
          btn.textContent = '✅ Terkunci';
          setTimeout(() => { btn.textContent = '📌 Kunci GPS'; }, 2000);
          alert(`✅ Titik lokasi GPS ${w.nama} berhasil dikunci!\nKoordinat: ${w.lat}, ${w.lng}\n\nTombol 📍 Maps sekarang akan langsung mengarah tepat ke depan warung ini.`);
        },
        (err) => {
          btn.textContent = '📌 Kunci GPS';
          alert('Gagal mengambil lokasi GPS. Pastikan Lokasi/GPS HP aktif dan izinkan akses lokasi di Chrome.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    document.getElementById('btnQuickWaWarung').onclick = () => {
      const w = getActiveWarung();
      let hp = String(w.wa || w.telp || '').replace(/[^0-9]/g, '');
      if (hp.startsWith('0')) hp = '62' + hp.slice(1);
      const sapa = encodeURIComponent(`Halo ${w.pemilik ? 'Bp/Ibu ' + w.pemilik : w.nama}, saya ${state.salesName} sales motoris Link Bold sedang melintas di rute hari ini. Apakah stok Link Bold aman atau perlu dikirim?`);
      window.open(hp ? `https://wa.me/${hp}?text=${sapa}` : `https://wa.me/?text=${sapa}`, '_blank');
    };

    document.getElementById('btnCatatVisit').onclick = () => {
      const w = getActiveWarung();
      const pil = prompt(`CATAT KUNJUNGAN TANPA ORDER\nWarung: ${w.nama}\n\nPilih alasan (ketik 1-4):\n1. Stok Masih Banyak\n2. Toko Sedang Tutup\n3. Janji Order Kunjungan Berikutnya\n4. Pemilik Tidak Di Tempat`, '1');
      if (!pil) return;
      const mapAlasan = { '1': 'Stok Masih Banyak', '2': 'Toko Tutup', '3': 'Janji Order Besok', '4': 'Pemilik Tidak Ada' };
      const ket = mapAlasan[pil.trim()] || pil.trim();
      if (!Array.isArray(state.kunjunganLog)) state.kunjunganLog = [];
      state.kunjunganLog.unshift({
        warung: w.nama,
        ket: ket,
        jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });
      if (typeof save === 'function') save();
      alert(`✅ Kunjungan ke ${w.nama} (${ket}) tercatat!`);
    };
  }

  // Biaya Operasional Harian & Rekap Kunjungan di Tab Analitik & Setor
  const tutupBtn = document.querySelector('button[onclick="tutupBukuDanArsipkan()"]');
  if (tutupBtn && tutupBtn.parentNode && !document.getElementById('opsRuteBox')) {
    const opsBox = document.createElement('div');
    opsBox.id = 'opsRuteBox';
    opsBox.className = 'bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 space-y-1.5 text-xs';
    opsBox.innerHTML = `<div class="flex justify-between items-center"><span class="font-extrabold text-slate-800">⛽ Biaya Operasional Rute</span><button type="button" id="btnTambahOps" class="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg">+ Catat Biaya</button></div><div id="listOpsHarian" class="text-[10px] text-slate-600 space-y-0.5"></div><div class="flex justify-between border-t border-amber-200 pt-1 font-black text-emerald-700"><span>Setoran Tunai Bersih:</span><span id="valSetoranBersih">Rp 0</span></div><div id="boxVisitSummary" class="text-[10px] text-slate-500 pt-1 border-t border-dashed border-amber-200"></div>`;
    tutupBtn.parentNode.insertBefore(opsBox, tutupBtn);

    document.getElementById('btnTambahOps').onclick = () => {
      const ket = prompt('Keterangan pengeluaran (contoh: Bensin, Makan Siang, Parkir):', 'Bensin Motor');
      if (!ket) return;
      const nom = parseInt((prompt('Nominal pengeluaran (Rp):', '25000') || '').replace(/[^0-9]/g, '')) || 0;
      if (nom <= 0) return;
      if (!Array.isArray(state.biayaOps)) state.biayaOps = [];
      state.biayaOps.push({ ket: ket.trim(), jumlah: nom });
      if (typeof save === 'function') save();
    };

    const renderComfortStats = () => {
      const ops = Array.isArray(state.biayaOps) ? state.biayaOps : [];
      const totOps = ops.reduce((a, b) => a + b.jumlah, 0);
      const totTunai = (state.transaksi || []).filter(t => t.metode === 'TUNAI').reduce((a, b) => a + b.total, 0);
      const listEl = document.getElementById('listOpsHarian');
      if (listEl) {
        listEl.innerHTML = ops.length
          ? ops.map((o, idx) => `<div class="flex justify-between"><span>• ${o.ket}</span><span>-${rp(o.jumlah)} <button type="button" onclick="state.biayaOps.splice(${idx},1);save();" class="text-red-500 font-bold ml-1">✕</button></span></div>`).join('')
          : '<p class="text-slate-400">Belum ada biaya bensin/makan hari ini.</p>';
      }
      const bersihEl = document.getElementById('valSetoranBersih');
      if (bersihEl) bersihEl.textContent = rp(Math.max(0, totTunai - totOps));

      const vEl = document.getElementById('boxVisitSummary');
      const vLog = Array.isArray(state.kunjunganLog) ? state.kunjunganLog : [];
      if (vEl) {
        vEl.innerHTML = vLog.length
          ? `<strong>📋 Kunjungan Non-Order (${vLog.length}):</strong> ` + vLog.slice(0, 4).map(v => `${v.warung} (${v.ket} ${v.jam})`).join(' • ')
          : '📋 Kunjungan Non-Order: 0 warung';
      }
    };

    const origRenderAll = window.renderAll;
    window.renderAll = function() {
      origRenderAll.apply(this, arguments);
      renderComfortStats();
    };
    renderComfortStats();
  }
})();

(function(){
  // 1. Tombol Toggle Pelacakan GPS Live Sales di Header
  const hdrBar = document.querySelector('header .flex.items-center.gap-1');
  let trackTimer = null;

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const recordSalesPoint = (label, silent) => {
    if (!navigator.geolocation) return !silent && alert('GPS tidak didukung di browser ini.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        if (!Array.isArray(state.salesTrack)) state.salesTrack = [];
        const prev = state.salesTrack[0];
        const dist = prev ? haversineKm(prev.lat, prev.lng, lat, lng) : 0;
        state.salesTrack.unshift({ lat, lng, jam, label: label || 'Titik Rute', km: parseFloat(dist.toFixed(2)) });
        if (state.salesTrack.length > 60) state.salesTrack.pop();
        if (typeof save === 'function') save();
        if (!silent) alert(`🛰️ Posisi Sales Tercatat!\nKoordinat: ${lat}, ${lng}\nPukul: ${jam}`);
      },
      () => { if (!silent) alert('Aktifkan GPS/Lokasi HP dan izinkan akses lokasi di Chrome.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (hdrBar && !document.getElementById('btnTrackSales')) {
    const btnT = document.createElement('button');
    btnT.type = 'button';
    btnT.id = 'btnTrackSales';
    btnT.className = 'bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg';
    btnT.textContent = '🛰️ Lacak';
    hdrBar.appendChild(btnT);

    btnT.onclick = () => {
      if (trackTimer) {
        clearInterval(trackTimer);
        trackTimer = null;
        btnT.textContent = '🛰️ Lacak';
        btnT.className = 'bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg';
        alert('Pelacakan otomatis dihentikan.');
      } else {
        recordSalesPoint('Mulai Lacak Rute', false);
        trackTimer = setInterval(() => recordSalesPoint('Checkpoint Otomatis', true), 180000);
        btnT.textContent = '🛰️ Live';
        btnT.className = 'bg-cyan-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-pulse';
      }
    };
  }

  // Rekam otomatis titik posisi setiap kali sales menyimpan transaksi baru
  const origSave = window.save;
  let lastTxCount = Array.isArray(state.transaksi) ? state.transaksi.length : 0;
  window.save = function() {
    origSave.apply(this, arguments);
    const curCount = Array.isArray(state.transaksi) ? state.transaksi.length : 0;
    if (curCount > lastTxCount) {
      lastTxCount = curCount;
      const latest = state.transaksi[0];
      recordSalesPoint(`Order: ${latest?.warung || 'Warung'}`, true);
    }
    renderTrackBox();
  };

  // 2. Panel Pelacakan Posisi & Share Live Location ke WA di Tab Analitik & Setor
  const opsBox = document.getElementById('opsRuteBox');
  if (opsBox && !document.getElementById('salesTrackBox')) {
    const tBox = document.createElement('div');
    tBox.id = 'salesTrackBox';
    tBox.className = 'bg-cyan-50/70 border border-cyan-200 rounded-xl p-2.5 space-y-1.5 text-xs';
    tBox.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-extrabold text-slate-800">🛰️ Posisi & Jejak Rute Sales</span>
        <span id="trackTotalKm" class="text-[10px] font-black bg-cyan-600 text-white px-2 py-0.5 rounded-full">0 km</span>
      </div>
      <div id="trackLatestInfo" class="text-[10px] text-slate-600">Belum ada titik GPS terekam hari ini.</div>
      <div class="grid grid-cols-2 gap-1.5 pt-1">
        <button type="button" id="btnUpdateGpsNow" class="bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-lg">📍 Catat Posisi Kini</button>
        <button type="button" id="btnShareLocWa" class="bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded-lg">📲 Kirim Posisi WA</button>
      </div>`;
    opsBox.insertAdjacentElement('afterend', tBox);

    document.getElementById('btnUpdateGpsNow').onclick = () => recordSalesPoint('Check-in Manual', false);

    document.getElementById('btnShareLocWa').onclick = () => {
      const pts = Array.isArray(state.salesTrack) ? state.salesTrack : [];
      if (!pts.length) return alert('Ketuk "📍 Catat Posisi Kini" terlebih dahulu untuk mengambil koordinat GPS Anda.');
      const cur = pts[0];
      const totKm = pts.reduce((a, b) => a + (b.km || 0), 0).toFixed(1);
      const mapUrl = `https://www.google.com/maps?q=${cur.lat},${cur.lng}`;
      const jejak = pts.slice(0, 5).map(p => `- ${p.jam}: ${p.label} (${p.lat}, ${p.lng})`).join('\n');
      const msg = `*LAPORAN POSISI LIVE SALES*\nNama: *${state.salesName}*\nRute: ${state.rute || '-'}\nPosisi Terakhir (${cur.jam}): ${cur.label}\nEstimasi Jarak Rute: *${totKm} km*\n\n📍 *Link Google Maps Posisi Sales:*\n${mapUrl}\n\n*5 Jejak Titik Terakhir:*\n${jejak}`;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    };
  }

  function renderTrackBox() {
    const pts = Array.isArray(state.salesTrack) ? state.salesTrack : [];
    const kmEl = document.getElementById('trackTotalKm');
    const infoEl = document.getElementById('trackLatestInfo');
    if (kmEl) kmEl.textContent = pts.reduce((a, b) => a + (b.km || 0), 0).toFixed(1) + ' km';
    if (infoEl) {
      if (!pts.length) {
        infoEl.innerHTML = 'Belum ada titik GPS terekam hari ini.';
      } else {
        const cur = pts[0];
        infoEl.innerHTML = `Terakhir: <strong>${cur.jam}</strong> • ${cur.label} (<a href="https://www.google.com/maps?q=${cur.lat},${cur.lng}" target="_blank" class="text-cyan-700 underline font-bold">${cur.lat}, ${cur.lng}</a>)<br><span class="text-slate-500">Total ${pts.length} titik jejak rute terekam.</span>`;
      }
    }
  }
  renderTrackBox();
})();
