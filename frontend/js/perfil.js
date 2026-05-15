  async function sair(e) {
    e.preventDefault();
    await fetch('../backend/auth/logout.php', { method: 'POST' });
    window.location.href = 'login.html';
  }

  function mostrarAba(e, id) {
    if (e) e.preventDefault();
    const abas = ['aba-info','aba-password','aba-carro','aba-documentos','aba-stats','aba-avaliacoes'];
    abas.forEach(a => document.getElementById(a).classList.toggle('active', a === id));
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.getAttribute('aria-controls') === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
    if (id === 'aba-stats')      carregarStats();
    if (id === 'aba-documentos') carregarDocumentos();
    if (id === 'aba-avaliacoes') carregarAvaliacoes();
    if (id === 'aba-carro')      carregarCarro();
  }

  async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res  = await fetch('../backend/users/avatar.php', {
        method: 'POST',
        body: form,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data.success) {
        toast('Foto de perfil atualizada!', 'success');
        const avatarEl = document.getElementById('perfil-avatar');
        avatarEl.innerHTML = `<img src="../${data.avatar_url}?t=${Date.now()}" alt="Perfil">`;
      } else {
        toast(data.message || 'Erro ao guardar a foto.', 'danger');
      }
    } catch {
      toast('Erro de ligação ao guardar a foto.', 'danger');
    }
    input.value = '';
  }

  function mostrarNomeFicheiro(input) {
    const display = document.getElementById('file-name-display');
    const nameEl  = document.getElementById('file-name-text');
    if (input.files[0]) {
      nameEl.textContent = input.files[0].name;
      display.style.display = 'block';
    } else {
      display.style.display = 'none';
    }
  }

  async function init() {
    const me = await fetch('../backend/auth/me.php');
    if (!me.ok) { window.location.href = 'login.html'; return; }
    const { user } = await me.json();

    document.getElementById('nome-user').textContent = user.full_name;

    const parts = user.full_name.split(' ');
    document.getElementById('first_name').value = parts[0] || '';
    document.getElementById('last_name').value  = parts.slice(1).join(' ') || '';
    document.getElementById('email').value      = user.email;
    document.getElementById('phone').value      = user.phone || '';

    const initStr  = user.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
    const avatarEl = document.getElementById('perfil-avatar');
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="../${user.avatar_url}" alt="Perfil">`;
    } else {
      avatarEl.textContent = initStr;
    }
    document.getElementById('perfil-nome').textContent     = user.full_name;
    const roleMap = { PASSENGER: 'Passageiro', DRIVER: 'Condutor', BOTH: 'Condutor & Passageiro', ADMIN: 'Administrador' };
    document.getElementById('perfil-role-text').textContent = roleMap[user.role] || user.role;

    if (user.role === 'DRIVER' || user.role === 'BOTH') {
      ajustarNavCondutor(user.role);
      document.getElementById('back-link').href = 'dashboard_condutor.html';
    }

    const isCondutor = user.role === 'DRIVER' || user.role === 'BOTH' || user.role === 'ADMIN';
    if (!isCondutor) {
      document.getElementById('btn-documentos').style.display = 'none';
      document.getElementById('btn-carro').style.display      = 'none';
      document.getElementById('btn-stats').style.display      = 'none';
    }

    if (user.role === 'ADMIN') {
      const navEl  = document.getElementById('nav-main');
      const aAdmin = document.createElement('a');
      aAdmin.href = 'admin.html'; aAdmin.className = 'nav-item';
      aAdmin.innerHTML = '<i class="bi bi-shield-lock"></i> Administração';
      navEl.appendChild(aAdmin);
    }

    if (user.role === 'PASSENGER') {
      document.getElementById('nav-publicar').style.display = 'none';
    }
    carregarBadgeReservas();
    carregarStatsPerfil(user.role, user.created_at);

    if (window.location.hash === '#documentos' && isCondutor) {
      mostrarAba({ preventDefault: () => {} }, 'aba-documentos');
    }
  }

  async function carregarStatsPerfil(role, createdAt) {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const d     = createdAt ? new Date(createdAt) : null;
    const desde = d ? `${MESES[d.getMonth()]} ${d.getFullYear()}` : '—';
    const div   = document.getElementById('perfil-stats');

    div.innerHTML = `<div class="info-stat-row"><i class="bi bi-calendar3"></i> Membro desde ${desde}</div>`;

    try {
      if (role === 'DRIVER' || role === 'BOTH' || role === 'ADMIN') {
        const s = await fetch('../backend/routes/stats.php').then(r => r.json());
        if (s.success) {
          div.innerHTML += `<div class="info-stat-row"><i class="bi bi-car-front-fill"></i> ${s.stats.total_trips || 0} viagens realizadas</div>`;
          if (s.stats.avg_rating) div.innerHTML += `<div class="info-stat-row"><i class="bi bi-star-fill" style="color:var(--warning)"></i> Avaliação: ${Number(s.stats.avg_rating).toFixed(1)}</div>`;
        }
      } else {
        const b         = await fetch('../backend/bookings/index.php').then(r => r.json());
        const completed = (b.bookings || []).filter(bk => bk.status === 'COMPLETED').length;
        div.innerHTML  += `<div class="info-stat-row"><i class="bi bi-ticket-perforated-fill"></i> ${completed} viagens realizadas</div>`;
      }
    } catch {}
  }

  async function guardarPerfil(e) {
    e.preventDefault();
    const first     = document.getElementById('first_name').value.trim();
    const last      = document.getElementById('last_name').value.trim();
    const full_name = last ? `${first} ${last}` : first;
    const res  = await fetch('../backend/users/profile.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone: document.getElementById('phone').value.trim() })
    });
    const data = await res.json();
    toast(data.message, data.success ? 'success' : 'danger');
    if (data.success) {
      document.getElementById('nome-user').textContent  = data.user.full_name;
      document.getElementById('perfil-nome').textContent = data.user.full_name;
    }
  }

  async function alterarPassword(e) {
    e.preventDefault();
    const nova = document.getElementById('pass-nova').value;
    const conf = document.getElementById('pass-confirmar').value;
    if (nova !== conf) { toast('As novas palavras-passe não coincidem.', 'danger'); return; }
    const res  = await fetch('../backend/users/password.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: document.getElementById('pass-atual').value,
        new_password:     nova
      })
    });
    const data = await res.json();
    toast(data.message, data.success ? 'success' : 'danger');
    if (data.success) {
      document.getElementById('pass-atual').value     = '';
      document.getElementById('pass-nova').value      = '';
      document.getElementById('pass-confirmar').value = '';
    }
  }

  async function carregarCarro() {
    const res  = await fetch('../backend/users/car.php');
    const data = await res.json();
    if (data.success) {
      document.getElementById('car_make').value  = data.car_make  || '';
      document.getElementById('car_model').value = data.car_model || '';
      document.getElementById('car_year').value  = data.car_year  || '';
      document.getElementById('car_plate').value = data.car_plate || '';
    }
  }

  async function guardarCarro(e) {
    e.preventDefault();
    const res  = await fetch('../backend/users/car.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_make:  document.getElementById('car_make').value.trim(),
        car_model: document.getElementById('car_model').value.trim(),
        car_year:  parseInt(document.getElementById('car_year').value) || null,
        car_plate: document.getElementById('car_plate').value.trim()
      })
    });
    const data = await res.json();
    toast(data.message, data.success ? 'success' : 'danger');
  }

  async function carregarDocumentos() {
    const res  = await fetch('../backend/users/documents.php');
    const data = await res.json();
    const docs = data.documents || [];
    const div  = document.getElementById('lista-documentos');

    const tipoLabel  = { LICENSE: 'Carta de Condução', ID: 'Cartão de Cidadão', INSURANCE: 'Seguro' };
    const estadoBadge = { PENDING: 'badge-pending', APPROVED: 'badge-confirmed', REJECTED: 'badge-cancelled' };
    const estadoLabel = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' };

    if (docs.length === 0) {
      div.innerHTML = '<div class="empty-state" style="padding:20px 0"><i class="bi bi-file-earmark-x"></i><p>Ainda não enviaste nenhum documento.</p></div>';
      return;
    }

    div.innerHTML = docs.map(d => {
      const ext     = (d.file_url || '').split('.').pop().toLowerCase();
      const thumbHtml = ext === 'pdf'
        ? `<div class="doc-thumb-pdf"><i class="bi bi-file-earmark-pdf-fill"></i></div>`
        : `<img class="doc-thumb" src="../${esc(d.file_url)}" alt="${tipoLabel[d.type] || d.type}">`;
      return `<div class="doc-card">
        <a href="../${esc(d.file_url)}" target="_blank">${thumbHtml}</a>
        <div class="doc-info">
          <div class="doc-tipo">${tipoLabel[d.type] || d.type}</div>
          <div class="doc-data">Enviado em ${fmt(d.uploaded_at?.slice(0,10))}</div>
        </div>
        <span class="badge ${estadoBadge[d.status] || 'badge-pending'}">${estadoLabel[d.status] || d.status}</span>
      </div>`;
    }).join('');
  }

  async function enviarDocumento(e) {
    e.preventDefault();
    const fileInput = document.getElementById('doc-file');
    const file      = fileInput.files[0];
    if (!file) { toast('Seleciona um ficheiro.', 'warning'); return; }

    const form = new FormData();
    form.append('type', document.getElementById('doc-tipo').value);
    form.append('file', file);

    const res  = await fetch('../backend/users/documents.php', { method: 'POST', body: form });
    const data = await res.json();
    toast(data.message, data.success ? 'success' : 'danger');
    if (data.success) {
      fileInput.value = '';
      document.getElementById('file-name-display').style.display = 'none';
      await carregarDocumentos();
    }
  }

  async function carregarStats() {
    const res  = await fetch('../backend/routes/stats.php');
    const data = await res.json();
    const div  = document.getElementById('stats-conteudo');
    if (!data.success) {
      div.innerHTML = '<div class="empty-state" style="padding:20px 0"><i class="bi bi-graph-up"></i><p>Sem estatísticas disponíveis.</p></div>';
      div.className = '';
      return;
    }
    const s = data.stats;
    div.className = 'stat-grid';
    div.innerHTML = `
      <div class="stat-card c-success"><div class="stat-label">Ganhos esta semana</div><div class="stat-value">${Number(s.week_earnings||0).toFixed(2)} <small style="font-size:.9rem;font-weight:500">€</small></div></div>
      <div class="stat-card c-primary"><div class="stat-label">Ganhos totais</div><div class="stat-value">${Number(s.total_earnings||0).toFixed(2)} <small style="font-size:.9rem;font-weight:500">€</small></div></div>
      <div class="stat-card c-warning"><div class="stat-label">Viagens concluídas</div><div class="stat-value">${s.total_trips || 0}</div></div>
      <div class="stat-card c-muted"><div class="stat-label">Avaliação média</div><div class="stat-value">${s.avg_rating ? Number(s.avg_rating).toFixed(1) + ' ★' : '—'}</div></div>`;
  }

  async function carregarAvaliacoes() {
    const res     = await fetch('../backend/reviews/received.php');
    const data    = await res.json();
    const reviews = data.reviews || [];
    const div     = document.getElementById('avaliacoes');
    if (reviews.length === 0) {
      div.innerHTML = '<div class="empty-state" style="padding:20px 0"><i class="bi bi-star"></i><p>Sem avaliações ainda.</p></div>';
      return;
    }
    div.innerHTML = reviews.map(r => {
      const initials = (r.reviewer_name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      return `<div class="review-card">
        <div class="review-av">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span class="review-name">${esc(r.reviewer_name || 'Anónimo')}</span>
            <span class="review-date">${fmt(r.created_at?.slice(0,10))}</span>
          </div>
          <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          ${r.comment ? `<p class="review-comment">"${esc(r.comment)}"</p>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function ajustarNavCondutor(role) {
    document.getElementById('nav-brand').href          = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').href      = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').innerHTML = '<i class="bi bi-speedometer2"></i> Painel';
    if (role === 'DRIVER') {
      document.getElementById('nav-pesquisar').style.display = 'none';
      document.getElementById('nav-reservas').style.display  = 'none';
    }
  }

  function fmt(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init();
