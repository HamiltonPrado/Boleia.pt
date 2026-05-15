fetch('../backend/auth/me.php').then(r => r.json()).then(d => {
  if (d.user) {
    const r = d.user.role;
    location.replace(r === 'ADMIN' ? 'admin.html'
      : (r === 'DRIVER' || r === 'BOTH') ? 'dashboard_condutor.html'
      : 'dashboard.html');
  }
}).catch(() => {});

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  const hoje = new Date().toISOString().slice(0,10);
  const aman = new Date(Date.now()+86400000).toISOString().slice(0,10);
  if (d === hoje) return 'Hoje';
  if (d === aman) return 'Amanhã';
  return `${parseInt(dd)} ${MESES[parseInt(m)-1]}`;
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const DEMO_ROUTES = [
  { driver_name:'Paulo Almeida',  avg_rating:'4.8', total_trips:32, price_per_seat:'14', depart_time:'08:30', origem:'Lisboa', destino:'Porto',  total_seats:4, seats_taken:1, date:null },
  { driver_name:'Ana Silva',      avg_rating:'4.6', total_trips:18, price_per_seat:'6',  depart_time:'07:15', origem:'Porto',  destino:'Braga',  total_seats:3, seats_taken:1, date:null },
  { driver_name:'Miguel Costa',   avg_rating:'4.9', total_trips:54, price_per_seat:'8',  depart_time:'07:45', origem:'Setúbal',destino:'Lisboa', total_seats:4, seats_taken:0, date:null },
  { driver_name:'Sofia Martins',  avg_rating:'4.7', total_trips:21, price_per_seat:'22', depart_time:'06:00', origem:'Faro',   destino:'Lisboa', total_seats:2, seats_taken:1, date:null },
  { driver_name:'Pedro Alves',    avg_rating:'4.5', total_trips:11, price_per_seat:'10', depart_time:'09:00', origem:'Coimbra',destino:'Lisboa', total_seats:3, seats_taken:0, date:null },
  { driver_name:'Erica Silva',    avg_rating:'5.0', total_trips:8,  price_per_seat:'18', depart_time:'10:30', origem:'Braga',  destino:'Porto',  total_seats:2, seats_taken:1, date:null },
];

function renderCard(v, isDemo) {
  const livres   = Number(v.total_seats) - Number(v.seats_taken);
  const rating   = v.avg_rating ? Number(v.avg_rating).toFixed(1) : null;
  const preco    = Math.round(Number(v.price_per_seat));
  const initials = (v.driver_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const avHtml   = v.avatar_url
    ? `<img src="../${esc(v.avatar_url)}" alt="">`
    : initials;
  const origem  = (v.origem||'—').split(',')[0].trim();
  const destino = (v.destino||'—').split(',')[0].trim();

  const urgency = livres <= 1
    ? `<span class="badge badge-hot" style="font-size:0.68rem;padding:2px 8px;margin-left:6px"><i class="bi bi-lightning-charge-fill"></i> Última vaga</span>`
    : '';

  return `<div class="rc" onclick="location.href='${isDemo ? 'registo.html' : 'login.html'}'">
    <div class="rc-top">
      <div class="rc-driver">
        <div class="rc-av">${avHtml}</div>
        <div>
          <div class="rc-dname">${esc(v.driver_name)}</div>
          ${rating ? `<div class="rc-rating">★ ${rating} <span style="color:var(--muted);font-weight:400">(${v.total_trips||0})</span></div>` : ''}
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
        <div class="rc-addr" style="color:var(--muted);font-weight:600">${esc(destino)}</div>
      </div>
    </div>
    <div class="rc-foot">
      <span class="rc-seats"><i class="bi bi-check-circle-fill"></i> ${livres} lugar${livres!==1?'es':''}${urgency}</span>
      ${v.date ? `<span class="rc-date">${fmtDate(v.date)}</span>` : ''}
    </div>
  </div>`;
}

async function carregarViagens() {
  const div = document.getElementById('tabela-viagens');
  div.innerHTML = `<div class="rc-grid">${[1,2,3,4,5,6].map(() => `
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
    const res  = await fetch('../backend/routes/upcoming.php?limit=6');
    const data = await res.json();
    const routes = data.routes || [];

    if (routes.length > 0) {
      div.innerHTML = `<div class="rc-grid">${routes.map(v => renderCard(v, false)).join('')}</div>`;
    } else {
      div.innerHTML = `<div class="rc-grid">${DEMO_ROUTES.map(v => renderCard(v, true)).join('')}</div>`;
    }
  } catch {
    div.innerHTML = `<div class="rc-grid">${DEMO_ROUTES.map(v => renderCard(v, true)).join('')}</div>`;
  }
}

function countUp(id, finalText, duration = 1400) {
  const el = document.getElementById(id);
  if (!el) return;
  const num    = parseInt(finalText.replace(/\./g, '').replace(/[^\d]/g, ''));
  const suffix = finalText.replace(/^[\d.,\s]+/, '').trim();
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * num).toLocaleString('pt-PT') + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function carregarStats() {
  const heroStats = document.querySelector('.hero-stats');
  if (!heroStats) return;
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      countUp('stat-viagens', '1.200+');
      countUp('stat-rotas',   '340+');
      countUp('stat-users',   '2.800+');
      obs.disconnect();
    }
  }, { threshold: 0.4 });
  obs.observe(heroStats);
}

function pesquisarFromHero() {
  const origem  = document.getElementById('origem').value.trim();
  const destino = document.getElementById('destino').value.trim();
  const date    = document.getElementById('data').value;
  let url = 'pesquisa.html';
  const params = [];
  if (origem)  params.push('origem='  + encodeURIComponent(origem));
  if (destino) params.push('destino=' + encodeURIComponent(destino));
  if (date)    params.push('data='    + date);
  if (params.length) url += '?' + params.join('&');
  location.href = url;
}

document.getElementById('data').value = new Date().toISOString().slice(0,10);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['origem','destino','data'].includes(e.target.id)) pesquisarFromHero();
});

carregarViagens();
carregarStats();

const _navbar = document.querySelector('.navbar');
if (_navbar) {
  window.addEventListener('scroll', () => {
    _navbar.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
}
