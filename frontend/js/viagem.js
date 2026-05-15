  let viagem   = null;
  let mapaObj  = null;
  let marcadores = {};
  let userId   = null;

  async function sair(e) {
    e.preventDefault();
    await fetch('../backend/auth/logout.php', { method: 'POST' });
    window.location.href = 'login.html';
  }

  async function init() {
    const me = await fetch('../backend/auth/me.php');
    if (!me.ok) { window.location.href = 'login.html'; return; }
    const { user } = await me.json();
    userId = user.id;
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
    carregarBadgeReservas();

    const ocId = new URLSearchParams(location.search).get('oc');
    if (ocId) {
      try {
        const r = await fetch(`../backend/routes/occurrence.php?id=${encodeURIComponent(ocId)}`);
        const d = await r.json();
        if (!d.success) {
          document.getElementById('conteudo').innerHTML =
            '<div class="empty-state"><i class="bi bi-x-circle"></i><p>Viagem não encontrada ou indisponível.</p><a href="pesquisa.html" class="btn-sm btn-info"><i class="bi bi-search"></i> Pesquisar viagens</a></div>';
          return;
        }
        viagem = d.viagem;
        if (viagem.stops && typeof viagem.stops === 'string') {
          try { viagem.stops = JSON.parse(viagem.stops); } catch { viagem.stops = []; }
        }
        if (!Array.isArray(viagem.stops)) viagem.stops = [];
      } catch (err) {
        document.getElementById('conteudo').innerHTML =
          '<div class="empty-state"><i class="bi bi-exclamation-circle"></i><p>Erro ao carregar a viagem. Tenta novamente.</p><a href="pesquisa.html" class="btn-sm btn-info"><i class="bi bi-search"></i> Pesquisar viagens</a></div>';
        return;
      }
    } else {
      document.getElementById('conteudo').innerHTML =
        '<div class="empty-state"><i class="bi bi-search"></i><p>Nenhuma viagem selecionada.</p><a href="pesquisa.html" class="btn-sm btn-info"><i class="bi bi-search"></i> Pesquisar viagens</a></div>';
      return;
    }

    const stops   = typeof viagem.stops === 'string' ? JSON.parse(viagem.stops) : (viagem.stops || []);
    const origem  = (stops[0]?.address || '—').split(',')[0].trim();
    const destino = (stops[stops.length - 1]?.address || '—').split(',')[0].trim();
    const livres  = viagem.total_seats - viagem.seats_taken;
    const rating  = viagem.avg_rating ? Number(viagem.avg_rating).toFixed(1) : null;
    const preco   = Number(viagem.price_per_seat);
    const eSouOCondutor = viagem.driver_id === userId;

    const driverInitials = (viagem.driver_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const driverAvatarHtml = viagem.avatar_url
      ? `<img src="../${esc(viagem.avatar_url)}" style="width:100%;height:100%;object-fit:cover">`
      : driverInitials;

    const paragens = stops.length > 2 ? `
      <div class="caixa" style="margin-bottom:0">
        <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin:0 0 10px"><i class="bi bi-geo-alt-fill" style="color:var(--primary)"></i> Paragens</p>
        ${stops.map((s,i) => `
          <div class="parem-row">
            <span class="parem-time">${i === 0 ? (viagem.depart_time?.slice(0,5)||'—') : '—'}</span>
            <span class="parem-dot" style="background:${i===0?'var(--success)':i===stops.length-1?'var(--primary)':'var(--border)'}"></span>
            <span class="parem-addr">${esc((s.label||s.address||'').split(',')[0].trim())}</span>
          </div>`).join('')}
      </div>` : '';

    document.getElementById('conteudo').innerHTML = `

      <div class="viagem-route-header">
        <div class="vrh-timeline">
          <span class="vrh-dot vrh-dot-green"></span>
          <span class="vrh-line"></span>
          <span class="vrh-dot vrh-dot-blue"></span>
        </div>
        <div class="vrh-cities">
          <div class="vrh-city">${esc(origem)}</div>
          <div class="vrh-city" style="color:var(--muted);font-weight:600">${esc(destino)}</div>
        </div>
        <div class="vrh-chips">
          <span class="vrh-chip"><i class="bi bi-calendar"></i> ${fmt(viagem.date)}</span>
          <span class="vrh-chip"><i class="bi bi-clock"></i> ${viagem.depart_time?.slice(0,5)||'—'}</span>
          <span class="vrh-chip-price vrh-chip"><i class="bi bi-people-fill"></i> ${livres} lugar${livres!==1?'es':''}</span>
        </div>
      </div>

      <div class="viagem-layout">

        <div style="display:flex;flex-direction:column;gap:14px">

          <div class="caixa">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
              <div style="width:50px;height:50px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:2px solid var(--border);font-size:0.85rem;font-weight:700;color:var(--primary)">
                ${driverAvatarHtml}
              </div>
              <div>
                <div style="font-weight:700;font-size:1rem;color:var(--dark)">${esc(viagem.driver_name)}</div>
                <div style="font-size:0.82rem;color:var(--muted)">
                  ${rating ? `<span style="color:var(--warning)">★ ${rating}</span> · ${viagem.total_trips||0} viagens` : 'Sem avaliações ainda'}
                </div>
              </div>
            </div>
            ${viagem.car_make ? `
            <div class="info-row" style="padding-top:0">
              <span class="info-row-label"><i class="bi bi-car-front-fill" style="margin-right:4px"></i> Veículo</span>
              <span class="info-row-value">${esc(viagem.car_make)} ${esc(viagem.car_model||'')} <span style="color:var(--muted);font-weight:400">${viagem.car_year||''}</span></span>
            </div>` : ''}
            <div class="info-row">
              <span class="info-row-label"><i class="bi bi-coin" style="margin-right:4px"></i> Preço por pessoa</span>
              <span class="info-row-value price-tag">${preco.toFixed(2)} <small>€</small></span>
            </div>
            ${viagem.notes ? `<div class="info-row"><span class="info-row-label">Notas</span><span class="info-row-value" style="font-size:0.82rem;font-style:italic;max-width:65%">${esc(viagem.notes)}</span></div>` : ''}
          </div>

          ${paragens}

          ${viagem.user_booking ? `
          <div class="seg-card">
            <div class="seg-card-header"><i class="bi bi-shield-fill-check"></i> Segurança</div>
            <div class="seg-btns">
              <button class="btn-seg-share" onclick="partilharDetalhes()">
                <i class="bi bi-share-fill"></i> Partilhar viagem
              </button>
              <a href="tel:112" class="btn-sos">
                <i class="bi bi-telephone-fill"></i> SOS 112
              </a>
            </div>
            <p class="seg-hint">
              <i class="bi bi-info-circle"></i>
              Partilha os detalhes da viagem com alguém de confiança antes de partir.
            </p>
          </div>` : ''}

          <div id="mapa" style="height:300px;border-radius:14px;overflow:hidden;border:1px solid var(--border);display:none"></div>
        </div>

        <div class="viagem-right">
          <div id="zona-reserva"></div>
          <div id="msg-reserva" style="display:none;margin-top:12px"></div>
        </div>
      </div>`;

    const zona = document.getElementById('zona-reserva');

    const bkAtiva = viagem.user_booking && !['CANCELLED_PASSENGER','CANCELLED_DRIVER'].includes(viagem.user_booking.status);
    const BK_LABEL = { PENDING:'Aguarda Confirmação', CONFIRMED:'Confirmada', COMPLETED:'Concluída', NO_SHOW:'Não compareceu' };
    const BK_CLASS = { PENDING:'badge-aguardar', CONFIRMED:'badge-confirmed', COMPLETED:'badge-completed', NO_SHOW:'badge-cancelled' };

    if (eSouOCondutor) {
      zona.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle-fill"></i> És o condutor desta viagem — não podes reservar o teu próprio trajeto.</div>';
    } else if (bkAtiva) {
      const bk = viagem.user_booking;
      zona.innerHTML = `
        <div class="caixa">
          <h3 style="margin:0 0 4px"><i class="bi bi-ticket-perforated-fill" style="color:var(--primary)"></i> A tua reserva</h3>
          <p style="font-size:0.8rem;color:var(--muted);margin-bottom:14px">Já tens uma reserva nesta viagem.</p>
          <span class="badge ${BK_CLASS[bk.status] || 'badge-archived'}">${BK_LABEL[bk.status] || bk.status}</span>
          ${bk.driver_note ? `<div style="margin-top:12px;font-size:0.82rem;color:var(--muted);font-style:italic"><i class="bi bi-chat-text"></i> "${esc(bk.driver_note)}"</div>` : ''}
          <div style="margin-top:16px">
            <a href="reservas.html" class="btn-sm btn-info"><i class="bi bi-ticket-perforated"></i> Ver reservas</a>
          </div>
        </div>`;
    } else if (livres === 0) {
      zona.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle-fill"></i> Sem lugares disponíveis nesta viagem.</div>';
    } else {
      const opcoesPickup = stops.slice(0, -1).map(s =>
        `<option value="${s.id}" data-order="${s.stop_order}">${esc(s.label || s.address)}</option>`
      ).join('');

      const opcoesDropoffInicial = stops.slice(1).map(s =>
        `<option value="${s.id}" data-order="${s.stop_order}">${esc(s.label || s.address)}</option>`
      ).join('');

      zona.innerHTML = `
        <div class="caixa">
          <h3 style="margin-top:0;margin-bottom:2px"><i class="bi bi-check-circle-fill" style="color:var(--primary)"></i> Reservar</h3>
          <p style="font-size:0.8rem;color:var(--muted);margin-bottom:14px">Pendente até o condutor confirmar.</p>

          <form onsubmit="reservar(event)">
            <div class="form-group">
              <label>Nº de lugares</label>
              <select id="num-lugares" onchange="atualizarTotal()">
                ${Array.from({length: Math.min(livres, 4)}, (_, i) =>
                  `<option value="${i+1}">${i+1}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Paragem de embarque</label>
              <select id="pickup" onchange="atualizarDropoffOpcoes(); destacarParagens()">
                ${opcoesPickup}
              </select>
            </div>
            <div class="form-group">
              <label>Paragem de desembarque</label>
              <select id="dropoff" onchange="atualizarTotal(); destacarParagens()">
                ${opcoesDropoffInicial}
              </select>
            </div>
            <div class="form-group">
              <label>Mensagem ao condutor (opcional)</label>
              <textarea id="mensagem" rows="3" placeholder="Ex: Vou com uma mala grande..." style="resize:vertical"></textarea>
            </div>

            <div class="summary-box">
              <div class="summary-row">
                <span style="color:var(--muted)">Preço por lugar</span>
                <span>${preco.toFixed(2)} €</span>
              </div>
              <div class="summary-row">
                <span style="color:var(--muted)">Taxa de serviço (10%)</span>
                <span id="taxa">—</span>
              </div>
              <div class="summary-row total">
                <span>Total</span>
                <span id="total" class="price-tag">—</span>
              </div>
            </div>

            <button type="submit" id="btn-reservar"><i class="bi bi-check-circle-fill"></i> Confirmar Reserva</button>
          </form>
        </div>`;

      document.getElementById('dropoff').selectedIndex = stops.length - 1;
      atualizarTotal();
    }

    const stopsComCoords = stops.filter(s => s.lat && s.lng && !(s.lat == 0 && s.lng == 0));
    if (stopsComCoords.length > 0) initMapa(stops);
  }

  function atualizarDropoffOpcoes() {
    const pickupSel   = document.getElementById('pickup');
    const pickupId    = pickupSel.value;
    const pickupOrder = parseInt(pickupSel.selectedOptions[0]?.dataset.order ?? 0);
    const stops       = typeof viagem.stops === 'string' ? JSON.parse(viagem.stops) : (viagem.stops || []);
    const valid       = stops.filter(s => s.stop_order > pickupOrder && s.id !== pickupId);
    const dropoffSel  = document.getElementById('dropoff');
    dropoffSel.innerHTML = valid.map(s =>
      `<option value="${s.id}" data-order="${s.stop_order}">${esc(s.label || s.address)}</option>`
    ).join('');
    dropoffSel.selectedIndex = valid.length - 1;
    atualizarTotal();
  }

  function atualizarTotal() {
    const pickup  = document.getElementById('pickup');
    const dropoff = document.getElementById('dropoff');
    const n       = parseInt(document.getElementById('num-lugares').value);
    const preco   = Number(viagem.price_per_seat);
    const btn     = document.getElementById('btn-reservar');

    if (pickup && dropoff && pickup.value === dropoff.value) {
      document.getElementById('taxa').textContent  = '—';
      document.getElementById('total').textContent = '⚠ Embarque e desembarque iguais';
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;

    const taxa  = (preco * n * 0.10).toFixed(2);
    const total = (preco * n * 1.10).toFixed(2);
    document.getElementById('taxa').textContent  = taxa + ' €';
    document.getElementById('total').textContent = total + ' €';
  }

  async function initMapa(stops) {
    document.getElementById('mapa').style.display = 'block';
    mapaObj = L.map('mapa').setView([39.5, -8.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapaObj);

    const validos = stops.filter(s => s.lat && s.lng && !(s.lat == 0 && s.lng == 0));
    if (validos.length === 0) return;

    const tipoLabel   = i => i === 0 ? 'Origem' : i === validos.length - 1 ? 'Destino' : 'Paragem';
    const pinClass    = i => i === 0 ? 'map-pin map-pin-origin' : i === validos.length - 1 ? 'map-pin map-pin-dest' : 'map-pin map-pin-stop';
    const latLngs     = [];

    validos.forEach((s, i) => {
      marcadores[s.id] = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: pinClass(i), html: '', iconSize: [14, 14], iconAnchor: [7, 7] })
      }).addTo(mapaObj).bindPopup(`<b>${tipoLabel(i)}</b><br>${esc(s.label || s.address)}`);
      latLngs.push([s.lat, s.lng]);
    });

    mapaObj.fitBounds(latLngs, { padding: [40, 40] });

    if (validos.length >= 2) {
      try {
        const coords = validos.map(s => `${s.lng},${s.lat}`).join(';');
        const res    = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          L.geoJSON(data.routes[0].geometry, {
            style: { color: '#2563EB', weight: 4, opacity: 0.85 }
          }).addTo(mapaObj);
        } else {
          L.polyline(latLngs, { color: '#2563EB', weight: 3, dashArray: '6 4' }).addTo(mapaObj);
        }
      } catch {
        L.polyline(latLngs, { color: '#2563EB', weight: 3, dashArray: '6 4' }).addTo(mapaObj);
      }
    }
  }

  function destacarParagens() {
    const pickupId  = document.getElementById('pickup')?.value;
    const dropoffId = document.getElementById('dropoff')?.value;
    if (pickupId  && marcadores[pickupId])  marcadores[pickupId].openPopup();
    if (dropoffId && marcadores[dropoffId]) marcadores[dropoffId].openPopup();
  }

  async function reservar(e) {
    e.preventDefault();
    const msg       = document.getElementById('msg-reserva');
    const pickupId  = document.getElementById('pickup').value;
    const dropoffId = document.getElementById('dropoff').value;

    if (!viagem?.occurrence_id) {
      toast('Erro: viagem inválida. Volta à pesquisa e tenta novamente.', 'danger');
      return;
    }
    if (!pickupId || !dropoffId) {
      toast('Seleciona as paragens de embarque e desembarque.', 'danger');
      return;
    }
    if (pickupId === dropoffId) {
      toast('A paragem de embarque e desembarque não podem ser iguais.', 'danger');
      return;
    }

    const btn = document.getElementById('btn-reservar');
    btnLoad(btn, true, 'A processar...');

    const payload = {
      occurrence_id:   viagem.occurrence_id,
      pickup_stop_id:  pickupId,
      dropoff_stop_id: dropoffId,
      seats_booked:    parseInt(document.getElementById('num-lugares').value),
      note_to_driver:  document.getElementById('mensagem').value.trim() || null
    };
    console.log('[reservar] payload:', payload);

    const res  = await fetch('../backend/bookings/index.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      const total = Number(data.total_amount).toFixed(2);
      msg.innerHTML = `<div class="alert alert-success">
        <i class="bi bi-check-circle-fill"></i>
        <div>Reserva criada! Total: <b>${total} €</b><br>
          <small>Aguarda confirmação do condutor. A redirecionar para as tuas reservas...</small>
        </div>
      </div>`;
      msg.style.display = 'block';
      btn.style.display = 'none';
      setTimeout(() => window.location.href = 'reservas.html', 3000);
    } else {
      toast(data.message || 'Erro ao criar reserva.', 'danger');
      btnLoad(btn, false);
    }
  }

  function ajustarNavCondutor(role) {
    document.getElementById('nav-brand').href          = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').href      = 'dashboard_condutor.html';
    document.getElementById('nav-dashboard').innerHTML = '<i class="bi bi-speedometer2"></i> Painel';
    if (role === 'DRIVER') {
      document.getElementById('nav-reservas').style.display = 'none';
    }
  }

  async function partilharDetalhes() {
    if (!viagem) return;
    const stops  = typeof viagem.stops === 'string' ? JSON.parse(viagem.stops) : (viagem.stops || []);
    const origem  = (stops[0]?.address || '—').split(',')[0].trim();
    const destino = (stops[stops.length-1]?.address || '—').split(',')[0].trim();
    const data    = viagem.date ? (() => { const [y,m,d] = viagem.date.split('-'); return `${d}/${m}/${y}`; })() : '—';
    const hora    = viagem.depart_time?.slice(0,5) || '—';
    const veiculo = viagem.car_make
      ? `${viagem.car_make} ${viagem.car_model || ''} ${viagem.car_year || ''}`.trim()
      : 'Não especificado';
    const link = `${location.origin}${location.pathname}?oc=${encodeURIComponent(viagem.occurrence_id || '')}`;

    const texto = `🚗 Vou de boleia — Boleia.pt\n\n` +
      `Condutor: ${viagem.driver_name || '—'}\n` +
      `Veículo: ${veiculo}\n` +
      `Rota: ${origem} → ${destino}\n` +
      `Data: ${data} às ${hora}\n\n` +
      `Ver detalhes: ${link}`;

    if (navigator.share) {
      try { await navigator.share({ title: 'Detalhes da minha boleia', text: texto }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(texto);
      toast('Detalhes copiados! Partilha com alguém de confiança.', 'success', 6000);
    } catch { prompt('Copia e envia a alguém de confiança:', texto); }
  }

  async function partilharViagem() {
    if (!viagem) return;
    const url = `${location.origin}${location.pathname}?oc=${encodeURIComponent(viagem.occurrence_id)}`;
    const stops = typeof viagem.stops === 'string' ? JSON.parse(viagem.stops) : (viagem.stops || []);
    const origem  = (stops[0]?.address || '').split(',')[0].trim();
    const destino = (stops[stops.length-1]?.address || '').split(',')[0].trim();
    const texto   = `${origem} → ${destino} · ${viagem.depart_time?.slice(0,5)} · ${Number(viagem.price_per_seat).toFixed(2)}€`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Boleia.pt — ${texto}`, url });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado para a área de transferência!', 'success');
    } catch {
      prompt('Copia este link:', url);
    }
  }

  function fmt(d) { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  init();
