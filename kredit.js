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
      t.lunasDariKredit = true;
      alert(`✅ Piutang ${t.noFaktur} (${t.warung}) LUNAS SEPENUHNYA!`);
    } else {
      alert(`✅ Cicilan ${rp(bayarCicil)} (${metVia}) dicatat!\nSisa piutang ${t.warung}: ${rp(t.sisaPiutang)}`);
    }
    window.save();
  };

  function enhanceKreditCards() {
    const listEl = document.getElementById('riwayatNotaList');
    if (!listEl) return;
    state.transaksi.forEach((t, i) => {
      if (t.metode !== 'BON' && (t.lunasDariKredit || (Array.isArray(t.cicilan) && t.cicilan.length > 0))) {
        const card = listEl.children[i];
        if (card) {
          card.className = 'p-2.5 rounded-xl border border-blue-300 bg-blue-50/40 space-y-2';
          const badgeEl = card.querySelector('span.rounded-full');
          if (badgeEl) {
            badgeEl.className = 'inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full';
            badgeEl.innerHTML = '<span class="relative flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 shadow-[0_0_6px_#2563eb]"></span></span>LUNAS (KREDIT)';
          }
          const infoP = card.querySelector('p.text-\\[10px\\].text-slate-500');
          if (infoP && !infoP.dataset.kreditEnhanced && Array.isArray(t.cicilan) && t.cicilan.length > 0) {
            infoP.dataset.kreditEnhanced = '1';
            infoP.innerHTML += `<br><span class="text-blue-700 font-bold">✓ Lunas via ${t.cicilan.length}x cicilan: ${t.cicilan.map(c => rp(c.jumlah) + ' (' + c.tgl + ')').join(', ')}</span>`;
          }
        }
      }
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

(function(){
  const origBukaKw = window.bukaKwitansiFaktur;
  window.bukaKwitansiFaktur = function(i) {
    if (typeof origBukaKw === 'function') origBukaKw(i);
    const t = state.transaksi[i];
    if (!t) return;

    const hasCicilan = Array.isArray(t.cicilan) && t.cicilan.length > 0;
    const isBon = t.metode === 'BON';
    if (!isBon && !hasCicilan) return;

    const sisa = isBon ? (typeof t.sisaPiutang === 'number' ? t.sisaPiutang : t.total) : 0;
    const terbayar = t.total - sisa;
    const k = t.noFaktur.replace('INV-', 'KWT-');
    const tb = (angkaTerbilang(t.total).replace(/\s+/g, ' ').trim() || 'Nol') + ' Rupiah';
    const st = isBon
      ? (terbayar > 0 ? `CICILAN (SISA ${rp(sisa)})` : `PIUTANG (JT: ${t.jatuhTempo || '-'})`)
      : `LUNAS (${t.metode}${hasCicilan ? ' • CICILAN' : ''})`;
    const cl = isBon ? 'text-amber-600 border-amber-500' : 'text-emerald-600 border-emerald-500';

    const cicilanRowsHtml = hasCicilan
      ? `<div class="border-t border-dashed border-slate-300 pt-1.5 mt-1.5 space-y-1">
           <p class="text-[10px] font-extrabold text-slate-700">Riwayat Pembayaran Cicilan:</p>
           ${t.cicilan.map((c, idx) => `<div class="flex justify-between text-[10px] text-emerald-700"><span>• Cicilan ${idx+1} (${c.tgl} • ${c.via})</span><strong>${rp(c.jumlah)}</strong></div>`).join('')}
           <div class="flex justify-between text-[10px] font-bold text-slate-800 border-t pt-1"><span>Total Terbayar</span><span class="text-emerald-700">${rp(terbayar)}</span></div>
           <div class="flex justify-between text-[11px] font-black ${sisa > 0 ? 'text-red-600' : 'text-emerald-700'}"><span>Sisa Tagihan</span><span>${rp(sisa)}</span></div>
         </div>`
      : (isBon && t.jatuhTempo ? `<div class="flex justify-between text-[10px] font-bold text-red-600 border-t pt-1 mt-1"><span>Jatuh Tempo Kredit</span><span>${t.jatuhTempo} (${t.tenorLabel || ''})</span></div>` : '');

    document.getElementById('kwitansiPreviewBox').innerHTML = `
      <div class="flex justify-between items-start border-b pb-2 gap-1">
        <div><p class="font-black text-sm">KWITANSI FAKTUR</p><p class="text-[10px] font-mono text-slate-500">${k} • Ref: ${t.noFaktur}</p></div>
        <span class="border-2 ${cl} font-black text-[9px] px-2 py-0.5 rounded text-right">${st}</span>
      </div>
      <div class="space-y-1 text-[11px]">
        <p><span class="text-slate-500">Terima Dari:</span> <strong>${t.warung}</strong></p>
        <p><span class="text-slate-500">Tanggal:</span> <strong>${t.tanggal} (${t.waktu})</strong></p>
        <p><span class="text-slate-500">Terbilang:</span> <em class="font-bold bg-amber-50 px-1 rounded"># ${tb} #</em></p>
        <div class="bg-white p-2 rounded-lg border space-y-1">
          ${(t.items||[]).map(x=>`<div class="flex justify-between text-[10px]"><span>${x.nama} (${x.qty}x)</span><strong>${rp(x.subtotal)}</strong></div>`).join('')}
          <div class="flex justify-between text-xs font-black border-t pt-1"><span>TOTAL FAKTUR</span><span>${rp(t.total)}</span></div>
          ${cicilanRowsHtml}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-3 text-center text-[10px] text-slate-500">
        <div><p>Penerima,</p><div class="h-7"></div><p class="font-bold text-slate-800 border-t pt-0.5">${t.warung}</p></div>
        <div><p>Sales Motoris,</p><div class="h-7"></div><p class="font-bold text-slate-800 border-t pt-0.5">${state.salesName}</p></div>
      </div>`;

    document.getElementById('btnPrintKwitansi58').onclick = () => {
      const d = '--------------------------------\n';
      let o = '        KWITANSI FAKTUR\n       LINK BOLD CANVAS\n' + d + `No : ${k}\nTgl: ${t.tanggal} ${t.waktu}\nSts: ${st}\nToko: ${t.warung}\n` + d;
      (t.items||[]).forEach(x => { o += `${x.nama.slice(0,32)}\n` + padLR(`${x.qty}x${x.harga}`, x.subtotal) + '\n'; });
      o += d + padLR('TOTAL FAKTUR', rp(t.total)) + '\n';
      if (hasCicilan) {
        o += d + 'RIWAYAT CICILAN:\n';
        t.cicilan.forEach((c, idx) => { o += padLR(`#${idx+1} ${c.tgl} (${c.via})`, rp(c.jumlah)) + '\n'; });
        o += padLR('Total Terbayar', rp(terbayar)) + '\n';
        o += padLR('SISA TAGIHAN', rp(sisa)) + '\n';
      } else if (t.jatuhTempo) {
        o += padLR('Jatuh Tempo', t.jatuhTempo) + '\n';
      }
      o += d + 'Penerima,          Sales,\n\n\n' + padLR('(.......)', `(${state.salesName})`) + '\n\n\n';
      cetakKeRPP02N(o);
    };

    document.getElementById('btnWaKwitansi').onclick = () => {
      const r = (t.items||[]).map(x => `- ${x.nama} (${x.qty}x) = ${rp(x.subtotal)}`).join('\n');
      const cicilWa = hasCicilan
        ? `\n\n*Riwayat Pembayaran Cicilan:*\n` + t.cicilan.map((c, idx) => `${idx+1}. ${c.tgl} (${c.via}): ${rp(c.jumlah)}`).join('\n') + `\n*Total Terbayar: ${rp(terbayar)}*\n*Sisa Piutang: ${rp(sisa)}*`
        : (t.jatuhTempo ? `\nJatuh Tempo: *${t.jatuhTempo}*` : '');
      window.open('https://wa.me/?text=' + encodeURIComponent(`*KWITANSI FAKTUR*\nNo: ${k}\nFaktur: ${t.noFaktur}\nToko: *${t.warung}*\nStatus: *${st}*\nTotal Faktur: *${rp(t.total)}*\n_(${tb})_\n\nRincian:\n${r}${cicilWa}\n\nSales: ${state.salesName}`), '_blank');
    };
  };
})();
