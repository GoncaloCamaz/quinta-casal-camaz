const tour = document.querySelector('.tour');
const slides = Array.from(tour.querySelectorAll('.slide'));
const progress = tour.querySelector('.progress');
const chapterLabel = tour.querySelector('.tour-chapter');
const pauseButton = tour.querySelector('.pause-toggle');
const backdrop = document.querySelector('.backdrop');
const closeLink = tour.querySelector('.tour-controls a.icon-button');
const HOLD_MS = 220;
const SWIPE_PX = 50;
const CLOSE_PX = 120;
const TEXT = document.documentElement.lang.startsWith('en')
  ? { of: 'of', pause: 'Pause the tour', resume: 'Resume the tour' }
  : { of: 'de', pause: 'Pausar a visita', resume: 'Retomar a visita' };

let current = -1;
let userPaused = false;

const segments = slides.map(() => {
  const seg = document.createElement('div');
  seg.className = 'progress-seg';
  seg.innerHTML = '<div class="progress-fill"></div>';
  progress.appendChild(seg);
  return seg;
});

slides.forEach((slide, i) => {
  if (!slide.hasAttribute('data-final')) slide.setAttribute('aria-label', `${i + 1} ${TEXT.of} ${slides.length - 1}`);
});

// Only the current photo and the next two are fetched, the rest wait their turn
const load = index => {
  const img = slides[index]?.querySelector('.media');
  if (!img || img.src) return img;
  img.decoding = 'async';
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
  img.src = img.dataset.src;
  return img;
};

const restart = el => {
  el.classList.remove('is-current');
  void el.offsetWidth;
  el.classList.add('is-current');
};

const syncPaused = () => {
  const paused = userPaused || tour.classList.contains('is-holding');
  tour.classList.toggle('is-paused', paused);
  pauseButton.setAttribute('aria-pressed', String(userPaused));
  pauseButton.setAttribute('aria-label', userPaused ? TEXT.resume : TEXT.pause);
};

const go = index => {
  if (index < 0) index = 0;
  if (index >= slides.length) return;
  const isFinal = slides[index].hasAttribute('data-final');

  slides.forEach((slide, i) => {
    const active = i === index;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', String(!active));
    slide.inert = !active;
  });

  segments.forEach((seg, i) => {
    seg.classList.toggle('is-done', i < index || (isFinal && i === index));
    seg.classList.remove('is-current');
  });
  if (!isFinal) restart(segments[index]);

  // Restart the photo and copy animations even when revisiting a slide
  const slide = slides[index];
  slide.classList.remove('is-active');
  void slide.offsetWidth;
  slide.classList.add('is-active');

  tour.classList.toggle('is-final', isFinal);
  chapterLabel.textContent = slide.dataset.chapter;

  const img = load(index);
  load(index + 1);
  load(index + 2);

  // Hold the progress bar until the photo is on screen
  if (img && !img.complete) {
    tour.classList.add('is-waiting');
    const ready = () => tour.classList.remove('is-waiting');
    img.addEventListener('load', ready, { once: true });
    img.addEventListener('error', ready, { once: true });
  } else {
    tour.classList.remove('is-waiting');
  }

  if (backdrop && img) backdrop.style.backgroundImage = `url("${img.dataset.src}")`;
  current = index;
};

const next = () => go(current + 1);
const prev = () => go(current - 1);

progress.addEventListener('animationend', event => {
  if (event.target.closest('.progress-seg') === segments[current]) next();
});

// Tap left or right to move, press and hold to pause, swipe sideways to move too
let pointer = null;

