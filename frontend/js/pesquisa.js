  let todosResultados = [];
  let mapaObj = null;
  let mapaAtivo = false;
  let mapaMarkers = [];

  function toggleMapa() {
    mapaAtivo = !mapaAtivo;
    const col = document.getElementById('mapa-col');
    const btn = document.getElementById('btn-mapa');
    const layout = document.getElementById('results-layout');
    col.classList.toggle('visivel', mapaAtivo);
    layout.classList.toggle('com-mapa', mapaAtivo);
    btn.classList.toggle('ativo', mapaAtivo);
    btn.innerHTML = mapaAtivo
      ? '<i class="bi bi-list-ul"></i> Ver lista'
      : '<i class="bi bi-map-fill"></i> Ver no mapa';

    if (mapaAtivo) {
      if (!mapaObj) iniciarMapa();
      else atualizarMapa(todosResultados);
    }
  }

  function iniciarMapa() {
    mapaObj = L.map('mapa-pesquisa').setView([39.5, -8.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapaObj);
    atualizarMapa(todosResultados);
  }

  function atualizarMapa(resultados) {
    if (!mapaObj) return;
    mapaMarkers.forEach(m => mapaObj.removeLayer(m));
    mapaMarkers = [];
    const bounds = [];

    resultados.forEach((v, idx) => {
      const stops = typeof v.stops === 'string' ? JSON.parse(v.stops) : (v.stops || []);
      const validos = stops.filter(s => s.lat && s.lng && !(s.lat == 0 && s.lng == 0));
      if (validos.length < 2) return;

      const origem  = validos[0];
      const destino = validos[validos.length - 1];
      const preco   = Number(v.price_per_seat).toFixed(2).replace('.', ',') + '€';
      const cidade  = (validos[0].address || '').split(',')[0].trim();
      const cidadeD = (validos[validos.length-1].address || '').split(',')[0].trim();
      const realIdx = todosResultados.indexOf(v);

      const dotO = L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#16A34A;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`, iconSize:[12,12], className:'' });
      const dotD = L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#2563EB;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`, iconSize:[12,12], className:'' });
      const priceIcon = L.divIcon({
        html: `<div style="background:#2563EB;color:#fff;font-size:0.72rem;font-weight:700;padding:3px 7px;border-radius:99px;white-space:nowrap;font-family:Inter,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.2);cursor:pointer">${preco}</div>`,
        iconSize: [50, 24], iconAnchor: [25, 12], className: ''
      });

      const mO = L.marker([origem.lat, origem.lng], { icon: dotO }).addTo(mapaObj);
      const mD = L.marker([destino.lat, destino.lng], { icon: dotD }).addTo(mapaObj);
      const mP = L.marker([(parseFloat(origem.lat)+parseFloat(destino.lat))/2, (parseFloat(origem.lng)+parseFloat(destino.lng))/2], { icon: priceIcon })
        .addTo(mapaObj)
        .on('click', () => realIdx >= 0 && verViagem({ preventDefault:()=>{} }, realIdx));

      mP.bindPopup(`<b>${esc(cidade)} → ${esc(cidadeD)}</b><br>${v.depart_time?.slice(0,5)} · ${preco}`);

      const linha = L.polyline([[origem.lat, origem.lng],[destino.lat, destino.lng]], {
        color: '#2563EB', weight: 2.5, opacity: 0.5, dashArray: '5 5'
      }).addTo(mapaObj);

      mapaMarkers.push(mO, mD, mP, linha);
      bounds.push([origem.lat, origem.lng], [destino.lat, destino.lng]);
    });

    if (bounds.length > 0) mapaObj.fitBounds(bounds, { padding: [30, 30] });
    else mapaObj.setView([39.5, -8.0], 6);
    setTimeout(() => mapaObj.invalidateSize(), 100);
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
    document.getElementById('nome-user').textContent = user.full_name;
    document.getElementById('data').value = new Date().toISOString().slice(0,10);

    const saved = sessionStorage.getItem('pesquisa_state');
    if (saved) {
      sessionStorage.removeItem('pesquisa_state');
      try {
        const s = JSON.parse(saved);
        todosResultados = s.resultados || [];
        document.getElementById('origem').value  = s.origem  || '';
        document.getElementById('destino').value = s.destino || '';
        if (s.data)   document.getElementById('data').value = s.data;
        if (s.coords) { _coords.origem = s.coords.origem; _coords.destino = s.coords.destino; }
        document.getElementById('summary-date-title').innerHTML  = s.summaryTitle || '';
        document.getElementById('summary-date-sub').textContent  = s.summaryDate  || '';
        document.getElementById('search-bar-wrap').style.display = 'none';
        document.getElementById('search-summary').style.display  = '';
        document.getElementById('results-layout').style.display  = '';
        document.getElementById('pre-search').style.display      = 'none';
        aplicarFiltros();
        if (user.role === 'DRIVER' || user.role === 'BOTH') ajustarNavCondutor(user.role);
        return;
      } catch {}
    }

    const qp = new URLSearchParams(location.search);
    if (qp.get('origem'))  document.getElementById('origem').value  = qp.get('origem');
    if (qp.get('destino')) document.getElementById('destino').value = qp.get('destino');
    if (qp.get('data'))    document.getElementById('data').value    = qp.get('data');
    if (qp.get('origem') || qp.get('destino') || qp.get('data')) pesquisar(null);
    else carregarPreSearch();
    if (user.role === 'DRIVER' || user.role === 'BOTH') ajustarNavCondutor(user.role);
    if (user.role === 'ADMIN') {
      const nav = document.getElementById('nav-main');
      const a = document.createElement('a');
      a.href = 'admin.html'; a.className = 'nav-item';
      a.innerHTML = '<i class="bi bi-shield-lock"></i> Administração';
      nav.appendChild(a);
    }
    if (user.role === 'PASSENGER') {
      document.getElementById('nav-publicar').style.display = 'none';
    }
    carregarBadgeReservas();
  }

  async function geocode(query) {
    if (!query.trim()) return null;
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=pt`,
        { headers: { 'Accept-Language': 'pt' } }
      );
      const data = await res.json();
      if (!data.length) return null;
      return { lat: data[0].lat, lng: data[0].lon };
    } catch { return null; }
  }

  async function pesquisar(e) {
    if (e) e.preventDefault();
    const date    = document.getElementById('data').value;
    const origemQ = document.getElementById('origem').value.trim();
    const destinoQ = document.getElementById('destino').value.trim();
    const btn     = document.getElementById('btn-pesquisar');

    if (!date) { toast('Seleciona uma data.', 'warning'); return; }

    btnLoad(btn, true, 'A pesquisar...');

    let coordsOri  = _coords.origem  || null;
    let coordsDest = _coords.destino || null;
    if (origemQ && !coordsOri) {
      coordsOri = await geocode(origemQ);
      if (!coordsOri) { toast(`Não foi possível localizar "${origemQ}".`, 'warning'); btnLoad(btn, false); return; }
    }
    if (destinoQ && !coordsDest) {
      coordsDest = await geocode(destinoQ);
      if (!coordsDest) { toast(`Não foi possível localizar "${destinoQ}".`, 'warning'); btnLoad(btn, false); return; }
    }

    document.getElementById('pre-search').style.display      = 'none';
    document.getElementById('search-summary').style.display  = '';
    document.getElementById('results-layout').style.display  = '';
    document.getElementById('search-bar-wrap').style.display = 'none';

    const [y, m, d] = date.split('-');
    const diasSemana = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    const titleRoute = origemQ && destinoQ
      ? `${origemQ} → ${destinoQ}`
      : origemQ || destinoQ || 'Todas as rotas';
    document.getElementById('summary-date-title').innerHTML = titleRoute;
    document.getElementById('summary-date-sub').textContent =
      `${diasSemana[new Date(date).getDay()]}, ${parseInt(d)} ${MESES[parseInt(m)-1]} ${y}`;

    document.getElementById('resultados').innerHTML = skeletonRows(4, [60, 120, 80, 60]);

    try {
      let url = `../backend/bookings/search.php?date=${date}`;
      if (coordsOri)  url += `&originLat=${coordsOri.lat}&originLng=${coordsOri.lng}`;
      if (coordsDest) url += `&destLat=${coordsDest.lat}&destLng=${coordsDest.lng}`;

      const res  = await fetch(url);
      const data = await res.json();
      if (!data.success) {
        document.getElementById('resultados').innerHTML =
          `<div class="alert alert-danger"><i class="bi bi-x-circle-fill"></i> ${esc(data.message)}</div>`;
        document.getElementById('results-title').textContent = '';
        return;
      }
      todosResultados = data.results || [];
      aplicarFiltros();
      if (mapaAtivo) atualizarMapa(todosResultados);
    } finally {
      btnLoad(btn, false);
    }
  }

  function aplicarFiltros() {
    const ordenar     = document.getElementById('ordenar').value;
    const horasChecked = [...document.querySelectorAll('.hora-filter:checked')].map(el => el.value);
    const ratingMin   = document.querySelector('.rating-filter:checked')?.value || 0;

    let filtrados = todosResultados.filter(v => {
      if (ratingMin && (!v.avg_rating || Number(v.avg_rating) < Number(ratingMin))) return false;
      if (horasChecked.length > 0) {
        const hora = parseInt(v.depart_time?.split(':')[0] || 0);
        const ok = horasChecked.some(range => {
          const [s, e] = range.split('-').map(Number);
          return hora >= s && hora < e;
        });
        if (!ok) return false;
      }
      return true;
    });

    if (ordenar === 'price-asc')  filtrados.sort((a,b) => Number(a.price_per_seat) - Number(b.price_per_seat));
    if (ordenar === 'price-desc') filtrados.sort((a,b) => Number(b.price_per_seat) - Number(a.price_per_seat));
    if (ordenar === 'time-asc')   filtrados.sort((a,b) => (a.depart_time||'').localeCompare(b.depart_time||''));

    renderResultados(filtrados);
    if (mapaAtivo) atualizarMapa(filtrados);
  }

  function limparFiltros() {
    document.querySelectorAll('.hora-filter').forEach(el => el.checked = false);
    document.querySelectorAll('.rating-filter').forEach(el => el.checked = false);
    document.getElementById('ordenar').value = 'price-asc';
    aplicarFiltros();
  }

  function renderResultados(r) {
    const div   = document.getElementById('resultados');
    const total = todosResultados.length;
    const date  = document.getElementById('data').value;

    document.getElementById('results-title').textContent =
      r.length === 0
        ? (total === 0 ? 'Sem viagens disponíveis para esta data.' : 'Nenhum resultado corresponde aos filtros.')
        : `Encontrámos ${r.length} boleia${r.length !== 1 ? 's' : ''} para ${fmtDate(date)}`;

    if (r.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i><p>${total === 0 ? 'Tenta outra data.' : 'Altera ou remove os filtros.'}</p></div>`;
      return;
    }

    div.innerHTML = r.map((v, idx) => {
      const stops   = typeof v.stops === 'string' ? JSON.parse(v.stops) : (v.stops || []);
      const origem  = (stops[0]?.address || '—').split(',')[0].trim();
      const destino = (stops[stops.length-1]?.address || '—').split(',')[0].trim();
      const livres  = v.total_seats - v.seats_taken;
      const rating  = v.avg_rating ? Number(v.avg_rating).toFixed(1) : null;
      const preco   = Number(v.price_per_seat).toFixed(2).replace('.', ',') + '€';
      const firstName = (v.driver_name || '').split(' ')[0];
      const initStr = (v.driver_name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      const avatarHtml = v.avatar_url
        ? `<img src="../${esc(v.avatar_url)}" alt="${esc(firstName)}">`
        : initStr;
      const realIdx = todosResultados.indexOf(v);

      return `<div class="result-card" onclick="verViagem(event,${realIdx})">
        <div class="rc-timeline">
          <div class="rc-row">
            <span class="rc-time">${v.depart_time?.slice(0,5) || '—'}</span>
            <div class="rc-dot-col">
              <span class="rc-dot rc-dot-green"></span>
              <span class="rc-line"></span>
            </div>
            <div>
              <div class="rc-city">${esc(origem)}</div>
              <div class="rc-city-dest">${esc(destino)}</div>
            </div>
          </div>
          <div class="rc-row">
            <span class="rc-time rc-time-bottom">&nbsp;</span>
            <div class="rc-dot-col">
              <span class="rc-dot rc-dot-blue"></span>
            </div>
            <div class="rc-driver">
              <div class="rc-avatar">${avatarHtml}</div>
              <a href="#" onclick="verCondutor(event,'${v.driver_id}');event.stopPropagation()" class="rc-name" style="color:inherit">${esc(firstName)}</a>
              ${rating ? `<span class="rc-rating">★ ${rating}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="result-price-col">
          <span class="rp-price">${preco}</span>
          <span class="rp-seats"><i class="bi bi-check-circle-fill"></i> ${livres}</span>
        </div>
      </div>`;
    }).join('');
  }

  function verViagem(e, idx) {
    e.preventDefault();
    const v = todosResultados[idx];
    if (!v?.occurrence_id) return;
    sessionStorage.setItem('pesquisa_state', JSON.stringify({
      resultados:   todosResultados,
      origem:       document.getElementById('origem').value,
      destino:      document.getElementById('destino').value,
      data:         document.getElementById('data').value,
      summaryTitle: document.getElementById('summary-date-title').innerHTML,
      summaryDate:  document.getElementById('summary-date-sub').textContent,
      coords:       _coords
    }));
    window.location.href = `viagem.html?oc=${encodeURIComponent(v.occurrence_id)}`;
  }

  async function verCondutor(e, driverId) {
    e.preventDefault();
    const overlay = document.getElementById('modal-overlay');
    const cont    = document.getElementById('modal-conteudo');
    overlay.style.display = 'flex';
    cont.innerHTML = skeletonRows(3, [80, 160]);

    try {
      const profRes  = await fetch(`../backend/users/profile.php?id=${driverId}`);
      const profData = await profRes.json();
      const p        = profData.profile || {};
      const reviews  = profData.reviews || [];
      const rating   = p.avg_rating ? Number(p.avg_rating).toFixed(1) : '—';

      const pInitials = (p.full_name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      const pAvatar = p.avatar_url
        ? `<img src="../${esc(p.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : `<span style="font-size:1.1rem;font-weight:700;color:var(--primary)">${pInitials}</span>`;
      cont.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:52px;height:52px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:2px solid var(--border)">
            ${pAvatar}
          </div>
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:var(--dark)">${esc(p.full_name || '—')}</div>
            <div style="font-size:0.85rem;color:var(--muted)">${p.total_trips || 0} viagem(ns) concluída(s)</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          <div class="stat-card c-warning" style="flex:1;min-width:110px;padding:12px 14px">
            <div class="stat-label">Avaliação</div>
            <div class="stat-value" style="font-size:1.3rem">${rating} <span style="font-size:0.9rem;color:var(--warning)">★</span></div>
          </div>
          ${p.car_make ? `<div class="stat-card c-primary" style="flex:1;min-width:110px;padding:12px 14px">
            <div class="stat-label">Veículo</div>
            <div class="stat-value" style="font-size:0.9rem;font-weight:600">${esc(p.car_make)} ${esc(p.car_model||'')} <span style="color:var(--muted);font-size:0.8rem">(${p.car_year||''})</span></div>
          </div>` : ''}
        </div>
        <h4 style="margin:0 0 8px">Avaliações recentes</h4>
        ${reviews.length === 0
          ? '<p style="color:var(--muted);font-size:0.875rem">Sem avaliações ainda.</p>'
          : reviews.slice(0,5).map(r => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="color:var(--warning);font-size:0.85rem;margin-bottom:3px">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
              ${r.comment ? `<div style="font-size:0.875rem;font-style:italic">"${esc(r.comment)}"</div>` : ''}
              <div style="font-size:0.78rem;color:var(--muted);margin-top:3px">${esc(r.reviewer_name || 'Anónimo')}</div>
            </div>`).join('')
        }`;
    } catch {
      cont.innerHTML = '<div class="alert alert-danger"><i class="bi bi-x-circle-fill"></i> Erro ao carregar perfil.</div>';
    }
  }

  function fecharModal() { document.getElementById('modal-overlay').style.display = 'none'; }
  function fecharModalOverlay(e) { if (e.target === document.getElementById('modal-overlay')) fecharModal(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

  const _coords   = { origem: null, destino: null };
  const _timers   = {};
  let   _sugIdx   = { origem: -1, destino: -1 };

  function sugerirLocal(campo) {
    const q = document.getElementById(campo).value.trim();
    _coords[campo] = null;
    clearTimeout(_timers[campo]);
    if (q.length < 2) { fecharSugestoes(campo, 0); return; }
    _timers[campo] = setTimeout(() => fetchSugestoes(campo, q), 350);
  }

  async function fetchSugestoes(campo, q) {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=pt`,
        { headers: { 'Accept-Language': 'pt' } }
      );
      const data = await res.json();
      renderSugestoes(campo, data);
    } catch { fecharSugestoes(campo, 0); }
  }

  function renderSugestoes(campo, items) {
    const box = document.getElementById(`sug-${campo}`);
    if (!items.length) { box.style.display = 'none'; return; }
    _sugIdx[campo] = -1;
    box.innerHTML = items.map((it, i) => {
      const partes = it.display_name.split(',');
      const nome   = partes[0].trim();
      const sub    = partes.slice(1, 3).join(',').trim();
      return `<div class="sb-sug-item" data-lat="${it.lat}" data-lng="${it.lon}" data-nome="${esc(nome)}"
                   onmousedown="selecionarSugestao(event,'${campo}')">
        <i class="bi bi-geo-alt"></i>
        <div><div class="sb-sug-name">${esc(nome)}</div><div class="sb-sug-sub">${esc(sub)}</div></div>
      </div>`;
    }).join('');
    box.style.display = '';
  }

  function selecionarSugestao(e, campo) {
    e.preventDefault();
    const el  = e.currentTarget;
    const nome = el.dataset.nome;
    document.getElementById(campo).value = nome;
    _coords[campo] = { lat: el.dataset.lat, lng: el.dataset.lng };
    fecharSugestoes(campo, 0);
  }

  function fecharSugestoes(campo, delay) {
    setTimeout(() => {
      const box = document.getElementById(`sug-${campo}`);
      if (box) { box.style.display = 'none'; _sugIdx[campo] = -1; }
    }, delay);
  }

  function navSugestoes(e, campo) {
    const box   = document.getElementById(`sug-${campo}`);
    const items = box ? [...box.querySelectorAll('.sb-sug-item')] : [];
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _sugIdx[campo] = Math.min(_sugIdx[campo] + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _sugIdx[campo] = Math.max(_sugIdx[campo] - 1, 0);
    } else if (e.key === 'Enter' && _sugIdx[campo] >= 0) {
      e.preventDefault();
      items[_sugIdx[campo]].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      return;
    } else if (e.key === 'Escape') {
      fecharSugestoes(campo, 0); return;
    } else { return; }
    items.forEach((el, i) => el.classList.toggle('active', i === _sugIdx[campo]));
  }

  function toggleFiltrosMobile(btn) {
    const inner  = document.querySelector('.filter-sidebar-inner');
    const chevron = document.getElementById('filtros-chevron');
    const aberto = inner.classList.toggle('aberto');
    btn.setAttribute('aria-expanded', aberto);
    chevron.className = aberto ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
  }

  function initFiltrosLayout() {
    const mq = window.matchMedia('(min-width: 769px)');
    const inner = document.querySelector('.filter-sidebar-inner');
    const titleDesk = document.getElementById('filter-title-desk');
    if (mq.matches) {
      inner.classList.add('aberto');
      if (titleDesk) titleDesk.style.display = '';
    }
    mq.addEventListener('change', e => {
      if (e.matches) { inner.classList.add('aberto'); if (titleDesk) titleDesk.style.display = ''; }
      else           { inner.classList.remove('aberto'); if (titleDesk) titleDesk.style.display = 'none'; }
    });
  }
  initFiltrosLayout();

  function alterarPesquisa() {
    document.getElementById('search-bar-wrap').style.display = '';
    document.getElementById('search-summary').style.display  = 'none';
    document.getElementById('results-layout').style.display  = 'none';
    document.getElementById('pre-search').style.display      = 'none';
    document.getElementById('origem').focus();
  }

  function ajustarNavCondutor(role) {
    document.getElementById('nav-brand').href          = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').href      = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').innerHTML = '<i class="bi bi-speedometer2"></i> Painel';
    if (role === 'DRIVER') {
      document.getElementById('nav-reservas').style.display = 'none';
    }
  }

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function fmtDate(d) {
    if (!d) return '—';
    const [y, m, dd] = d.split('-');
    return `${parseInt(dd)} ${MESES[parseInt(m)-1]} ${y}`;
  }
  function fmt(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function carregarPreSearch() {
    const grid = document.getElementById('pre-rc-grid');
    if (!grid) return;
    grid.innerHTML = `${[1,2,3,4,5,6].map(()=>`<div class="rc" style="cursor:default"><div style="display:flex;gap:10px"><div class="skeleton" style="width:34px;height:34px;border-radius:50%"></div><div><div class="skeleton" style="width:90px;height:12px;margin-bottom:5px"></div><div class="skeleton" style="width:50px;height:10px"></div></div><div class="skeleton" style="width:40px;height:26px;border-radius:8px;margin-left:auto"></div></div><div class="skeleton" style="width:100%;height:52px;border-radius:8px"></div><div class="skeleton" style="width:70%;height:10px;border-radius:4px"></div></div>`).join('')}`;
    try {
      const data   = await fetch('../backend/routes/upcoming.php?limit=6').then(r=>r.json());
      const routes = (data.routes||[]);
      const DEMO = [
        {driver_name:'Paulo Almeida',avg_rating:'4.8',price_per_seat:'14',depart_time:'08:30',origem:'Lisboa', destino:'Porto',  total_seats:4,seats_taken:1,date:null},
        {driver_name:'Ana Silva',    avg_rating:'4.6',price_per_seat:'6', depart_time:'07:15',origem:'Porto',  destino:'Braga',  total_seats:3,seats_taken:1,date:null},
        {driver_name:'Miguel Costa', avg_rating:'4.9',price_per_seat:'8', depart_time:'07:45',origem:'Setúbal',destino:'Lisboa', total_seats:4,seats_taken:0,date:null},
        {driver_name:'Sofia Martins',avg_rating:'4.7',price_per_seat:'22',depart_time:'06:00',origem:'Faro',   destino:'Lisboa', total_seats:2,seats_taken:1,date:null},
        {driver_name:'Pedro Alves',  avg_rating:'4.5',price_per_seat:'10',depart_time:'09:00',origem:'Coimbra',destino:'Lisboa', total_seats:3,seats_taken:0,date:null},
        {driver_name:'Erica Silva',  avg_rating:'5.0',price_per_seat:'18',depart_time:'10:30',origem:'Braga',  destino:'Porto',  total_seats:2,seats_taken:1,date:null},
      ];
      const list = routes.length>0 ? routes : DEMO;
      const MES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      function fmtD(d){if(!d)return'';const[y,m,dd]=d.split('-');const h=new Date().toISOString().slice(0,10);const a=new Date(Date.now()+86400000).toISOString().slice(0,10);if(d===h)return'Hoje';if(d===a)return'Amanhã';return`${parseInt(dd)} ${MES[parseInt(m)-1]}`;}
      grid.innerHTML = list.map(v=>{
        const livres=Number(v.total_seats)-Number(v.seats_taken);
        const preco=Math.round(Number(v.price_per_seat));
        const init=(v.driver_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
        const av=v.avatar_url?`<img src="../${esc(v.avatar_url)}" alt="">`:init;
        const href=v.occurrence_id?`viagem.html?oc=${encodeURIComponent(v.occurrence_id)}`:'#';
        const onclick=v.occurrence_id?`location.href='${href}'`:`document.getElementById('data').value=new Date().toISOString().slice(0,10);pesquisar(null)`;
        return `<div class="rc" onclick="${onclick}">
          <div class="rc-top"><div class="rc-drv"><div class="rc-av2">${av}</div><div><div class="rc-dname2">${esc(v.driver_name)}</div>${v.avg_rating?`<div class="rc-rat2">★ ${Number(v.avg_rating).toFixed(1)}</div>`:''}</div></div><div class="rc-price2">${preco}€</div></div>
          <div class="rc-route2"><div class="rc-dots2"><span class="rc-dot2 rc-dot-g2"></span><span class="rc-vline2"></span><span class="rc-dot2 rc-dot-b2"></span></div><div class="rc-addrs2"><div><div class="rc-addr2">${esc((v.origem||'—').split(',')[0])}</div><div class="rc-addr-time2">${v.depart_time?.slice(0,5)||'—'}</div></div><div class="rc-addr2" style="color:var(--muted)">${esc((v.destino||'—').split(',')[0])}</div></div></div>
          <div class="rc-foot2"><span class="rc-seats2"><i class="bi bi-check-circle-fill"></i> ${livres} lugar${livres!==1?'es':''}</span>${v.date?`<span class="rc-date2">${fmtD(v.date)}</span>`:''}</div>
        </div>`;
      }).join('');
    } catch { grid.innerHTML = ''; document.getElementById('pre-search').style.display='none'; }
  }

  init();
