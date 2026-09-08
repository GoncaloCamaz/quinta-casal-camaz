const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');

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

document.querySelectorAll('.gallery-item').forEach(button => {
  button.addEventListener('click', () => {
    lightboxImage.src = button.dataset.image;
    lightbox.showModal();
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close();
});

document.querySelectorAll('a[href="#topo"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

const mapWrap = document.querySelector('.map-wrap');
if (mapWrap) {
  const mapPreconnectObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      ['https://www.google.com', 'https://maps.gstatic.com', 'https://maps.googleapis.com'].forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        document.head.appendChild(link);
      });
      mapPreconnectObserver.disconnect();
    });
  }, { rootMargin: '800px' });

  mapPreconnectObserver.observe(mapWrap);
}

document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.carousel-track');
  const slides = Array.from(carousel.querySelectorAll('.carousel-track img'));
  const dots = Array.from(carousel.querySelectorAll('.carousel-dots button'));
  const caption = carousel.querySelector('.carousel-caption');
  const captionIndex = carousel.querySelector('.carousel-caption-index');
  const captionText = carousel.querySelector('.carousel-caption-text');
  if (slides.length < 2) return;

  let current = 0;
  let timer = null;
  let captionTimer = null;

  const goTo = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
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

  const startAutoplay = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stopAutoplay();
    timer = setInterval(() => goTo(current + 1), 5000);
  };

  const stopAutoplay = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    goTo(i);
    startAutoplay();
  }));

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  let dragStartX = 0;
  let dragStartY = 0;
  let dragging = false;

  track.addEventListener('pointerdown', event => {
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragging = true;
  });

  track.addEventListener('pointerup', event => {
    if (!dragging) return;
    dragging = false;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goTo(current + (deltaX < 0 ? 1 : -1));
      startAutoplay();
    }
  });

  track.addEventListener('pointercancel', () => {
    dragging = false;
  });

  goTo(0);

  const visibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startAutoplay();
      } else {
        stopAutoplay();
      }
    });
  }, { threshold: 0.4 });

  visibilityObserver.observe(carousel);
});

const experienceSection = document.querySelector('#experience-section');
const experienceWheel = document.querySelector('[data-experience-wheel]');

if (experienceSection && experienceWheel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const cards = Array.from(experienceWheel.querySelectorAll('.experience-card'));
  const stepAngle = 360 / cards.length;
  const maxAngle = (cards.length - 1) * stepAngle;
  const mobileQuery = window.matchMedia('(max-width: 680px)');

  experienceSection.classList.add('has-carousel');
  experienceWheel.classList.add('wheel-active');

  let radius = mobileQuery.matches ? 90 : 190;
  let ticking = false;

  const renderCircular = angle => {
    cards.forEach((card, i) => {
      const cardAngle = i * stepAngle - angle;
      const rad = (cardAngle * Math.PI) / 180;
      const x = Math.sin(rad) * radius;
      const y = Math.cos(rad) * radius;
      const focus = (Math.cos(rad) + 1) / 2;
      const scale = 0.7 + focus * 0.3;
      const opacity = 0.32 + focus * 0.68;

      card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.zIndex = Math.round(focus * 10);
    });
  };

  const renderVertical = progress => {
    const spacing = 130;
    const falloffRange = 1.6;
    const virtualIndex = progress * (cards.length - 1);

    cards.forEach((card, i) => {
      const relativeStep = i - virtualIndex;
      const distance = Math.abs(relativeStep);
      const focus = Math.max(0, 1 - distance / falloffRange);
      const y = relativeStep * spacing;
      const scale = 0.72 + focus * 0.34;
      const opacity = 0 + focus * 0.88;

      card.style.transform = `translate(-50%, -50%) translate(0px, ${y}px) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.zIndex = Math.round(focus * 10);
    });
  };

  const renderWheel = () => {
    ticking = false;
    const scrollable = experienceSection.offsetHeight - window.innerHeight;
    const progress = scrollable > 0
      ? Math.min(1, Math.max(0, -experienceSection.getBoundingClientRect().top / scrollable))
      : 0;

    if (mobileQuery.matches) {
      renderVertical(progress);
    } else {
      renderCircular(progress * maxAngle);
    }
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(renderWheel);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    radius = mobileQuery.matches ? 90 : 190;
    renderWheel();
  });

  renderWheel();
}
