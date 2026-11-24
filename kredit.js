(function(){
  const selMet = document.getElementById('checkoutMetode');
  if (selMet && !document.getElementById('boxTenorKredit')) {
    const box = document.createElement('div');
    box.id = 'boxTenorKredit';
    box.className = 'hidden bg-amber-50 border border-amber-200 rounded-xl p-2.5 space-y-1.5';
    box.innerHTML = `<div class="flex justify-between items-center"><label class="text-[10px] font-extrabold text-amber-800">⏳ Tenggat Jatuh Tempo Kredit:</label><span id="labelTglJatuhTempo" class="text-[10px] font-bold text-red-600"></span></div><select id="checkoutTenor" class="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"><option value="7">1 Minggu (7 Hari)</option><option value="14">2 Minggu (14 Hari)</option><option value="30">1 Bulan (30 Hari)</option></select>`;
    selMet.closest('.grid').insertAdjacentElement('afterend', box);

    const updTenorUI = () => {
      const isBon = selMet.value === 'BON';
      box.classList.toggle('hidden', !isBon);
      if (isBon) {
        const hari = parseInt(document.getElementById('checkoutTenor').value) || 7;
        const jt = new Date(Date.now() + hari * 86400000);
        document.getElementById('labelTglJatuhTempo').textContent = 'JT: ' + jt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    };
    selMet.addEventListener('change', updTenorUI);
    document.getElementById('checkoutTenor').addEventListener('change', updTenorUI);
  }

  const origSave = window.save;
  window.save = function() {
    if (Array.isArray(state.transaksi) && state.transaksi.length > 0) {
      const latest = state.transaksi[0];
      if (latest.metode === 'BON' && !latest.tenorLabel) {
        const selT = document.getElementById('checkoutTenor');
        const hari = selT ? (parseInt(selT.value) || 7) : 7;
        const jt = new Date(Date.now() + hari * 86400000);
        latest.tenorLabel = hari === 7 ? '1 Minggu' : (hari === 14 ? '2 Minggu' : '1 Bulan');
        latest.jatuhTempo = jt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        latest.sisaPiutang = latest.total;
        latest.cicilan = [];
      }
    }
    origSave.apply(this, arguments);
    enhanceKreditCards();
  };

  window.lunasiNotaKredit = function(i) {
    const t = state.transaksi[i];
    if (!t || t.metode !== 'BON') return;
    if (typeof t.sisaPiutang !== 'number') t.sisaPiutang = t.total;
    if (!Array.isArray(t.cicilan)) t.cicilan = [];

    const nomStr = prompt(
      `CICILAN / PELUNASAN PIUTANG\nWarung: ${t.warung} (${t.noFaktur})\nTotal Faktur: ${rp(t.total)}\nSisa Piutang: ${rp(t.sisaPiutang)}\nJatuh Tempo: ${t.jatuhTempo || '-'}\n\nMasukkan nominal bayar kunjungan ini (Rp):`,
      t.sisaPiutang
    );
    if (!nomStr) return;
    const bayarCicil = Math.min(t.sisaPiutang, Math.max(0, parseInt(nomStr.replace(/[^0-9]/g, '')) || 0));
    if (bayarCicil <= 0) return alert('Nominal pembayaran tidak valid.');

    const via = prompt('Metode bayar cicilan?\nKetik 1 untuk TUNAI, atau 2 untuk TRANSFER:', '1');
    if (!via) return;
    const metVia = via.trim() === '2' ? 'TRANSFER' : 'TUNAI';
    const tglSkrg = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    t.sisaPiutang -= bayarCicil;
    t.cicilan.push({ tgl: tglSkrg, jumlah: bayarCicil, via: metVia });

    const w = state.warung.find(x => x.nama === t.warung);
    if (w) w.piutang = Math.max(0, (w.piutang || 0) - bayarCicil);

    if (t.sisaPiutang <= 0) {
      t.sisaPiutang = 0;
      t.metode = metVia;
      t.bayar = t.total;
      t.dilunasiPada = tglSkrg;
      alert(`✅ Piutang ${t.noFaktur} (${t.warung}) LUNAS SEPENUHNYA!`);
    } else {
      alert(`✅ Cicilan ${rp(bayarCicil)} (${metVia}) dicatat!\nSisa piutang ${t.warung}: ${rp(t.sisaPiutang)}`);
    }
    origSave();
    enhanceKreditCards();
  };

  function enhanceKreditCards() {
    const listEl = document.getElementById('riwayatNotaList');
    if (!listEl) return;
    state.transaksi.forEach((t, i) => {
      if (t.metode === 'BON') {
        const card = listEl.children[i];
        if (!card) return;
        const sisa = typeof t.sisaPiutang === 'number' ? t.sisaPiutang : t.total;
        const infoP = card.querySelector('p.text-\\[10px\\].text-slate-500');
        if (infoP && !infoP.dataset.kreditEnhanced) {
          infoP.dataset.kreditEnhanced = '1';
          const riwayatCicilTxt = (t.cicilan && t.cicilan.length > 0)
            ? `<br><span class="text-emerald-700 font-semibold">↳ Terbayar ${t.cicilan.length}x: ${t.cicilan.map(c => rp(c.jumlah) + ' (' + c.tgl + ')').join(', ')}</span>`
            : '';
          infoP.innerHTML += `<br><span class="text-red-600 font-bold">⏳ Tempo: ${t.tenorLabel || 'Kredit'} (JT: ${t.jatuhTempo || '-'}) • Sisa Bon: ${rp(sisa)}</span>${riwayatCicilTxt}`;
        }
        const btnLunasi = card.querySelector(`button[onclick="lunasiNotaKredit(${i})"]`);
        if (btnLunasi) btnLunasi.textContent = '💵 Cicil / Lunasi';
      }
    });
  }

  const origRenderAll = window.renderAll;
  window.renderAll = function() {
    origRenderAll.apply(this, arguments);
    enhanceKreditCards();
  };
  enhanceKreditCards();
})();
