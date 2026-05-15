  fetch('../backend/auth/me.php').then(r => r.json()).then(d => {
    if (!d.user) return;
    const r    = d.user.role;
    const dash = (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html' : 'dashboard.html';
    document.querySelector('.user-actions').innerHTML = `
      <a href="${dash}" class="nav-item"><i class="bi bi-speedometer2"></i> Dashboard</a>
      <a href="perfil.html" class="nav-item"><i class="bi bi-person-circle"></i> Perfil</a>
      <a href="#" onclick="fetch('../backend/auth/logout.php',{method:'POST'}).then(()=>location.href='login.html')" class="nav-item"><i class="bi bi-box-arrow-right"></i> Sair</a>`;
  }).catch(() => {});

  fetch('../backend/routes/public_stats.php')
    .then(r => r.json())
    .then(d => {
      if (d && typeof d.total_trips !== 'undefined') {
        document.getElementById('stat-viagens').textContent = Number(d.total_trips).toLocaleString('pt-PT') + '+';
        document.getElementById('stat-rotas').textContent   = Number(d.active_routes).toLocaleString('pt-PT') + '+';
        document.getElementById('stat-users').textContent   = Number(d.total_users).toLocaleString('pt-PT') + '+';
      }
    })
    .catch(() => {
      document.getElementById('stat-viagens').textContent = '1.200+';
      document.getElementById('stat-rotas').textContent   = '340+';
      document.getElementById('stat-users').textContent   = '2.800+';
    });
