fetch('../backend/auth/me.php').then(r => r.json()).then(d => {
  if (!d.user) return;
  const nav = document.querySelector('.user-actions');
  nav.innerHTML = `
    <a href="perfil.html" class="nav-item"><i class="bi bi-person-circle"></i> Perfil</a>
    <a href="#" onclick="fetch('../backend/auth/logout.php',{method:'POST'}).then(()=>location.href='login.html')" class="nav-item"><i class="bi bi-box-arrow-right"></i> Sair</a>`;
  const links = document.querySelector('.nav-links');
  const r = d.user.role;
  const dash = (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html' : 'dashboard.html';
  links.innerHTML = `<a href="${dash}" class="nav-item"><i class="bi bi-speedometer2"></i> Dashboard</a>`;
}).catch(() => {});
