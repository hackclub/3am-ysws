const target = new Date('2026-08-24T23:59:59-05:00');
function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
        document.querySelector('.countdown').innerHTML = '<p>we\'re live 🌙</p>';
        return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('days').textContent    = String(d).padStart(2, '0');
    document.getElementById('hours').textContent   = String(h).padStart(2, '0');
    document.getElementById('minutes').textContent = String(m).padStart(2, '0');
    document.getElementById('seconds').textContent = String(s).padStart(2, '0');
}
tick();
setInterval(tick, 1000);

document.querySelectorAll('[data-faq').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

const owlFrames = ['assets/owl.png', 'assets/owl1.png'];
let owlFrame = 0;
const owlImg = document.querySelector('.owl');
setInterval(() => {
    owlFrame = (owlFrame + 1) % owlFrames.length;
    owlImg.src = owlFrames[owlFrame];
}, 500);