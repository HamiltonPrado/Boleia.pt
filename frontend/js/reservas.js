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

    await carregarReservas();
    carregarBadgeReservas();
  }

  async function carregarReservas() {
    const div = document.getElementById('conteudo');
    let bookings = [], reviewableIds = new Set();

    try {
      const bRes  = await fetch('../backend/bookings/index.php');
      const bData = await bRes.json();
      bookings = bData.bookings || [];
    } catch {
      div.innerHTML = '<div class="alert alert-danger"><i class="bi bi-x-circle-fill"></i> Erro ao carregar reservas.</div>';
      return;
    }

    try {
      const revRes  = await fetch('../backend/reviews/reviewable.php');
      const revData = await revRes.json();
      reviewableIds = new Set((revData.bookings || []).filter(b => !b.review_id).map(b => b.id));
    } catch { }

    const hoje    = new Date().toISOString().slice(0,10);
    const proximas = bookings.filter(b =>
      b.date >= hoje && !['CANCELLED_PASSENGER','CANCELLED_DRIVER','COMPLETED'].includes(b.status)
    );
    const passadas = bookings.filter(b =>
      b.date < hoje || ['CANCELLED_PASSENGER','CANCELLED_DRIVER','COMPLETED'].includes(b.status)
    );

    if (bookings.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="bi bi-ticket-perforated"></i><p>Ainda não tens reservas. <a href="pesquisa.html" class="btn-sm btn-info"><i class="bi bi-search"></i> Pesquisar viagens</a></p></div>`;
      carregarSugestoes();
      return;
    }

    const cardsProximas = proximas.length === 0
      ? `<div class="empty-state" style="padding:20px 0"><i class="bi bi-calendar-x"></i><p>Sem reservas próximas. <a href="pesquisa.html">Pesquisar viagens</a></p></div>`
      : proximas.map(b => renderCard(b, false, reviewableIds)).join('');

    const cardsPassadas = passadas.length === 0
      ? `<div class="empty-state" style="padding:20px 0"><i class="bi bi-clock-history"></i><p>Sem viagens passadas.</p></div>`
      : passadas.map(b => renderCard(b, true, reviewableIds)).join('');

    div.innerHTML = `
      <div class="section-sep">Próximas viagens</div>
      ${cardsProximas}
      <div class="section-sep" style="margin-top:32px">Viagens passadas</div>
      ${cardsPassadas}`;
  }

  function renderCard(b, passada, reviewableIds) {
    const cidade = addr => (addr || '—').split(',')[0].trim();
    const origem  = cidade(b.pickup_address);
    const destino = cidade(b.dropoff_address);
    const preco   = Math.round(Number(b.total_amount)) + '€';

    const avatarHtml = b.driver_avatar_url
      ? `<img src="../${esc(b.driver_avatar_url)}" alt="${esc(b.driver_name)}">`
      : `<i class="bi bi-person-fill"></i>`;

    const STATUS_BADGE = {
      PENDING:             'badge-aguardar',
      CONFIRMED:           'badge-confirmed',
      COMPLETED:           'badge-completed',
      CANCELLED_PASSENGER: 'badge-cancelled',
      CANCELLED_DRIVER:    'badge-cancelled',
      NO_SHOW:             'badge-cancelled',
    };
    const STATUS_LABEL = {
      PENDING:             'Aguardar Confirmação',
      CONFIRMED:           'Confirmada',
      COMPLETED:           'Concluída',
      CANCELLED_PASSENGER: 'Cancelada por mim',
      CANCELLED_DRIVER:    'Cancelada pelo condutor',
      NO_SHOW:             'Não compareceu',
    };

    const podeCancelar  = !passada && ['PENDING','CONFIRMED'].includes(b.status);
    const podeAvaliar   = passada && reviewableIds.has(b.id);
    const podeReclamar  = passada && ['COMPLETED','CANCELLED_DRIVER','NO_SHOW'].includes(b.status);

    const acaoHtml = podeCancelar
      ? `<button class="reserva-cancel" onclick="cancelar(event,'${b.id}','${b.date}','${b.depart_time?.slice(0,5)||''}')"><i class="bi bi-x-circle-fill"></i> Cancelar</button>`
      : `<div style="display:flex;gap:10px;align-items:center">
          ${podeAvaliar  ? `<button class="reserva-avaliar"  onclick="abrirReview(event,'${b.id}')"><i class="bi bi-star-fill"></i> Avaliar</button>` : ''}
          ${podeReclamar ? `<button class="reserva-reclamar" onclick="abrirComplaint(event,'${b.id}')"><i class="bi bi-flag-fill"></i> Reclamar</button>` : ''}
        </div>`;

    return `<div class="reserva-card${passada ? ' passada' : ''}">
      <div class="reserva-avatar">${avatarHtml}</div>
      <div class="reserva-info">
        <span class="badge ${STATUS_BADGE[b.status] || 'badge-archived'}">${STATUS_LABEL[b.status] || b.status}</span>
        <div class="reserva-route">${esc(origem)}<span class="reserva-route-dest"> → ${esc(destino)}</span></div>
        <div class="reserva-meta">${fmtDatetime(b.date, b.depart_time)}</div>
        ${b.status === 'CANCELLED_DRIVER' && b.driver_note ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:3px;font-style:italic"><i class="bi bi-chat-text"></i> "${esc(b.driver_note)}"</div>` : ''}
      </div>
      <div class="reserva-right">
        <span class="reserva-price">${preco}</span>
        ${acaoHtml}
      </div>
    </div>`;
  }

  async function cancelar(e, id, date, time) {
    e.preventDefault();
    let refundMsg = '';
    if (date && time) {
      const depart   = new Date(date + 'T' + time);
      const diffHours = (depart - Date.now()) / 3600000;
      refundMsg = diffHours > 3
        ? ' Reembolso: 100% (partida em mais de 3h).'
        : ' Reembolso: 50% (partida em menos de 3h).';
    }
    if (!await confirmar('Tens a certeza que queres cancelar esta reserva?' + refundMsg, { titulo: 'Cancelar reserva?', okLabel: 'Cancelar reserva' })) return;
    const res  = await fetch(`../backend/bookings/cancel.php?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast('Reserva cancelada.', 'warning');
      await carregarReservas();
    } else {
      toast(data.message || 'Erro ao cancelar.', 'danger');
    }
  }

  const STAR_LABELS = { 1:'Muito mau', 2:'Mau', 3:'Razoável', 4:'Bom', 5:'Excelente' };

  function setRating(val) {
    document.getElementById('review-rating').value     = val;
    document.getElementById('star-label').textContent  = STAR_LABELS[val];
    document.getElementById('star-label').style.color  = 'var(--dark)';
    document.querySelectorAll('.rv-star').forEach(b => {
      b.classList.toggle('on', Number(b.dataset.val) <= val);
    });
  }

  function abrirReview(e, bookingId) {
    if (e) e.preventDefault();
    document.getElementById('review-booking-id').value = bookingId;
    document.getElementById('review-comment').value    = '';
    document.getElementById('review-rating').value     = '0';
    document.getElementById('star-label').textContent  = 'Seleciona uma avaliação';
    document.getElementById('star-label').style.color  = 'var(--muted)';
    document.querySelectorAll('.rv-star').forEach(b => b.classList.remove('on'));
    document.getElementById('modal-review').style.display = 'flex';
  }

  function fecharReview() {
    document.getElementById('modal-review').style.display = 'none';
  }

  function fecharReviewOverlay(e) {
    const overlay = document.getElementById('modal-review');
    if (e.target === overlay || e.target === overlay.querySelector('.rv-wrap')) fecharReview();
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharReview(); });

  async function submeterReview() {
    const bookingId = document.getElementById('review-booking-id').value;
    const rating    = parseInt(document.getElementById('review-rating').value) || 0;
    if (!rating) { toast('Seleciona uma avaliação.', 'warning'); return; }
    const comment   = document.getElementById('review-comment').value.trim() || null;

    const res  = await fetch('../backend/reviews/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, rating, comment })
    });
    const data = await res.json();
    if (data.success) {
      toast(data.message || 'Avaliação enviada!', 'success');
      fecharReview();
      await carregarReservas();
    } else {
      toast(data.message || 'Erro ao enviar avaliação.', 'danger');
    }
  }

  const DEMO_ROUTES = [
    { driver_name:'Paulo Almeida', avg_rating:'4.8', price_per_seat:'14', depart_time:'08:30', origem:'Lisboa',  destino:'Porto',  total_seats:4, seats_taken:1, date:null },
    { driver_name:'Ana Silva',     avg_rating:'4.6', price_per_seat:'6',  depart_time:'07:15', origem:'Porto',   destino:'Braga',  total_seats:3, seats_taken:1, date:null },
    { driver_name:'Miguel Costa',  avg_rating:'4.9', price_per_seat:'8',  depart_time:'07:45', origem:'Setúbal', destino:'Lisboa', total_seats:4, seats_taken:0, date:null },
    { driver_name:'Sofia Martins', avg_rating:'4.7', price_per_seat:'22', depart_time:'06:00', origem:'Faro',    destino:'Lisboa', total_seats:2, seats_taken:1, date:null },
    { driver_name:'Pedro Alves',   avg_rating:'4.5', price_per_seat:'10', depart_time:'09:00', origem:'Coimbra', destino:'Lisboa', total_seats:3, seats_taken:0, date:null },
    { driver_name:'Erica Silva',   avg_rating:'5.0', price_per_seat:'18', depart_time:'10:30', origem:'Braga',   destino:'Porto',  total_seats:2, seats_taken:1, date:null },
  ];
  const MESES_S = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function fmtDateS(d) {
    if (!d) return '';
    const [y,m,dd] = d.split('-');
    const hoje = new Date().toISOString().slice(0,10);
    const aman = new Date(Date.now()+86400000).toISOString().slice(0,10);
    if (d===hoje) return 'Hoje'; if (d===aman) return 'Amanhã';
    return `${parseInt(dd)} ${MESES_S[parseInt(m)-1]}`;
  }
  function renderSugestaoCard(v) {
    const livres = Number(v.total_seats) - Number(v.seats_taken);
    const preco  = Math.round(Number(v.price_per_seat));
    const init   = (v.driver_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const av     = v.avatar_url ? `<img src="../${esc(v.avatar_url)}" alt="">` : init;
    const href   = v.occurrence_id ? `viagem.html?oc=${encodeURIComponent(v.occurrence_id)}` : 'pesquisa.html';
    return `<div class="rc" onclick="location.href='${href}'">
      <div class="rc-top">
        <div class="rc-driver"><div class="rc-av">${av}</div><div>
          <div class="rc-dname">${esc(v.driver_name)}</div>
          ${v.avg_rating ? `<div class="rc-rating">★ ${Number(v.avg_rating).toFixed(1)}</div>` : ''}
        </div></div>
        <div class="rc-price">${preco}€</div>
      </div>
      <div class="rc-route">
        <div class="rc-dots"><span class="rc-dot rc-dot-g"></span><span class="rc-vline"></span><span class="rc-dot rc-dot-b"></span></div>
        <div class="rc-addrs">
          <div><div class="rc-addr">${esc((v.origem||'—').split(',')[0])}</div><div class="rc-addr-time">${v.depart_time?.slice(0,5)||'—'}</div></div>
          <div class="rc-addr" style="color:var(--muted)">${esc((v.destino||'—').split(',')[0])}</div>
        </div>
      </div>
      <div class="rc-foot">
        <span class="rc-seats"><i class="bi bi-check-circle-fill"></i> ${livres} lugar${livres!==1?'es':''}</span>
        ${v.date ? `<span class="rc-date">${fmtDateS(v.date)}</span>` : ''}
      </div>
    </div>`;
  }
  async function carregarSugestoes() {
    const sec  = document.getElementById('secao-sugestoes');
    const grid = document.getElementById('sugestoes-grid');
    sec.style.display = '';
    grid.innerHTML = `<div class="rc-grid">${[1,2,3,4,5,6].map(()=>`<div class="rc" style="cursor:default"><div style="display:flex;gap:10px"><div class="skeleton" style="width:34px;height:34px;border-radius:50%"></div><div><div class="skeleton" style="width:90px;height:12px;margin-bottom:5px"></div><div class="skeleton" style="width:50px;height:10px"></div></div><div class="skeleton" style="width:40px;height:26px;border-radius:8px;margin-left:auto"></div></div><div class="skeleton" style="width:100%;height:52px;border-radius:8px"></div><div class="skeleton" style="width:70%;height:10px;border-radius:4px"></div></div>`).join('')}</div>`;
    try {
      const data   = await fetch('../backend/routes/upcoming.php?limit=6').then(r=>r.json());
      const routes = data.routes || [];
      grid.innerHTML = `<div class="rc-grid">${(routes.length>0?routes:DEMO_ROUTES).map(renderSugestaoCard).join('')}</div>`;
    } catch { grid.innerHTML = `<div class="rc-grid">${DEMO_ROUTES.map(renderSugestaoCard).join('')}</div>`; }
  }

  function abrirComplaint(e, bookingId) {
    if (e) e.preventDefault();
    document.getElementById('cpl-booking-id').value = bookingId;
    document.getElementById('cpl-desc').value        = '';
    document.getElementById('cpl-type').value        = 'NO_SHOW';
    document.getElementById('modal-complaint').style.display = 'flex';
  }
  function fecharComplaint() { document.getElementById('modal-complaint').style.display = 'none'; }
  function fecharComplaintOverlay(e) {
    if (e.target === document.getElementById('modal-complaint')) fecharComplaint();
  }
  async function submeterComplaint() {
    const bookingId = document.getElementById('cpl-booking-id').value;
    const type      = document.getElementById('cpl-type').value;
    const desc      = document.getElementById('cpl-desc').value.trim();
    if (!desc) { toast('Descreve o que aconteceu.', 'warning'); return; }

    const btn = document.querySelector('.cpl-btn');
    btnLoad(btn, true, 'A enviar...');
    const res  = await fetch('../backend/complaints/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, type, description: desc })
    });
    const data = await res.json();
    btnLoad(btn, false);
    if (data.success) {
      toast(data.message, 'success');
      fecharComplaint();
    } else {
      toast(data.message || 'Erro ao enviar reclamação.', 'danger');
    }
  }

  function ajustarNavCondutor(role) {
    document.getElementById('nav-brand').href          = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').href      = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').innerHTML = '<i class="bi bi-speedometer2"></i> Painel';
    document.getElementById('back-link').href          = 'dashboard_condutor.html';
    if (role === 'DRIVER') {
      document.getElementById('nav-pesquisar').style.display = 'none';
    }
  }

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function fmtDatetime(date, time) {
    if (!date) return '—';
    const [y, m, d] = date.split('-');
    const hora = time ? time.slice(0,5) : '';
    return `${parseInt(d)} ${MESES[parseInt(m)-1]} ${y}${hora ? ' às ' + hora : ''}`;
  }
  function fmt(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init();
