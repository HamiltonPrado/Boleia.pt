  document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isCondutor = ['DRIVER','BOTH'].includes(radio.value);
      document.getElementById('carro-fields').classList.toggle('visible', isCondutor);
    });
  });

  async function registar(e) {
    e.preventDefault();
    const nome     = document.getElementById('nome').value.trim();
    const apelido  = document.getElementById('apelido').value.trim();
    const email    = document.getElementById('email').value.trim();
    const phone    = document.getElementById('telemovel').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.querySelector('input[name="role"]:checked').value;
    const erro     = document.getElementById('erro');
    erro.style.display = 'none';

    const payload = { full_name: nome + ' ' + apelido, email, phone, password, role };

    if (role === 'DRIVER' || role === 'BOTH') {
      payload.car_make  = document.getElementById('car_make').value.trim()  || null;
      payload.car_model = document.getElementById('car_model').value.trim() || null;
      payload.car_year  = parseInt(document.getElementById('car_year').value) || null;
      payload.car_plate = document.getElementById('car_plate').value.trim() || null;
    }

    const res  = await fetch('../backend/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      const r = data.user.role;
      window.location.href = r === 'ADMIN' ? 'admin.html'
        : (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html'
        : 'dashboard.html';
    } else {
      erro.textContent   = data.message;
      erro.style.display = 'flex';
    }
  }
