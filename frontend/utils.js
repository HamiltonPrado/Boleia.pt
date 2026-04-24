
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
