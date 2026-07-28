/* ===== NAVIGATION HELPER ===== */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* ===== NAV MENU ===== */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.querySelectorAll('#navLinks a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

/* ===== FAQ ACCORDION ===== */
document.querySelectorAll('[data-faq]').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ===== STAR CANVAS ===== */
(function initStars() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  let w, h, stars = [], mouse = { x: -9999, y: -9999 };

  function resize() {
    w = canvas.width = hero.clientWidth;
    h = canvas.height = hero.clientHeight;
    const count = Math.floor((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.68,
      r: Math.random() * 1.4 + 0.4,
      baseA: Math.random() * 0.5 + 0.25,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.006
    }));
  }
  window.addEventListener('resize', resize);
  resize();

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function render(t) {
    ctx.clearRect(0, 0, w, h);
    stars.forEach(s => {
      const a = s.baseA + Math.sin(t * s.speed + s.phase) * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,235,245,${Math.max(0, a)})`;
      ctx.fill();
    });

    const near = stars.filter(s => Math.hypot(s.x - mouse.x, s.y - mouse.y) < 140);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
        if (d < 130) {
          ctx.beginPath();
          ctx.moveTo(near[i].x, near[i].y);
          ctx.lineTo(near[j].x, near[j].y);
          ctx.strokeStyle = `rgba(139,124,246,${0.35 * (1 - d / 130)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();

/* ===== FOG LAYER ===== */
(function buildFog() {
  const layer = document.getElementById('fogLayer');
  if (!layer) return;
  const clouds = [
    { w:600, h:170, l:'-10%', b:'0', fd:'22s', fdelay:'0s', fx:'50px', fo:'0.4' },
    { w:500, h:140, l:'20%',  b:'8px', fd:'26s', fdelay:'-8s', fx:'-40px', fo:'0.32' },
    { w:700, h:190, l:'50%',  b:'0', fd:'19s', fdelay:'-5s', fx:'60px', fo:'0.42' }
  ];
  clouds.forEach(c => {
    const el = document.createElement('div');
    el.className = 'fog-cloud';
    el.style.cssText = `width:${c.w}px;height:${c.h}px;left:${c.l};bottom:${c.b};--fd:${c.fd};--fdelay:${c.fdelay};--fx:${c.fx};--fo:${c.fo};`;
    layer.appendChild(el);
  });
})();

/* ===== TYPING EFFECT ===== */
const phrases = ['You ship. We ship. After dark.', 'Build at night. Claim your reward.', 'Quiet hours, real projects.'];
let pi = 0, ci = 0, deleting = false;
const heroSub = document.getElementById('heroSub');

function typeLoop() {
  if (!heroSub) return;
  const cur = phrases[pi];
  if (!deleting) {
    heroSub.textContent = cur.slice(0, ++ci);
    if (ci === cur.length) { deleting = true; setTimeout(typeLoop, 2600); return; }
  } else {
    heroSub.textContent = cur.slice(0, --ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
  }
  setTimeout(typeLoop, deleting ? 38 : 68);
}
setTimeout(typeLoop, 900);

/* ===== MOON PHASE ON SCROLL ===== */
const moonShadow = document.getElementById('moonShadow');
function updateMoonPhase() {
  if (!moonShadow) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  moonShadow.style.transform = `translateX(${10 + pct * 150}%)`;
}
document.addEventListener('scroll', updateMoonPhase, { passive: true });

/* ===== SESSION TIMER + SLIDER ===== */
const clockEl = document.getElementById('timerClock');
const startBtn = document.getElementById('timerStart');
const resetBtn = document.getElementById('timerReset');
const slider = document.getElementById('hoursSlider');
const hoursLabel = document.getElementById('hoursLabel');
const unlockedMsg = document.getElementById('unlockedMsg');
const rewardCards = Array.from(document.querySelectorAll('.reward-card'));

let elapsedMs = 0, timerId = null, running = false, syncToTimer = true;

function formatClock(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}<span>:</span>${mm}<span>:</span>${ss}`;
}

function applyHours(hrs) {
  if (hoursLabel) hoursLabel.textContent = `${hrs} hrs`;
  let unlockedCount = 0;
  rewardCards.forEach(card => {
    const need = parseFloat(card.dataset.hours);
    const on = hrs >= need;
    card.classList.toggle('unlocked', on);
    if (on) unlockedCount++;
  });
  if (unlockedMsg) {
    unlockedMsg.textContent = unlockedCount === 0
      ? 'Log a bit more time to start unlocking rewards.'
      : `${unlockedCount} of ${rewardCards.length} rewards unlocked at this pace.`;
  }
}

if (startBtn) {
  startBtn.addEventListener('click', () => {
    running = !running;
    if (running) {
      timerId = setInterval(() => {
        elapsedMs += 1000;
        if (clockEl) clockEl.innerHTML = formatClock(elapsedMs);
        if (syncToTimer && slider) {
          const hrs = Math.round((elapsedMs / 3600000) * 2) / 2;
          slider.value = Math.min(35, hrs);
          applyHours(parseFloat(slider.value));
        }
      }, 1000);
      startBtn.innerHTML = '<svg class="icon"><use href="#i-pause"/></svg>Pause';
    } else {
      clearInterval(timerId);
      startBtn.innerHTML = '<svg class="icon"><use href="#i-play"/></svg>Resume';
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    clearInterval(timerId); running = false; elapsedMs = 0; syncToTimer = true;
    if (clockEl) clockEl.innerHTML = formatClock(0);
    if (startBtn) startBtn.innerHTML = '<svg class="icon"><use href="#i-play"/></svg>Start';
    if (slider) slider.value = 0;
    applyHours(0);
  });
}

if (slider) {
  slider.addEventListener('input', () => {
    syncToTimer = false;
    applyHours(parseFloat(slider.value));
  });
}

/* ===== SPARK TRAIL ===== */
document.addEventListener('mousemove', e => {
  if (Math.random() > 0.4) return;
  const dot = document.createElement('div');
  dot.className = 'trail-dot';
  dot.style.left = e.clientX + 'px';
  dot.style.top = e.clientY + 'px';
  document.body.appendChild(dot);
  setTimeout(() => {
    dot.style.transition = 'opacity 0.3s';
    dot.style.opacity = '0';
    setTimeout(() => dot.remove(), 300);
  }, 150);
});

/* ===== BAT ANIMATION ===== */
const batTpl = document.getElementById('batTpl');
let batBusy = false;

function spawnBat() {
  if (batBusy || !batTpl) return;
  batBusy = true;
  const bat = batTpl.content.cloneNode(true).querySelector('.bat');
  bat.style.top = `${10 + Math.random() * 40}vh`;
  const goRight = Math.random() < 0.5;
  const dur = 6 + Math.random() * 3;
  bat.style.animation = `${goRight ? 'batRight' : 'batLeft'} ${dur}s ease-in-out forwards`;
  document.body.appendChild(bat);
  setTimeout(() => { bat.remove(); batBusy = false; }, dur * 1000);
}
setInterval(spawnBat, 15000);
