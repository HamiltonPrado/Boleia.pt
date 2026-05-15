  async function sair(e) {
    e.preventDefault();
    await fetch('../backend/auth/logout.php', { method: 'POST' });
    window.location.href = 'login.html';
  }

  function mostrarAba(e, id) {
    if (e) e.preventDefault();
    ['aba-rotas','aba-pendentes','aba-confirmados','aba-historico','aba-veiculo'].forEach(a => {
      document.getElementById(a).classList.toggle('active', a === id);
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.getAttribute('aria-controls') === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
    if (id === 'aba-veiculo') carregarVeiculo();
  }

  async function init() {
    const me = await fetch('../backend/auth/me.php');
    if (!me.ok) { window.location.href = 'login.html'; return; }
    const { user } = await me.json();

    if (user.role === 'ADMIN')     { window.location.replace('admin.html');     return; }
    if (user.role === 'PASSENGER') { window.location.replace('dashboard.html'); return; }

    if (user.role === 'BOTH') {
      document.getElementById('nav-pesquisar').style.display  = '';
      document.getElementById('nav-reservas').style.display   = '';
      document.getElementById('nav-passageiro').style.display = '';
    }

    document.getElementById('welcome-title').textContent = 'Olá, ' + user.full_name;

    const initStr = user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarEl = document.getElementById('dash-avatar');
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="../${user.avatar_url}" alt="Perfil">`;
    } else {
      avatarEl.textContent = initStr;
    }

    const ano = user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
    document.getElementById('driver-meta').innerHTML = `Membro desde ${ano}`;

    try {
      const docRes  = await fetch('../backend/users/documents.php');
      const docData = await docRes.json();
      if (docData.verification_status === 'APPROVED') {
        document.getElementById('driver-meta').innerHTML =
          `Membro desde ${ano} &nbsp;•&nbsp; <span class="verified"><i class="bi bi-patch-check-fill"></i> Condutor Verificado</span>`;
      } else if (docData.verification_status === 'PENDING') {
        document.getElementById('driver-meta').innerHTML =
          `Membro desde ${ano} &nbsp;•&nbsp; <span style="color:var(--warning)"><i class="bi bi-hourglass-split"></i> Verificação pendente</span>`;
      }
    } catch { }

    await Promise.all([
      carregarStats(),
      carregarRotas(),
      carregarPendentes(),
      carregarConfirmados(),
      carregarHistorico(),
    ]);
    carregarBadgeReservas();
  }

  async function carregarStats() {
    const data = await fetch('../backend/routes/stats.php').then(r => r.json());
    if (!data.success) return;
    const s = data.stats;
    document.getElementById('stat-ganhos').textContent = Number(s.total_earnings||0).toFixed(2) + '€';
  }

  async function carregarRotas() {
    const res = await fetch('../backend/routes/index.php');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      document.getElementById('rotas-lista').innerHTML =
        `<div class="empty-state"><i class="bi bi-exclamation-circle"></i><p>${err.message || 'Erro ao carregar rotas.'}</p></div>`;
      document.getElementById('cnt-rotas').textContent = '0';
      document.getElementById('stat-rotas').textContent = '0';
      return;
    }
    const { routes } = await res.json();
    const div = document.getElementById('rotas-lista');

    const total = routes?.length || 0;
    document.getElementById('stat-rotas').textContent   = total;
    document.getElementById('cnt-rotas').textContent    = total;

    if (total === 0) {
      div.innerHTML = `<div class="empty-state">
        <i class="bi bi-map"></i>
        <p>Ainda não tens rotas criadas.</p>
        <a href="publicar.html" class="btn-sm btn-info"><i class="bi bi-plus-circle"></i> Publicar primeira rota</a>
      </div>`;
      return;
    }

    const hoje   = new Date().toISOString().slice(0,10);
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0,10);

    div.innerHTML = routes.map(r => {
      const stops        = JSON.parse(r.stops || '[]');
      const origem       = (stops[0]?.address || '—').split(',')[0].trim();
      const destino      = (stops[stops.length-1]?.address || '—').split(',')[0].trim();
      const semViagens   = !r.next_occurrence;

      let dateBadge = '';
      if (!semViagens) {
        if      (r.next_occurrence === hoje)   dateBadge = 'Hoje';
        else if (r.next_occurrence === amanha) dateBadge = 'Amanhã';
        else { const [y,m,d] = r.next_occurrence.split('-'); dateBadge = `${d}/${m}`; }
      }

      return `
        <div class="rota-card" id="card-${r.id}">
          <div class="rota-card-left">
            ${semViagens
              ? `<span class="badge badge-archived" style="flex-shrink:0">Sem viagens</span>`
              : `<span class="rota-date-badge">${dateBadge}</span>`}
            <div class="rota-route">
              <span class="rota-dot"></span>
              <span class="rota-city">${esc(origem)}</span>
              <i class="bi bi-arrow-right" style="color:var(--muted);font-size:0.8em"></i>
              <span class="rota-city">${esc(destino)}</span>
            </div>
            <span class="badge badge-${(r.status||'').toLowerCase()}">${fmtRotaStatus(r.status)}</span>
          </div>
          <div class="rota-card-right">
            <span class="rota-seats"><i class="bi bi-record-circle"></i> ${r.total_seats} Lugar${r.total_seats != 1 ? 'es' : ''}</span>
            <button class="btn-gerir" onclick="toggleGerir('${r.id}')"><i class="bi bi-gear-fill"></i> Gerir</button>
          </div>
        </div>
        <div class="gerir-panel" id="gerir-${r.id}" style="display:none">
          ${r.status === 'PAUSED'
            ? `<a href="#" onclick="pausarRota(event,'${r.id}','ACTIVE')"  class="btn-sm btn-ok"><i class="bi bi-play-circle-fill"></i> Retomar rota</a>`
            : `<a href="#" onclick="pausarRota(event,'${r.id}','PAUSED')" class="btn-sm btn-muted"><i class="bi bi-pause-circle-fill"></i> Pausar rota</a>`}
          <a href="#" onclick="apagarRota(event,'${r.id}')" class="btn-sm btn-danger"><i class="bi bi-trash"></i> Apagar rota</a>
          <span class="gerir-panel-meta"><i class="bi bi-clock"></i> ${r.depart_time?.slice(0,5)} &nbsp;·&nbsp; ${diasSemana(r.recurrence)} &nbsp;·&nbsp; ${Number(r.price_per_seat).toFixed(2)} €/pessoa</span>
        </div>`;
    }).join('');

    if (total < 3) {
      div.innerHTML += `<div style="margin-top:16px;background:var(--surface);border:1px dashed var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px">
        <i class="bi bi-lightning-charge-fill" style="color:var(--warning);font-size:1.3rem;flex-shrink:0"></i>
        <div style="flex:1">
          <p style="margin:0 0 8px;font-weight:600;color:var(--dark);font-size:0.9rem">Chega a mais passageiros</p>
          <a href="publicar.html" class="btn-sm btn-info"><i class="bi bi-plus-circle"></i> Publicar nova rota</a>
        </div>
      </div>`;
    }
  }

  function toggleGerir(routeId) {
    const panel = document.getElementById(`gerir-${routeId}`);
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  }

  async function carregarPendentes() {
    const data    = await fetch('../backend/bookings/driver_bookings.php?status=PENDING').then(r => r.json());
    const pending = data.bookings || [];
    const div     = document.getElementById('pendentes-tabela');
    const cnt     = document.getElementById('cnt-pendentes');
    cnt.textContent = pending.length || '0';
    if (pending.length > 0) cnt.classList.add('tab-count-urgent');
    else cnt.classList.remove('tab-count-urgent');

    if (pending.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="bi bi-hourglass"></i><p>Sem pedidos pendentes de momento.</p></div>`;
      return;
    }
    div.innerHTML = pending.map(b => {
      const paxAv = b.avatar_url
        ? `<img src="../${esc(b.avatar_url)}" alt="">`
        : initials(b.passenger_name);
      return `
      <div class="pax-card">
        <div class="pax-av">${paxAv}</div>
        <div class="pax-info">
          <div class="pax-name">${esc(b.passenger_name)}</div>
          <div class="pax-meta">
            <span><i class="bi bi-calendar"></i> ${fmt(b.date)} · ${b.depart_time?.slice(0,5)}</span>
            <span><i class="bi bi-geo-alt"></i> ${esc(b.pickup_address)} → ${esc(b.dropoff_address)}</span>
            <span><i class="bi bi-people"></i> ${b.seats_booked} lugar(es)</span>
            <span style="font-weight:700;color:var(--dark)">${Number(b.total_amount).toFixed(2)} €</span>
          </div>
          ${b.note_to_driver ? `<div class="pax-note">"${esc(b.note_to_driver)}"</div>` : ''}
        </div>
        <div class="pax-btns">
          <a href="#" onclick="atualizarEstado(event,'${b.id}','CONFIRMED')" class="btn-sm btn-ok"><i class="bi bi-check-circle-fill"></i> Aceitar</a>
          <a href="#" onclick="recusarComMotivo(event,'${b.id}')" class="btn-sm btn-danger"><i class="bi bi-x-circle-fill"></i> Recusar</a>
        </div>
      </div>`;
    }).join('');
  }

  async function carregarConfirmados() {
    const data      = await fetch('../backend/bookings/driver_bookings.php?status=CONFIRMED').then(r => r.json());
    const confirmed = data.bookings || [];
    const div       = document.getElementById('confirmados-tabela');
    document.getElementById('cnt-confirmados').textContent = confirmed.length || '0';

    if (confirmed.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><p>Sem passageiros confirmados para próximas viagens.</p></div>`;
      return;
    }
    div.innerHTML = confirmed.map(b => {
      const paxAv = b.avatar_url
        ? `<img src="../${esc(b.avatar_url)}" alt="">`
        : initials(b.passenger_name);
      return `
      <div class="pax-card">
        <div class="pax-av" style="${b.avatar_url ? '' : 'background:var(--primary)'}">${paxAv}</div>
        <div class="pax-info">
          <div class="pax-name">${esc(b.passenger_name)}${b.phone ? `<span style="font-weight:400;color:var(--muted);font-size:0.8rem;margin-left:8px"><i class="bi bi-telephone"></i> ${esc(b.phone)}</span>` : ''}</div>
          <div class="pax-meta">
            <span><i class="bi bi-calendar"></i> ${fmt(b.date)} · ${b.depart_time?.slice(0,5)}</span>
            <span><i class="bi bi-geo-alt"></i> ${esc(b.pickup_address)} → ${esc(b.dropoff_address)}</span>
            <span><i class="bi bi-people"></i> ${b.seats_booked} lugar(es)</span>
            <span style="font-weight:700;color:var(--dark)">${Number(b.total_amount).toFixed(2)} €</span>
          </div>
        </div>
        <div class="pax-btns">
          <a href="#" onclick="completarViagem(event,'${b.id}')" class="btn-sm btn-ok"><i class="bi bi-check2-all"></i> Completar</a>
          <a href="#" onclick="cancelarCondutor(event,'${b.id}')" class="btn-sm btn-danger"><i class="bi bi-x-circle"></i> Cancelar</a>
        </div>
      </div>`;
    }).join('');
  }

  async function carregarHistorico() {
    const data    = await fetch('../backend/bookings/driver_bookings.php?status=COMPLETED').then(r => r.json());
    const history = data.bookings || [];
    const div     = document.getElementById('historico-tabela');

    if (history.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="bi bi-clock-history"></i><p>Sem viagens no histórico ainda.</p></div>`;
      return;
    }
    div.innerHTML = history.map(b => {
      const paxAv = b.avatar_url
        ? `<img src="../${esc(b.avatar_url)}" alt="">`
        : initials(b.passenger_name);
      return `
      <div class="pax-card">
        <div class="pax-av" style="${b.avatar_url ? '' : 'background:var(--muted)'}">${paxAv}</div>
        <div class="pax-info">
          <div class="pax-name">${esc(b.passenger_name)}</div>
          <div class="pax-meta">
            <span><i class="bi bi-calendar"></i> ${fmt(b.date)} · ${b.depart_time?.slice(0,5)}</span>
            <span><i class="bi bi-geo-alt"></i> ${esc(b.pickup_address)} → ${esc(b.dropoff_address)}</span>
          </div>
        </div>
        <div style="flex-shrink:0;text-align:right">
          <div class="price-tag">${Number(b.total_amount).toFixed(2)} <small>€</small></div>
          <span class="badge badge-completed" style="margin-top:4px"><i class="bi bi-check-circle"></i> Concluída</span>
        </div>
      </div>`;
    }).join('');
  }

  async function carregarVeiculo() {
    const res  = await fetch('../backend/users/car.php');
    const data = await res.json();
    const div  = document.getElementById('veiculo-conteudo');

    if (!data.success || !data.car_make) {
      div.innerHTML = `<div class="empty-state">
        <i class="bi bi-car-front"></i>
        <p>Ainda não adicionaste o teu veículo.</p>
        <a href="perfil.html" class="btn-sm btn-info"><i class="bi bi-plus-circle"></i> Adicionar veículo</a>
      </div>`;
      return;
    }
    div.innerHTML = `
      <div class="veiculo-card">
        <h3 style="margin-top:0;margin-bottom:16px"><i class="bi bi-car-front-fill" style="color:var(--primary)"></i> ${esc(data.car_make)} ${esc(data.car_model || '')}</h3>
        <div class="veiculo-row"><span class="veiculo-label">Marca</span><span class="veiculo-value">${esc(data.car_make || '—')}</span></div>
        <div class="veiculo-row"><span class="veiculo-label">Modelo</span><span class="veiculo-value">${esc(data.car_model || '—')}</span></div>
        <div class="veiculo-row"><span class="veiculo-label">Ano</span><span class="veiculo-value">${data.car_year || '—'}</span></div>
        <div class="veiculo-row"><span class="veiculo-label">Matrícula</span><span class="veiculo-value">${esc(data.car_plate || '—')}</span></div>
        <div style="margin-top:16px">
          <a href="perfil.html" class="btn-sm btn-info"><i class="bi bi-pencil-square"></i> Editar veículo</a>
        </div>
      </div>`;
  }

  function recusarComMotivo(e, id) {
    e.preventDefault();
    document.getElementById('recusar-id').value    = id;
    document.getElementById('recusar-motivo').value = '';
    document.getElementById('modal-recusar').style.display = 'flex';
  }
  function fecharRecusar() { document.getElementById('modal-recusar').style.display = 'none'; }
  function fecharRecusarOverlay(e) { if (e.target === document.getElementById('modal-recusar')) fecharRecusar(); }
  async function confirmarRecusar() {
    const id    = document.getElementById('recusar-id').value;
    const nota  = document.getElementById('recusar-motivo').value.trim() || null;
    const btn   = document.getElementById('btn-confirmar-recusar');
    btnLoad(btn, true, 'A recusar...');
    const res   = await fetch(`../backend/bookings/update_status.php?id=${id}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'CANCELLED_DRIVER', driver_note: nota })
    });
    const data  = await res.json();
    btnLoad(btn, false);
    if (data.success) {
      fecharRecusar();
      toast('Reserva recusada.', 'warning');
      await Promise.all([carregarPendentes(), carregarConfirmados()]);
    } else {
      toast(data.message || 'Erro ao recusar.', 'danger');
    }
  }

  async function atualizarEstado(e, id, status) {
    e.preventDefault();
    const res  = await fetch(`../backend/bookings/update_status.php?id=${id}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      toast(status === 'CONFIRMED' ? 'Reserva aceite.' : 'Reserva recusada.', status === 'CONFIRMED' ? 'success' : 'warning');
      await Promise.all([carregarPendentes(), carregarConfirmados()]);
    } else {
      toast(data.message || 'Erro ao atualizar estado.', 'danger');
    }
  }

  async function cancelarCondutor(e, id) {
    e.preventDefault();
    if (!await confirmar('A reserva será cancelada e o passageiro notificado.', { titulo: 'Cancelar reserva?', okLabel: 'Cancelar reserva' })) return;
    const res  = await fetch(`../backend/bookings/driver_cancel.php?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast('Reserva cancelada.', 'warning');
      await Promise.all([carregarPendentes(), carregarConfirmados()]);
    } else {
      toast(data.message || 'Erro ao cancelar.', 'danger');
    }
  }

  async function completarViagem(e, id) {
    e.preventDefault();
    if (!await confirmar('Confirmas que a viagem foi concluída?', { titulo: 'Completar viagem?', okLabel: 'Sim, concluída', okClass: 'btn-ok' })) return;
    const res  = await fetch(`../backend/bookings/complete.php?id=${id}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    const data = await res.json();
    if (data.success) {
      toast('Viagem concluída!', 'success');
      await Promise.all([carregarConfirmados(), carregarHistorico(), carregarStats()]);
    } else {
      toast(data.message || 'Erro ao completar viagem.', 'danger');
    }
  }

  async function pausarRota(e, routeId, novoStatus) {
    e.preventDefault();
    const res  = await fetch(`../backend/routes/detail.php?id=${routeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
    const data = await res.json();
    if (data.success) {
      toast(novoStatus === 'PAUSED' ? 'Rota pausada.' : 'Rota retomada.', novoStatus === 'PAUSED' ? 'warning' : 'success');
      await carregarRotas();
    } else {
      toast(data.message || 'Erro ao atualizar rota.', 'danger');
    }
  }

  async function apagarRota(e, routeId) {
    e.preventDefault();
    if (!await confirmar('Esta ação não pode ser desfeita. Todas as viagens associadas serão eliminadas.', { titulo: 'Apagar rota?', okLabel: 'Apagar' })) return;
    const res  = await fetch(`../backend/routes/detail.php?id=${routeId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast('Rota apagada.', 'warning');
      await carregarRotas();
    } else {
      toast(data.message || 'Erro ao apagar rota.', 'danger');
    }
  }

  function diasSemana(rec) {
    if (!rec) return '—';
    try {
      const r     = typeof rec === 'string' ? JSON.parse(rec) : rec;
      const nomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      return (r.days_of_week || []).map(d => nomes[d]).join(', ');
    } catch { return '—'; }
  }

  const ROTA_STATUS_PT = { ACTIVE: 'Ativa', PAUSED: 'Pausada', ARCHIVED: 'Arquivada' };
  function fmtRotaStatus(s) { return ROTA_STATUS_PT[s] || s; }
  function fmt(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function initials(n) { return String(n||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase(); }

  init();
