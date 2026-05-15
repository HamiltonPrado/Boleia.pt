  async function sair(e) {
    e.preventDefault();
    await fetch('../backend/auth/logout.php', { method: 'POST' });
    window.location.href = 'login.html';
  }

  async function init() {
    const me = await fetch('../backend/auth/me.php');
    if (!me.ok) { window.location.href = 'login.html'; return; }
    const { user } = await me.json();

    if (user.role === 'ADMIN')                             { window.location.replace('admin.html');             return; }
    if (user.role === 'DRIVER' || user.role === 'BOTH')   { window.location.replace('dashboard_condutor.html'); return; }

    document.getElementById('nome-user').textContent = user.full_name;

    const firstName = user.full_name.split(' ')[0];
    const initials  = user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarEl  = document.getElementById('dash-avatar');
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="../${user.avatar_url}" alt="Perfil">`;
    } else {
      avatarEl.textContent = initials;
    }
    document.getElementById('dash-nome').textContent = `Olá, ${firstName}!`;
    const roleMap = { PASSENGER: 'Passageiro', DRIVER: 'Condutor', BOTH: 'Condutor & Passageiro', ADMIN: 'Administrador' };
    document.getElementById('dash-role-text').textContent = roleMap[user.role] || user.role;

    if (user.role === 'PASSENGER') {
      document.getElementById('nav-publicar').style.display = 'none';
    }

    document.getElementById('reservas-tabela').innerHTML = skeletonRows(3, [100,100,60,50,100,70,70]);
    await carregarReservasPassageiro();
    carregarBadgeReservas();
    carregarHistoricoPassageiro();
  }

  async function carregarReservasPassageiro() {
    const bRes = await fetch('../backend/bookings/index.php');
    const data = await bRes.json();
    const bookings = data.bookings || [];
    const hoje = new Date().toISOString().slice(0,10);
    const proximas = bookings.filter(b =>
      b.date >= hoje && !['CANCELLED_PASSENGER','CANCELLED_DRIVER','COMPLETED'].includes(b.status)
    );

    const div = document.getElementById('reservas-tabela');
    if (proximas.length === 0) {
      div.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;margin-bottom:4px">
        <p style="font-size:0.875rem;color:var(--muted);margin:0">Não tens reservas próximas.</p>
        <a href="pesquisa.html" class="btn-sm btn-muted" style="flex-shrink:0"><i class="bi bi-search"></i> Encontrar boleia</a>
      </div>`;
      carregarSugestoes();
      return;
    }

    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    function fmtDT(date, time) {
      if (!date) return '—';
      const [y, m, dd] = date.split('-');
      return `${parseInt(dd)} ${MESES[parseInt(m)-1]} ${y} às ${(time||'').slice(0,5)}`;
    }

    const badgeMap = {
      CONFIRMED: '<span class="badge badge-confirmed">Confirmada</span>',
      PENDING:   '<span class="badge badge-aguardar">Aguardar Confirmação</span>',
    };

    div.innerHTML = proximas.map(b => {
      const avatarHtml = b.driver_avatar_url
        ? `<img src="../${esc(b.driver_avatar_url)}" alt="">`
        : `<i class="bi bi-person-fill"></i>`;
      const origem  = (b.pickup_address  || '').split(',')[0].trim();
      const destino = (b.dropoff_address || '').split(',')[0].trim();
      const badge   = badgeMap[b.status] || `<span class="badge badge-aguardar">${fmtStatus(b.status)}</span>`;
      const preco   = Math.round(Number(b.total_amount));
      const podeCancelar = ['CONFIRMED','PENDING'].includes(b.status);
      const ocId = b.occurrence_id || '';
      return `
        <div class="res-card" onclick="location.href='viagem.html?oc=${encodeURIComponent(ocId)}'" style="cursor:pointer">
          <div class="res-card-left">
            <div class="res-avatar">${avatarHtml}</div>
            <div class="res-info">
              ${badge}
              <div class="res-route">${esc(origem)}<span class="res-route-dest"> → ${esc(destino)}</span></div>
              <div class="res-date">${fmtDT(b.date, b.depart_time)}</div>
            </div>
          </div>
          <div class="res-card-right">
            <div class="res-price">${preco}€</div>
            <div style="display:flex;gap:10px;align-items:center">
              ${podeCancelar ? `<a href="#" onclick="event.stopPropagation();cancelarReserva(event,'${b.id}')" class="res-cancel"><i class="bi bi-x-circle-fill"></i> Cancelar</a>` : ''}
              <a href="#" onclick="event.stopPropagation();partilharOc('${ocId}')" style="font-size:0.82rem;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:4px" title="Partilhar"><i class="bi bi-share-fill"></i></a>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function partilharOc(ocId) {
    const url = `${location.origin}${location.pathname.replace('dashboard.html','viagem.html')}?oc=${encodeURIComponent(ocId)}`;
    if (navigator.share) { try { await navigator.share({ title: 'Boleia.pt', url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast('Link copiado!', 'success'); } catch { prompt('Copia este link:', url); }
  }

  async function cancelarReserva(e, id) {
    e.preventDefault();
    if (!await confirmar('A tua reserva será cancelada.', { titulo: 'Cancelar reserva?', okLabel: 'Cancelar reserva' })) return;
    const res  = await fetch(`../backend/bookings/cancel.php?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast('Reserva cancelada.', 'warning');
      await carregarReservasPassageiro();
    } else {
      toast(data.message || 'Erro ao cancelar.', 'danger');
    }
  }

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function fmtDate(d) {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    const hoje = new Date().toISOString().slice(0,10);
    const aman = new Date(Date.now()+86400000).toISOString().slice(0,10);
    if (d === hoje) return 'Hoje';
    if (d === aman) return 'Amanhã';
    return `${parseInt(dd)} ${MESES[parseInt(m)-1]}`;
  }

  function renderCard(v) {
    const livres   = Number(v.total_seats) - Number(v.seats_taken);
    const rating   = v.avg_rating ? Number(v.avg_rating).toFixed(1) : null;
    const preco    = Math.round(Number(v.price_per_seat));
    const initials = (v.driver_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const avHtml   = v.avatar_url
      ? `<img src="../${esc(v.avatar_url)}" alt="">`
      : initials;
    const origem  = (v.origem||'—').split(',')[0].trim();
    const destino = (v.destino||'—').split(',')[0].trim();
    const destino_href = v.occurrence_id
      ? `viagem.html?oc=${encodeURIComponent(v.occurrence_id)}`
      : 'pesquisa.html';
    return `<div class="rc" onclick="location.href='${destino_href}'">
      <div class="rc-top">
        <div class="rc-driver">
          <div class="rc-av">${avHtml}</div>
          <div>
            <div class="rc-dname">${esc(v.driver_name)}</div>
            ${rating ? `<div class="rc-rating">★ ${rating}</div>` : ''}
          </div>
        </div>
        <div class="rc-price">${preco}€</div>
      </div>
      <div class="rc-route">
        <div class="rc-dots">
          <span class="rc-dot rc-dot-g"></span>
          <span class="rc-vline"></span>
          <span class="rc-dot rc-dot-b"></span>
        </div>
        <div class="rc-addrs">
          <div>
            <div class="rc-addr">${esc(origem)}</div>
            <div class="rc-addr-time">${v.depart_time?.slice(0,5)||'—'}</div>
          </div>
          <div class="rc-addr" style="color:var(--muted)">${esc(destino)}</div>
        </div>
      </div>
      <div class="rc-foot">
        <span class="rc-seats"><i class="bi bi-check-circle-fill"></i> ${livres} lugar${livres!==1?'es':''}</span>
        ${v.date ? `<span class="rc-date">${fmtDate(v.date)}</span>` : ''}
      </div>
    </div>`;
  }

  const DEMO_ROUTES = [
    { driver_name:'Paulo Almeida',  avg_rating:'4.8', total_trips:32, price_per_seat:'14', depart_time:'08:30', origem:'Lisboa',  destino:'Porto',   total_seats:4, seats_taken:1, date:null },
    { driver_name:'Ana Silva',      avg_rating:'4.6', total_trips:18, price_per_seat:'6',  depart_time:'07:15', origem:'Porto',   destino:'Braga',   total_seats:3, seats_taken:1, date:null },
    { driver_name:'Miguel Costa',   avg_rating:'4.9', total_trips:54, price_per_seat:'8',  depart_time:'07:45', origem:'Setúbal', destino:'Lisboa',  total_seats:4, seats_taken:0, date:null },
    { driver_name:'Sofia Martins',  avg_rating:'4.7', total_trips:21, price_per_seat:'22', depart_time:'06:00', origem:'Faro',    destino:'Lisboa',  total_seats:2, seats_taken:1, date:null },
    { driver_name:'Pedro Alves',    avg_rating:'4.5', total_trips:11, price_per_seat:'10', depart_time:'09:00', origem:'Coimbra', destino:'Lisboa',  total_seats:3, seats_taken:0, date:null },
    { driver_name:'Erica Silva',    avg_rating:'5.0', total_trips:8,  price_per_seat:'18', depart_time:'10:30', origem:'Braga',   destino:'Porto',   total_seats:2, seats_taken:1, date:null },
  ];

  async function carregarSugestoes() {
    const section = document.getElementById('secao-sugestoes');
    const grid    = document.getElementById('sugestoes-grid');
    section.style.display = '';
    grid.innerHTML = `<div class="rc-grid">${[1,2,3,4,5,6].map(() => `
      <div class="rc" style="cursor:default">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="skeleton" style="width:34px;height:34px;border-radius:50%"></div>
          <div><div class="skeleton" style="width:90px;height:12px;margin-bottom:5px"></div><div class="skeleton" style="width:50px;height:10px"></div></div>
          <div class="skeleton" style="width:40px;height:26px;border-radius:8px;margin-left:auto"></div>
        </div>
        <div class="skeleton" style="width:100%;height:52px;border-radius:8px"></div>
        <div class="skeleton" style="width:70%;height:10px;border-radius:4px"></div>
      </div>`).join('')}</div>`;
    try {
      const res    = await fetch('../backend/routes/upcoming.php?limit=3');
      const data   = await res.json();
      const routes = data.routes || [];
      grid.innerHTML = `<div class="rc-grid">${
        (routes.length > 0 ? routes : DEMO_ROUTES).slice(0, 3).map(v => renderCard(v)).join('')
      }</div>`;
    } catch {
      grid.innerHTML = `<div class="rc-grid">${DEMO_ROUTES.slice(0, 3).map(v => renderCard(v)).join('')}</div>`;
    }
  }

  async function carregarHistoricoPassageiro() {
    try {
      const data     = await fetch('../backend/bookings/index.php').then(r => r.json());
      const bookings = data.bookings || [];
      const hoje     = new Date().toISOString().slice(0,10);
      const passadas = bookings.filter(b =>
        b.date < hoje || ['CANCELLED_PASSENGER','CANCELLED_DRIVER','COMPLETED'].includes(b.status)
      ).slice(0, 3);

      if (passadas.length === 0) return;

      const sec = document.getElementById('secao-historico');
      const div = document.getElementById('historico-tabela');
      sec.style.display = '';

      const MESES_H = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const STATUS_BADGE_H = {
        CONFIRMED:           'badge-confirmed',
        COMPLETED:           'badge-completed',
        CANCELLED_PASSENGER: 'badge-cancelled',
        CANCELLED_DRIVER:    'badge-cancelled',
        NO_SHOW:             'badge-cancelled',
      };
      const STATUS_LABEL_H = {
        CONFIRMED:           'Confirmada',
        COMPLETED:           'Concluída',
        CANCELLED_PASSENGER: 'Cancelada por mim',
        CANCELLED_DRIVER:    'Cancelada pelo condutor',
        NO_SHOW:             'Não compareceu',
      };

      div.innerHTML = passadas.map(b => {
        const origem  = (b.pickup_address  || '').split(',')[0].trim();
        const destino = (b.dropoff_address || '').split(',')[0].trim();
        const preco   = Math.round(Number(b.total_amount));
        const [y, m, dd] = (b.date || '').split('-');
        const dataFmt = b.date ? `${parseInt(dd)} ${MESES_H[parseInt(m)-1]} ${y}` : '—';
        const avHtml  = b.driver_avatar_url
          ? `<img src="../${esc(b.driver_avatar_url)}" alt="">`
          : `<i class="bi bi-person-fill"></i>`;
        const ocId = b.occurrence_id || '';

        return `<div class="res-card" onclick="location.href='viagem.html?oc=${encodeURIComponent(ocId)}'" style="cursor:pointer;opacity:0.82">
          <div class="res-card-left">
            <div class="res-avatar">${avHtml}</div>
            <div class="res-info">
              <span class="badge ${STATUS_BADGE_H[b.status] || 'badge-archived'}">${STATUS_LABEL_H[b.status] || b.status}</span>
              <div class="res-route">${esc(origem)}<span class="res-route-dest"> → ${esc(destino)}</span></div>
              <div class="res-date">${dataFmt} às ${(b.depart_time || '').slice(0,5)}</div>
            </div>
          </div>
          <div class="res-card-right">
            <div class="res-price">${preco}€</div>
          </div>
        </div>`;
      }).join('');
    } catch {}
  }

  const STATUS_PT = {
    PENDING:             'Pendente',
    CONFIRMED:           'Confirmada',
    COMPLETED:           'Concluída',
    CANCELLED_PASSENGER: 'Cancelada pelo passageiro',
    CANCELLED_DRIVER:    'Cancelada pelo condutor',
    NO_SHOW:             'Não compareceu',
  };
  function fmtStatus(s) { return STATUS_PT[s] || s; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init();