tour.querySelectorAll('.tap-zone').forEach(zone => {
  const dir = zone.classList.contains('tap-prev') ? -1 : 1;

  zone.addEventListener('pointerdown', event => {
    pointer = { x: event.clientX, y: event.clientY, held: false };
    pointer.timer = setTimeout(() => {
      pointer.held = true;
      tour.classList.add('is-holding');
      syncPaused();
    }, HOLD_MS);
  });

  zone.addEventListener('pointerup', event => {
    if (!pointer) return;
    clearTimeout(pointer.timer);
    if (drag?.active) {
      pointer = null;
      return;
    }
    const dx = event.clientX - pointer.x;
    const wasHeld = pointer.held;
    pointer = null;
    tour.classList.remove('is-holding');
    syncPaused();
    tour.classList.add('has-interacted');
    if (Math.abs(dx) > SWIPE_PX) return dx < 0 ? next() : prev();
    if (!wasHeld) dir < 0 ? prev() : next();
  });

  zone.addEventListener('pointercancel', () => {
    if (!pointer) return;
    clearTimeout(pointer.timer);
    pointer = null;
    tour.classList.remove('is-holding');
    syncPaused();
  });

  // Keyboard and screen reader activation arrive as a click with no pointer
  zone.addEventListener('click', event => {
    if (event.detail === 0) dir < 0 ? prev() : next();
  });

  zone.addEventListener('contextmenu', event => event.preventDefault());
});

// The final slide has no tap zones, so a swipe right still goes back
let finalStart = null;
const finalSlide = slides.at(-1);
finalSlide.addEventListener('pointerdown', event => { finalStart = event.clientX; });
finalSlide.addEventListener('pointerup', event => {
  if (drag?.active) finalStart = null;
  if (finalStart !== null && event.clientX - finalStart > SWIPE_PX * 1.5) prev();
  finalStart = null;
});

// Drag down to close, like dismissing a story
let drag = null;

const resetDrag = () => {
  tour.classList.remove('is-dragging', 'is-holding');
  tour.style.transform = '';
  tour.style.opacity = '';
  syncPaused();
};

tour.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.target.closest('.tour-top')) return;
  drag = { x: event.clientX, y: event.clientY, t: event.timeStamp, active: false };
});

tour.addEventListener('pointermove', event => {
  if (!drag || !event.isPrimary) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.active) {
    if (Math.abs(dx) > 12 && Math.abs(dx) > dy) drag = null;
    if (!drag || dy < 12) return;
    drag.active = true;
    tour.classList.add('is-dragging', 'is-holding');
    syncPaused();
  }
  const pull = Math.max(0, dy);
  tour.style.transform = `translateY(${pull}px) scale(${1 - Math.min(pull, 400) / 4000})`;
  tour.style.opacity = String(1 - Math.min(pull, 400) / 1000);
});

tour.addEventListener('pointerup', event => {
  if (!drag) return;
  const { active, y, t } = drag;
  drag = null;
  if (!active) return;
  const dy = event.clientY - y;
  const flick = dy > SWIPE_PX && event.timeStamp - t < 250;
  if (dy > CLOSE_PX || flick) {
    tour.classList.add('is-closing');
    tour.style.transform = 'translateY(100%)';
    tour.style.opacity = '0';
    location.href = closeLink.href;
  } else {
    resetDrag();
  }
  // A drag that ends on a button or link must not also press it
  const swallow = clickEvent => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
  };
  tour.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => tour.removeEventListener('click', swallow, { capture: true }), 400);
});

tour.addEventListener('pointercancel', () => {
  if (drag?.active) resetDrag();
  drag = null;
});

// Coming back with the browser's back button restores the page as it was left
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  tour.classList.remove('is-closing');
  resetDrag();
});

pauseButton.addEventListener('click', () => {
  userPaused = !userPaused;
  syncPaused();
});

tour.querySelector('.replay').addEventListener('click', () => go(0));

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') next();
  else if (event.key === 'ArrowLeft') prev();
  else if (event.key === ' ' && !event.target.closest('a, button')) {
    event.preventDefault();
    pauseButton.click();
  } else return;
  tour.classList.add('has-interacted');
});

document.addEventListener('visibilitychange', () => {
  tour.classList.toggle('is-holding', document.hidden);
  syncPaused();
});

go(0);
