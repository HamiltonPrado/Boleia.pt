
(function () {
  let container = null;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: 'bi-check-circle-fill',
    danger:  'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill',
  };

  window.toast = function (msg, type = 'info', duration = 4500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="bi ${ICONS[type] || ICONS.info}" aria-hidden="true"></i><span>${msg}</span>`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    const dismiss = () => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 200);
    };
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    getContainer().appendChild(el);
    return el;
  };
})();

window.skeletonRows = function (rows = 4, widths) {
  const w = widths || [100, 80, 60, 90, 70, 50];
  const rowsHtml = Array.from({ length: rows }, () =>
    `<div class="skeleton-row">${
      w.map(px => `<div class="skeleton" style="height:13px;width:${px}px"></div>`).join('')
    }</div>`
  ).join('');
  return `<div class="skeleton-rows">${rowsHtml}</div>`;
};

window.btnLoad = function (btn, loading, label) {
  if (loading) {
    btn._html = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${label || 'A processar...'}`;
    btn.disabled = true;
    btn.classList.add('loading');
  } else {
    if (btn._html) btn.innerHTML = btn._html;
    btn.disabled = false;
    btn.classList.remove('loading');
  }
};

window.confirmar = function (msg, { titulo = 'Tens a certeza?', okLabel = 'Confirmar', okClass = 'btn-danger', cancelLabel = 'Cancelar' } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;backdrop-filter:blur(2px)';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:28px 28px 22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.18);font-family:'Plus Jakarta Sans','Inter',sans-serif;animation:cfm-in .15s ease">
        <p style="font-size:1rem;font-weight:700;color:#0F172A;margin:0 0 8px">${titulo}</p>
        <p style="font-size:0.875rem;color:#64748B;margin:0 0 22px;line-height:1.5">${msg}</p>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button id="cfm-cancel" style="padding:9px 20px;border-radius:99px;font-size:0.875rem;font-weight:500;border:1.5px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;font-family:inherit">${cancelLabel}</button>
          <button id="cfm-ok"     style="padding:9px 20px;border-radius:99px;font-size:0.875rem;font-weight:600;border:none;cursor:pointer;font-family:inherit" class="${okClass}">${okLabel}</button>
        </div>
      </div>`;

    if (!document.getElementById('cfm-style')) {
      const s = document.createElement('style');
      s.id = 'cfm-style';
      s.textContent = '@keyframes cfm-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}';
      document.head.appendChild(s);
    }

    const close = val => { overlay.remove(); resolve(val); };
    overlay.querySelector('#cfm-ok').onclick     = () => close(true);
    overlay.querySelector('#cfm-cancel').onclick = () => close(false);
    overlay.onclick = e => { if (e.target === overlay) close(false); };
    const onKey = e => { if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); } if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('#cfm-ok').focus();
  });
};

window.carregarBadgeReservas = async function () {
  try {
    const res  = await fetch('../backend/bookings/pending_count.php');
    if (!res.ok) return;
    const data = await res.json();
    const count = data.count || 0;
    if (count === 0) return;

    const badge = document.createElement('span');
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.cssText = [
      'display:inline-flex;align-items:center;justify-content:center',
      'min-width:18px;height:18px;border-radius:99px',
      'background:#DC2626;color:#fff',
      'font-size:0.65rem;font-weight:700;padding:0 5px',
      'margin-left:5px;line-height:1;font-family:inherit',
      'vertical-align:middle'
    ].join(';');

    document.querySelectorAll('.nav-item, .nav-links a').forEach(a => {
      const href = (a.getAttribute('href') || '');
      if (href.includes('reservas')) {
        if (!a.querySelector('[data-badge]')) {
          badge.setAttribute('data-badge', '1');
          a.appendChild(badge.cloneNode(true));
        }
      }
    });
  } catch {}
};

window.markNavActive = function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a[href]').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop().split('?')[0].split('#')[0];
    if (href && href === page) a.classList.add('nav-active');
  });
};

window.animateIn = function (selector, delayStep = 60) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.animationDelay = `${i * delayStep}ms`;
    el.classList.add('fade-up');
  });
};

document.addEventListener('DOMContentLoaded', () => {
  markNavActive();
  
  setTimeout(() => animateIn('h2, .stat-card, .hero, .filter-bar', 50), 10);
});
