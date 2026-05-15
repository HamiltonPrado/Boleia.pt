  async function entrar(e) {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const erroDiv  = document.getElementById('erro');
    const erroMsg  = document.getElementById('erro-msg');
    const btn      = document.getElementById('btn-entrar');

    erroDiv.style.display = 'none';
    btnLoad(btn, true, 'A entrar...');

    try {
      const res  = await fetch('../backend/auth/login.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        const r = data.user.role;
        window.location.href = r === 'ADMIN' ? 'admin.html'
          : (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html'
          : 'dashboard.html';
      } else {
        erroMsg.textContent = data.message;
        erroDiv.style.display = 'flex';
        btnLoad(btn, false);
      }
    } catch {
      erroMsg.textContent = 'Erro de ligação. Tenta novamente.';
      erroDiv.style.display = 'flex';
      btnLoad(btn, false);
    }
  }
