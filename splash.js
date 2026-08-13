const images = [
    'assets/splash1.png',
    'assets/splash2.png',
    'assets/splash3.png',
    'assets/splash4.png',
    'assets/splash5.png',
    'assets/splash6.png',
    'assets/splash7.png',
];

const img = document.getElementById('splashImg');
const imgNext = document.getElementById('splashImgNext');
const label = document.getElementById('splashLabel');
const splash = document.getElementById('splash');
let current = 0;

function next() {
    current++;
    if (current < images.length) {
        imgNext.src = images[current];
        imgNext.style.opacity = 1;
        setTimeout(() => {
            img.src = images[current];
            imgNext.style.opacity = 0;
        }, 500);
    } else {
        clearInterval(interval);
        label.style.opacity = 1;
        setTimeout(() => {
            splash.style.transition = 'opacity 1s ease';
            splash.style.opacity = 0;
            setTimeout(() => {
                sessionStorage.setItem('splashSeen', '1');
                window.location.href = 'index.html';
            }, 1000);
        }, 1400);
    }
}

const interval = setInterval(next, 900);
