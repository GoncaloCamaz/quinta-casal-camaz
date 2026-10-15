const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxCredit = lightbox.querySelector('.lightbox-credit');
const lightboxCreditLink = lightbox.querySelector('.lightbox-credit-link');

document.querySelector('#year').textContent = new Date().getFullYear();

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
let galleryIndex = 0;

const showGalleryItem = index => {
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const button = galleryItems[galleryIndex];
  const thumb = button.querySelector('img');
  // the thumbnail may be a small srcset candidate, so always open the full-size image
  lightboxImage.src = button.dataset.image;
  lightboxImage.alt = thumb.alt;
  lightboxCredit.hidden = !button.dataset.credit;
  lightboxCreditLink.textContent = button.dataset.credit || '';
  if (button.dataset.creditUrl) {
    lightboxCreditLink.href = button.dataset.creditUrl;
  } else {
    lightboxCreditLink.removeAttribute('href');
  }
};

galleryItems.forEach((button, index) => {
  button.addEventListener('click', () => {
    showGalleryItem(index);
    lightbox.showModal();
  });
});

lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showGalleryItem(galleryIndex - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showGalleryItem(galleryIndex + 1));

lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showGalleryItem(galleryIndex - 1);
  if (event.key === 'ArrowRight') showGalleryItem(galleryIndex + 1);
});

let swipeStartX = 0;
let swipeStartY = 0;
let swiped = false;

lightbox.addEventListener('pointerdown', event => {
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swiped = false;
});

lightbox.addEventListener('pointerup', event => {
  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;
  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
    swiped = true;
    showGalleryItem(galleryIndex + (deltaX < 0 ? 1 : -1));
  }
});

lightboxImage.addEventListener('dragstart', event => event.preventDefault());

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  // a swipe that ends on the backdrop must not close the lightbox
  if (swiped) {
    swiped = false;
    return;
  }
  if (event.target === lightbox) lightbox.close();
});

document.querySelectorAll('.faq-question').forEach(button => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const open = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      if (openItem !== item) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      }
    });

    item.classList.toggle('open', !open);
    button.setAttribute('aria-expanded', String(!open));
  });
});

const mapPin = document.querySelector('.map-pin');
const mapCard = document.querySelector('.map-card');

if (mapPin && mapCard) {
  const setMapCard = open => {
    mapCard.hidden = !open;
    mapPin.setAttribute('aria-expanded', String(open));
  };

  mapPin.addEventListener('click', () => setMapCard(mapCard.hidden));
  document.addEventListener('click', event => {
    if (!mapCard.hidden && !mapCard.contains(event.target) && event.target !== mapPin) setMapCard(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mapCard.hidden) {
      setMapCard(false);
      mapPin.focus();
    }
  });
}

document.querySelectorAll('a[href="#topo"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.carousel-track');
  const slides = Array.from(carousel.querySelectorAll('.carousel-track img'));
  const dots = Array.from(carousel.querySelectorAll('.carousel-dots button'));
  const prevButton = carousel.querySelector('.carousel-arrow-prev');
  const nextButton = carousel.querySelector('.carousel-arrow-next');
  const caption = carousel.querySelector('.carousel-caption');
  const captionIndex = carousel.querySelector('.carousel-caption-index');
  const captionText = carousel.querySelector('.carousel-caption-text');
  if (slides.length < 2) return;

  let current = 0;
  let captionTimer = null;

  // Decoding a large photo on first paint can block the main thread for hundreds of ms (bad INP),
  // so decode the target slide off the critical path before making it visible.
  const decodeSlide = slide => (slide.decode ? slide.decode().catch(() => {}) : Promise.resolve());

  const goTo = index => {
    current = (index + slides.length) % slides.length;
    const target = current;
    decodeSlide(slides[target]).then(() => {
      if (target !== current) return;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === target));
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-selected', String(i === current));
    });

    if (caption && slides[current].dataset.caption) {
      clearTimeout(captionTimer);
      caption.style.opacity = 0;
      captionTimer = setTimeout(() => {
        captionIndex.textContent = String(current + 1).padStart(2, '0');
        captionText.textContent = slides[current].dataset.caption;
        caption.style.opacity = 1;
      }, 250);
    }
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  prevButton?.addEventListener('click', () => goTo(current - 1));
  nextButton?.addEventListener('click', () => goTo(current + 1));

  let dragStartX = 0;
  let dragStartY = 0;
  let dragging = false;

  track.addEventListener('pointerdown', event => {
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragging = true;
    track.setPointerCapture?.(event.pointerId);
  });

  track.addEventListener('pointerup', event => {
    if (!dragging) return;
    dragging = false;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goTo(current + (deltaX < 0 ? 1 : -1));
    }
  });

  // Native image drag-and-drop would cancel the pointer and swallow mouse swipes on desktop
  track.addEventListener('dragstart', event => event.preventDefault());

  const endDrag = () => {
    dragging = false;
  };

  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);

  goTo(0);

  const preloadObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    preloadObserver.disconnect();
    slides.forEach(slide => {
      slide.loading = 'eager';
      decodeSlide(slide);
    });
  }, { rootMargin: '400px 0px' });

  preloadObserver.observe(carousel);
});

