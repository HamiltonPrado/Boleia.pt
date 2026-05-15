  fetch('../backend/auth/me.php').then(r => r.json()).then(d => {
    if (!d.user) return;
    const nav = document.querySelector('.user-actions');
    const r   = d.user.role;
    const dash = (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html' : 'dashboard.html';
    nav.innerHTML = `
      <a href="${dash}" class="nav-item"><i class="bi bi-speedometer2"></i> Dashboard</a>
      <a href="perfil.html" class="nav-item"><i class="bi bi-person-circle"></i> Perfil</a>
      <a href="#" onclick="fetch('../backend/auth/logout.php',{method:'POST'}).then(()=>location.href='login.html')" class="nav-item"><i class="bi bi-box-arrow-right"></i> Sair</a>`;
    if (d.user.full_name) document.getElementById('ct-nome').value  = d.user.full_name;
    if (d.user.email)     document.getElementById('ct-email').value = d.user.email;
  }).catch(() => {});

  async function enviarContacto(e) {
    e.preventDefault();
    const nome     = document.getElementById('ct-nome').value.trim();
    const email    = document.getElementById('ct-email').value.trim();
    const assunto  = document.getElementById('ct-assunto').value;
    const mensagem = document.getElementById('ct-mensagem').value.trim();

    if (!nome || !email) { toast('Preenche o nome e o email.', 'warning'); return; }
    if (!mensagem)       { toast('Escreve uma mensagem.', 'warning'); return; }

    const btn = e.target;
    btnLoad(btn, true, 'A enviar...');

    try {
      const res  = await fetch('../backend/contact.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nome, email, assunto, mensagem })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('contacto-form').style.display    = 'none';
        document.getElementById('contacto-sucesso').style.display = 'flex';
      } else {
        toast(data.message || 'Erro ao enviar. Tenta novamente.', 'danger');
        btnLoad(btn, false);
      }
    } catch {
      toast('Erro de ligação. Verifica a tua internet e tenta novamente.', 'danger');
      btnLoad(btn, false);
    }
  }
