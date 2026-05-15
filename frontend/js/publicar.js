  let numParagens  = 2;
  let mapaIniciado = false;
  let mapa, polyline;
  let marcadores   = {};
  let paradaAtiva  = 0;

  const _pubTimers = new WeakMap();
  let   _pubSugIdx = new WeakMap();

  function pubSugerir(input) {
    const q = input.value.trim();
    const box = input.closest('.paragem-input-wrap').querySelector('.pub-suggestions');
    clearTimeout(_pubTimers.get(input));
    if (q.length < 2) { box.style.display = 'none'; return; }
    _pubTimers.set(input, setTimeout(() => pubFetchSug(input, q), 350));
  }

  async function pubFetchSug(input, q) {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=pt`,
        { headers: { 'Accept-Language': 'pt' } }
      );
      const data = await res.json();
      pubRenderSug(input, data);
    } catch {}
  }

  function pubRenderSug(input, items) {
    const box = input.closest('.paragem-input-wrap').querySelector('.pub-suggestions');
    if (!items.length) { box.style.display = 'none'; return; }
    _pubSugIdx.set(input, -1);
    box.innerHTML = items.map((it, i) => {
      const partes = it.display_name.split(',');
      const nome   = partes[0].trim();
      const sub    = partes.slice(1, 3).join(',').trim();
      return `<div class="pub-sug-item"
        data-lat="${it.lat}" data-lng="${it.lon}" data-nome="${nome.replace(/"/g,'&quot;')}"
        onmousedown="pubSelecionarSug(event)">
        <i class="bi bi-geo-alt"></i>
        <div><div class="pub-sug-name">${nome}</div><div class="pub-sug-sub">${sub}</div></div>
      </div>`;
    }).join('');
    box.style.display = '';
  }

  function pubSelecionarSug(e) {
    e.preventDefault();
    const item  = e.currentTarget;
    const wrap  = item.closest('.paragem-input-wrap');
    const input = wrap.querySelector('input[name="address"]');
    const box   = wrap.querySelector('.pub-suggestions');
    const nome  = item.dataset.nome;
    const lat   = parseFloat(item.dataset.lat);
    const lng   = parseFloat(item.dataset.lng);

    input.value = nome;
    box.style.display = 'none';

    const paragem = input.closest('.paragem');
    if (paragem) {
      paragem.querySelector('[name="lat"]').value = lat;
      paragem.querySelector('[name="lng"]').value = lng;
      const idx = parseInt(paragem.dataset.index);
      if (!isNaN(idx)) {
        colocarMarcador(idx, lat, lng);
        atualizarPolyline();
        selecionarParagem(idx);
      }
    }
  }

  function pubFechar(input, delay) {
    setTimeout(() => {
      const box = input.closest('.paragem-input-wrap')?.querySelector('.pub-suggestions');
      if (box) { box.style.display = 'none'; _pubSugIdx.set(input, -1); }
    }, delay);
  }

  function pubNavSug(e, input) {
    const box   = input.closest('.paragem-input-wrap').querySelector('.pub-suggestions');
    const items = [...box.querySelectorAll('.pub-sug-item')];
    if (!items.length) return;
    let idx = _pubSugIdx.get(input) ?? -1;
    if (e.key === 'ArrowDown')  { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); items[idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); return; }
    else if (e.key === 'Escape') { pubFechar(input, 0); return; }
    else return;
    _pubSugIdx.set(input, idx);
    items.forEach((el, i) => el.classList.toggle('active', i === idx));
  }

  function initMapa() {
    mapa = L.map('mapa').setView([39.5, -8.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapa);

    mapa.on('click', async function(e) {
      const { lat, lng } = e.latlng;
      colocarMarcador(paradaAtiva, lat, lng);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'Accept-Language': 'pt' } }
        );
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const paragensEls = document.querySelectorAll('.paragem');
        if (paragensEls[paradaAtiva]) {
          paragensEls[paradaAtiva].querySelector('[name="address"]').value = addr;
        }
      } catch {}
      atualizarPolyline();
    });

    mapaIniciado = true;
  }

  function selecionarParagem(idx) {
    paradaAtiva = idx;
    const paragensEls = document.querySelectorAll('.paragem');
    const label = paragensEls[idx]?.querySelector('b')?.textContent || `Paragem ${idx+1}`;
    document.getElementById('sel-label').textContent = label;
    document.querySelectorAll('.btn-sel').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-sel-${idx}`);
    if (btn) btn.classList.add('active');
  }

  async function geocodificar(idx) {
    const paragensEls = document.querySelectorAll('.paragem');
    const div  = [...paragensEls].find(p => parseInt(p.dataset.index) === idx) || paragensEls[idx];
    if (!div) return;
    const addr = div.querySelector('[name="address"]').value.trim();
    if (!addr) { toast('Escreve um endereço primeiro.', 'warning'); return; }

    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&countrycodes=pt`,
        { headers: { 'Accept-Language': 'pt' } }
      );
      const data = await res.json();
      if (!data.length) { toast('Endereço não encontrado. Tenta ser mais específico.', 'warning'); return; }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      colocarMarcador(idx, lat, lng);
      atualizarPolyline();
      selecionarParagem(idx);
    } catch { toast('Erro ao pesquisar endereço.', 'danger'); }
  }

  function colocarMarcador(idx, lat, lng) {
    const paragensEls = document.querySelectorAll('.paragem');
    const div = paragensEls[idx];
    if (!div) return;

    div.querySelector('[name="lat"]').value = lat;
    div.querySelector('[name="lng"]').value = lng;

    const label = div.querySelector('b')?.textContent || `Paragem ${idx+1}`;

    if (marcadores[idx]) {
      marcadores[idx].setLatLng([lat, lng]);
    } else {
      marcadores[idx] = L.marker([lat, lng], { draggable: true })
        .addTo(mapa)
        .bindPopup(label)
        .openPopup();

      marcadores[idx].on('dragend', async function() {
        const pos = marcadores[idx].getLatLng();
        div.querySelector('[name="lat"]').value = pos.lat;
        div.querySelector('[name="lng"]').value = pos.lng;
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`,
            { headers: { 'Accept-Language': 'pt' } }
          );
          const data = await res.json();
          if (data.display_name) div.querySelector('[name="address"]').value = data.display_name;
        } catch {}
        atualizarPolyline();
      });
    }

    mapa.setView([lat, lng], Math.max(mapa.getZoom(), 12));
  }

  function atualizarPolyline() {
    const pontos = Object.keys(marcadores)
      .sort((a, b) => a - b)
      .map(i => marcadores[i].getLatLng());

    if (polyline) mapa.removeLayer(polyline);
    if (pontos.length >= 2) {
      polyline = L.polyline(pontos, { color: '#2563EB', weight: 4, opacity: 0.8 }).addTo(mapa);
      mapa.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }
  }

  function adicionarParagem() {
    const idx = document.querySelectorAll('.paragem').length;
    numParagens++;
    const div = document.createElement('div');
    div.className = 'paragem';
    div.dataset.index = idx;
    div.innerHTML = `
      <div class="paragem-header">
        <span class="paragem-label"><b>Paragem ${numParagens}</b> — Intermédia</span>
        <div style="display:flex;gap:6px">
          <button type="button" onclick="selecionarParagem(${idx})" id="btn-sel-${idx}" class="btn-sel" title="Selecionar no mapa"><i class="bi bi-cursor-fill"></i></button>
          <button type="button" onclick="removerParagem(this,${idx})" class="btn-remove" title="Remover"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div class="paragem-input-row">
        <div class="paragem-input-wrap">
          <input type="text" name="address" placeholder="Ex: Coimbra" autocomplete="off"
            oninput="pubSugerir(this)" onblur="pubFechar(this,300)" onkeydown="pubNavSug(event,this)" />
          <div class="pub-suggestions" style="display:none"></div>
        </div>
        <button type="button" onclick="geocodificar(${idx})"><i class="bi bi-geo-alt-fill"></i> Localizar</button>
      </div>
      <input type="hidden" name="lat" value="0" />
      <input type="hidden" name="lng" value="0" />`;

    const todas = document.querySelectorAll('.paragem');
    const ultima = todas[todas.length - 1];
    document.getElementById('paragens').insertBefore(div, ultima);
  }

  function removerParagem(btn, idx) {
    if (marcadores[idx]) { mapa.removeLayer(marcadores[idx]); delete marcadores[idx]; }
    btn.closest('.paragem').remove();
    atualizarPolyline();
  }

  async function publicar(e) {
    e.preventDefault();
    const msg = document.getElementById('msg-publicar');
    msg.style.display = 'none';

    const dias = [...document.querySelectorAll('input[name="dia"]:checked')].map(el => parseInt(el.value));
    if (dias.length === 0) {
      msg.className = 'alert alert-warning';
      msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Seleciona pelo menos um dia da semana.';
      msg.style.display = 'flex'; return;
    }

    const paragensEls = document.querySelectorAll('.paragem');
    const stops = [...paragensEls].map((div, i) => ({
      stop_order:  i + 1,
      address:     div.querySelector('[name="address"]').value.trim(),
      lat:         parseFloat(div.querySelector('[name="lat"]').value) || 0,
      lng:         parseFloat(div.querySelector('[name="lng"]').value) || 0,
      is_optional: i > 0 && i < paragensEls.length - 1
    }));

    if (stops.some(s => !s.address)) {
      msg.className = 'alert alert-warning';
      msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Preenche o endereço de todas as paragens.';
      msg.style.display = 'flex'; return;
    }

    const preco = parseFloat(document.getElementById('preco').value);
    if (isNaN(preco) || preco < 0) {
      msg.className = 'alert alert-warning';
      msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Indica um preço válido.';
      msg.style.display = 'flex'; return;
    }

    const body = {
      total_seats:    parseInt(document.getElementById('lugares').value),
      price_per_seat: preco,
      depart_time:    document.getElementById('hora').value.slice(0, 5),
      recurrence:     { days_of_week: dias },
      valid_from:     document.getElementById('valid_from').value,
      valid_until:    document.getElementById('valid_until').value || null,
      notes:          document.getElementById('obs').value || null,
      stops
    };

    const res  = await fetch('../backend/routes/index.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();

    if (data.success) {
      await fetch(`../backend/routes/generate.php?id=${data.routeId}`, { method: 'POST' });
      msg.className = 'alert alert-success';
      msg.innerHTML = '<i class="bi bi-check-circle-fill"></i> Rota criada com sucesso! A redirecionar para o painel...';
      msg.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { window.location.href = 'dashboard_condutor.html'; }, 2000);
    } else {
      msg.className = 'alert alert-danger';
      msg.innerHTML = `<i class="bi bi-x-circle-fill"></i> ${esc(data.message)}`;
      msg.style.display = 'flex';
    }
  }

  let passoAtual = 1;
  const TITULOS  = ['', 'Para onde vais?', 'Quando vais?', 'Últimos detalhes'];

  function irParaPasso(n) {
    if (n > passoAtual && !validarPasso(passoAtual)) return;
    if (n < 1 || n > 3) return;

    document.querySelectorAll('.passo').forEach(p => {
      p.style.display = parseInt(p.dataset.passo) === n ? '' : 'none';
    });

    document.querySelectorAll('.ws').forEach(ws => {
      const s = parseInt(ws.dataset.step);
      ws.classList.remove('active', 'done');
      if (s === n) ws.classList.add('active');
      else if (s < n) ws.classList.add('done');
    });
    for (let i = 1; i <= 2; i++) {
      document.getElementById(`wl-${i}`).classList.toggle('done', i < n);
    }

    document.querySelector('.wizard-title').textContent = TITULOS[n];

    const layout = document.querySelector('.publish-layout');
    layout.classList.toggle('sem-mapa', n > 1);
    document.querySelector('.wizard-header').style.maxWidth = n > 1 ? '520px' : '';
    document.querySelector('.wizard-header').style.margin   = n > 1 ? '0 auto 24px' : '0 0 24px';
    if (n === 1 && mapaIniciado) setTimeout(() => mapa.invalidateSize(), 50);

    document.getElementById('btn-anterior').style.display = n > 1 ? '' : 'none';

    const btnSeg = document.getElementById('btn-seguinte');
    if (n === 3) {
      btnSeg.innerHTML = '<i class="bi bi-send-fill"></i> Publicar Viagem';
      btnSeg.type = 'submit';
      btnSeg.removeAttribute('onclick');
    } else {
      btnSeg.innerHTML = 'Seguinte <i class="bi bi-arrow-right"></i>';
      btnSeg.type = 'button';
      btnSeg.setAttribute('onclick', 'irParaPasso(passoAtual+1)');
    }

    passoAtual = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validarPasso(n) {
    if (n === 1) {
      for (const p of document.querySelectorAll('.paragem')) {
        if (!p.querySelector('[name="address"]').value.trim()) {
          toast('Preenche o endereço de todas as paragens.', 'warning');
          return false;
        }
      }
    }
    if (n === 2) {
      if (!document.getElementById('hora').value) {
        toast('Seleciona a hora de partida.', 'warning'); return false;
      }
      if (!document.getElementById('valid_from').value) {
        toast('Seleciona a data de início.', 'warning'); return false;
      }
      if (![...document.querySelectorAll('input[name="dia"]:checked')].length) {
        toast('Seleciona pelo menos um dia da semana.', 'warning'); return false;
      }
    }
    return true;
  }

  async function sair(e) {
    e.preventDefault();
    await fetch('../backend/auth/logout.php', { method: 'POST' });
    window.location.href = 'login.html';
  }

  async function init() {
    const me = await fetch('../backend/auth/me.php');
    if (!me.ok) { window.location.href = 'login.html'; return; }
    const { user } = await me.json();

    if (user.role === 'PASSENGER') {
      document.querySelector('h2').textContent = 'Acesso restrito';
      document.getElementById('form-publicar').innerHTML = '<p>Esta página é apenas para condutores. <a href="dashboard.html">Voltar ao dashboard</a></p>';
      return;
    }

    const isCondutor = user.role === 'DRIVER' || user.role === 'BOTH';
    if (isCondutor) {
      document.getElementById('nav-brand').href     = 'dashboard_condutor.html';
      document.getElementById('nav-dashboard').href = 'dashboard_condutor.html';
      document.getElementById('nav-dashboard').innerHTML = '<i class="bi bi-speedometer2"></i> Painel';
      document.getElementById('back-link').href     = 'dashboard_condutor.html';
      if (user.role === 'DRIVER') {
        document.getElementById('nav-pesquisar').style.display = 'none';
        document.getElementById('nav-reservas').style.display  = 'none';
      }
    }

    document.getElementById('valid_from').value = new Date().toISOString().slice(0, 10);
    carregarBadgeReservas();

    if (user.role === 'ADMIN') {
      const navEl = document.querySelector('.nav-links');
      const aAdmin = document.createElement('a');
      aAdmin.href = 'admin.html'; aAdmin.className = 'nav-item';
      aAdmin.innerHTML = '<i class="bi bi-shield-lock"></i> Administração';
      navEl.appendChild(aAdmin);
    }

    initMapa();
    selecionarParagem(0);
  }

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init();
