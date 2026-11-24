(function(){
  const st = document.createElement('style');
  st.textContent = `@keyframes shakePin{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-8px)}50%{transform:translateX(8px)}}.pin-shake{animation:shakePin .35s ease}.pin-dot-on{transform:scale(1.3);background:#ef4444;border-color:#ef4444;box-shadow:0 0 10px #ef4444}`;
  document.head.appendChild(st);

  const ov = document.createElement('div');
  ov.id = 'pinLockOverlay';
  ov.className = 'hidden fixed inset-0 bg-[#0B1120] z-[100] flex flex-col items-center justify-center p-6 text-white select-none';
  const keys = ['1','2','3','4','5','6','7','8','9','Reset','0','⌫'];
  ov.innerHTML = `<div class="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-3xl mb-3 animate-pulse">🔐</div><h2 class="text-base font-black">LINK BOLD CANVAS</h2><p id="pinSub" class="text-xs text-slate-400 mt-1 mb-5">Masukkan PIN Keamanan Motoris</p><div id="pinDots" class="flex gap-3 mb-7">${[0,1,2,3].map(()=>'<span class="pdot w-3.5 h-3.5 rounded-full border-2 border-slate-600 transition-all"></span>').join('')}</div><div class="grid grid-cols-3 gap-3 w-full max-w-[260px]">${keys.map(k=>`<button type="button" data-k="${k}" class="pkey h-14 rounded-2xl ${k==='Reset'||k==='⌫'?'bg-slate-900 text-xs text-amber-400':'bg-slate-800 text-lg'} border border-slate-700 font-black active:scale-90 active:bg-red-600 transition">${k}</button>`).join('')}</div>`;
  document.body.appendChild(ov);

  let buf = '';
  const updDots = () => ov.querySelectorAll('.pdot').forEach((d,i) => d.classList.toggle('pin-dot-on', i < buf.length));
  ov.querySelectorAll('.pkey').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'Reset') { buf = ''; updDots(); return; }
    if (k === '⌫') { buf = buf.slice(0,-1); updDots(); return; }
    if (buf.length >= 4) return;
    buf += k; updDots();
    if (buf.length === 4) setTimeout(() => {
      if (buf === String(state.appPin)) { ov.classList.add('hidden'); buf = ''; updDots(); }
      else {
        const r = document.getElementById('pinDots'), s = document.getElementById('pinSub');
        r.classList.add('pin-shake'); s.textContent = 'PIN Salah! Coba lagi'; s.className = 'text-xs text-red-400 font-bold mt-1 mb-5';
        setTimeout(() => { r.classList.remove('pin-shake'); buf = ''; updDots(); s.textContent = 'Masukkan PIN Keamanan Motoris'; s.className = 'text-xs text-slate-400 mt-1 mb-5'; }, 400);
      }
    }, 120);
  });

  const target = document.querySelector('#modalProfilSales button[onclick="simpanProfilSales()"]');
  if (target) {
    const box = document.createElement('div');
    box.className = 'bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2';
    box.innerHTML = `<div><p class="text-xs font-extrabold text-slate-900">🔐 Kunci PIN Aplikasi (4 Angka)</p><p id="pinSts" class="text-[10px] text-slate-500">Status: Nonaktif</p></div><div class="flex gap-1.5"><button type="button" id="btnSetPin" class="bg-[#0F172A] text-white text-[10px] font-bold px-2.5 py-2 rounded-xl">Atur PIN</button><button type="button" id="btnLockNow" class="hidden bg-amber-500 text-white text-[10px] font-bold px-2.5 py-2 rounded-xl">🔒 Kunci</button></div>`;
    target.parentNode.insertBefore(box, target);
    const syncUI = () => {
      document.getElementById('pinSts').textContent = state.appPin ? 'Status: Aktif (4 Digit)' : 'Status: Nonaktif';
      document.getElementById('btnLockNow').classList.toggle('hidden', !state.appPin);
    };
    syncUI();
    document.getElementById('btnLockNow').onclick = () => { buf = ''; updDots(); document.getElementById('modalProfilSales').classList.add('hidden'); ov.classList.remove('hidden'); };
    document.getElementById('btnSetPin').onclick = () => {
      if (state.appPin && prompt('Masukkan PIN lama:') !== String(state.appPin)) return alert('PIN lama salah!');
      const n = prompt('Masukkan 4 digit PIN baru (kosongkan untuk matikan):', '');
      if (n === null) return;
      if (!n.trim()) { delete state.appPin; save(); syncUI(); alert('PIN dimatikan.'); }
      else if (/^\d{4}$/.test(n.trim())) { state.appPin = n.trim(); save(); syncUI(); alert('PIN 4 digit aktif!'); }
      else alert('Harus 4 digit angka!');
    };
  }
  if (state.appPin) ov.classList.remove('hidden');
})();
