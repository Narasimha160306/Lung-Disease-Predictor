/* ==========================================================================
   LungCare Predictor — Client-side Interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initNavToggle();
  initFormSteps();
  initLoadingOverlay();
  initDataWidthFill();
  initScoreCircles();
  initCounters();
  initScrollReveal();
  initHistoryFilters();
  initFormValidation();
});

/* ---------- Mobile nav toggle ---------- */
function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    const isOpen = links.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---------- Multi-step form ---------- */
function initFormSteps() {
  const form = document.getElementById('predictForm');
  if (!form) return;

  const steps = form.querySelectorAll('.form-step');
  const nextButtons = form.querySelectorAll('[data-next]');
  const backButtons = form.querySelectorAll('[data-back]');

  nextButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = btn.getAttribute('data-next');
      if (!validateStep(form, btn.closest('.form-step'))) return;
      showStep(form, target, steps);
    });
  });

  backButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = btn.getAttribute('data-back');
      showStep(form, target, steps);
    });
  });
}

function showStep(form, nextId, steps) {
  steps.forEach(function (step) {
    step.style.display = step.id === 'step-' + nextId ? 'block' : 'none';
  });
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateStep(form, step) {
  if (!step) return true;
  const inputs = step.querySelectorAll('input[required]');
  let valid = true;
  inputs.forEach(function (input) {
    if (!input.value.trim()) {
      input.classList.add('invalid');
      valid = false;
    } else {
      input.classList.remove('invalid');
    }
  });
  return valid;
}

/* ---------- Loading overlay ---------- */
function initLoadingOverlay() {
  const form = document.getElementById('predictForm');
  const overlay = document.getElementById('loadingOverlay');
  if (!form || !overlay) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    animateLoading(overlay, function () {
      form.submit();
    });
  });
}

function animateLoading(overlay, onComplete) {
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  const fill = document.getElementById('loadingBarFill');
  const status = document.getElementById('loadingStatus');
  const messages = [
    'Encoding symptom features...',
    'Running Random Forest trees...',
    'Averaging class probabilities...',
    'Finalizing ML prediction...',
  ];

  let progress = 0;
  let msgIndex = 0;
  const duration = 2600;
  const steps = 60;
  let step = 0;

  const interval = setInterval(function () {
    step++;
    progress = (step / steps) * 100;
    if (fill) fill.style.width = progress + '%';

    if (status && step % Math.floor(steps / messages.length) === 0 && messages[msgIndex]) {
      status.textContent = messages[msgIndex];
      msgIndex++;
    }

    if (step >= steps) {
      clearInterval(interval);
      if (status) status.textContent = 'Complete!';
      setTimeout(onComplete, 300);
    }
  }, duration / steps);
}

/* ---------- Data-width fill (progress bars) ---------- */
function initDataWidthFill() {
  document.querySelectorAll('[data-width]').forEach(function (el) {
    const width = parseInt(el.getAttribute('data-width'), 10) || 0;
    // Force a reflow so the transition animates from 0
    requestAnimationFrame(function () {
      setTimeout(function () {
        el.style.width = width + '%';
      }, 80);
    });
  });
}

/* ---------- Score circles (conic-gradient) ---------- */
function initScoreCircles() {
  document.querySelectorAll('.score-circle[data-score]').forEach(function (circle) {
    const score = parseInt(circle.getAttribute('data-score'), 10) || 0;
    circle.style.setProperty('--deg', (score * 3.6) + 'deg');
  });
}

/* ---------- Count up stats ---------- */
function initCounters() {
  const counters = document.querySelectorAll('.stat-value[data-count]');
  if (!counters.length) return;

  counters.forEach(function (counter) {
    const target = parseInt(counter.getAttribute('data-count'), 10) || 0;
    counter.textContent = '0';

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCounter(counter, target);
        observer.unobserve(counter);
      });
    }, { threshold: 0.4 });

    observer.observe(counter);
  });

  function animateCounter(el, target) {
    let current = 0;
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(eased * target);
      el.textContent = current >= 100 ? '100k+' : current;
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }
}

/* ---------- Scroll reveal ---------- */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.feature-card, .stat-card, .about-feature, .detail-card, .hero-content');
  if (!revealEls.length) return;

  revealEls.forEach(function (el) {
    el.classList.add('reveal');
  });

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(function (el) {
    observer.observe(el);
  });
}

/* ---------- History filters ---------- */
function initHistoryFilters() {
  const filters = document.querySelectorAll('.filter-btn');
  const rows = document.querySelectorAll('#historyTable tbody tr[data-risk]');
  if (!filters.length || !rows.length) return;

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (f) { f.classList.remove('active'); });
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      rows.forEach(function (row) {
        const risk = row.getAttribute('data-risk');
        const show =
          filter === 'all' ||
          (filter === 'high' && (risk === 'high' || risk === 'very-high')) ||
          (filter === 'low' && (risk === 'low' || risk === 'moderate'));
        row.style.display = show ? '' : 'none';
      });
    });
  });
}

/* ---------- Form validation feedback ---------- */
function initFormValidation() {
  const form = document.getElementById('predictForm');
  if (!form) return;

  form.querySelectorAll('input[required]').forEach(function (input) {
    input.addEventListener('input', function () {
      input.classList.remove('invalid');
    });
  });
}