const whatsappFloat = document.querySelector('.whatsapp-float');

if (whatsappFloat) {
  // Only show the floating button between the hero and the contact section, where it isn't redundant
  const blockers = ['.hero', '#contactos', 'footer'].map(selector => document.querySelector(selector)).filter(Boolean);
  const inView = new Set();

  const floatObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)));
    whatsappFloat.classList.toggle('is-visible', inView.size === 0);
  });

  blockers.forEach(el => floatObserver.observe(el));
}

const experienceSection = document.querySelector('#experience-section');
const experienceWheel = document.querySelector('[data-experience-wheel]');

if (experienceSection && experienceWheel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const cards = Array.from(experienceWheel.querySelectorAll('.experience-card'));
  const stepAngle = 360 / cards.length;
  const maxAngle = (cards.length - 1) * stepAngle;
  const mobileQuery = window.matchMedia('(max-width: 680px)');
  // Where supported, the phone layout is animated by CSS scroll-driven animations (see styles.css),
  // which run off the main thread. JS on every scroll frame lagged behind the finger on phones.
  const cssTimeline = window.CSS?.supports?.('animation-timeline: --a') && CSS.supports('animation-range: contain 0% contain 100%');
  const stage = experienceSection.querySelector('.experience-stage');

  experienceSection.style.setProperty('--experience-cards', cards.length);
  experienceSection.classList.add('has-carousel');
  experienceWheel.classList.add('wheel-active');

  let radius = 190;
  let useCss = false;
  let ticking = false;
  let sectionTop = 0;
  let scrollable = 0;
  let lastProgress = -1;
  const lastZ = [];

  // Measure once instead of on every frame. The stage height (100vh) stays fixed while the
  // mobile address bar shows and hides, unlike window.innerHeight, so the cards don't jump.
  const measure = () => {
    sectionTop = experienceSection.getBoundingClientRect().top + window.scrollY;
    scrollable = experienceSection.offsetHeight - stage.offsetHeight;
  };

  const place = (card, i, transform, opacity, z) => {
    card.style.transform = transform;
    card.style.opacity = opacity;
    if (lastZ[i] !== z) {
      lastZ[i] = z;
      card.style.zIndex = z;
    }
  };

  const renderCircular = angle => {
    cards.forEach((card, i) => {
      const rad = ((i * stepAngle - angle) * Math.PI) / 180;
      const x = Math.sin(rad) * radius * 1.3;
      const y = Math.cos(rad) * radius;
      const focus = (Math.cos(rad) + 1) / 2;
      place(card, i, `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${0.7 + focus * 0.3})`, 0.32 + focus * 0.68, Math.round(focus * 10));
    });
  };

  // Keep in sync with the generated @keyframes experience-card-* in styles.css
  const renderVertical = progress => {
    const spacing = 130;
    const falloffRange = 1.6;
    const virtualIndex = progress * (cards.length - 1);

    cards.forEach((card, i) => {
      const relativeStep = i - virtualIndex;
      const focus = Math.max(0, 1 - Math.abs(relativeStep) / falloffRange);
      place(card, i, `translate(-50%, -50%) translate(0px, ${relativeStep * spacing}px) scale(${0.72 + focus * 0.34})`, focus, Math.round(focus * 10));
    });
  };

  const renderWheel = (force = false) => {
    ticking = false;
    if (useCss) return;
    const progress = scrollable > 0
      ? Math.min(1, Math.max(0, (window.scrollY - sectionTop) / scrollable))
      : 0;

    // Outside the section the progress is pinned at 0 or 1, so there's nothing to redraw
    if (progress === lastProgress && !force) return;
    lastProgress = progress;

    if (mobileQuery.matches) {
      renderVertical(progress);
    } else {
      renderCircular(progress * maxAngle);
    }
  };

  const setMode = () => {
    radius = mobileQuery.matches ? 90 : 190;
    useCss = cssTimeline && mobileQuery.matches;
    experienceWheel.classList.toggle('wheel-css', useCss);
    if (useCss) {
      // inline styles from the JS renderer would fight the CSS animation
      cards.forEach(card => card.removeAttribute('style'));
      lastZ.length = 0;
    }
    lastProgress = -1;
  };

  window.addEventListener('scroll', () => {
    if (!useCss && !ticking) {
      ticking = true;
      requestAnimationFrame(() => renderWheel());
    }
  }, { passive: true });

  const refresh = () => {
    measure();
    renderWheel(true);
  };

  mobileQuery.addEventListener('change', () => {
    setMode();
    refresh();
  });

  // Content above the section can still shift it (fonts), so re-measure when the page resizes
  new ResizeObserver(refresh).observe(document.body);

  setMode();
  refresh();
}
