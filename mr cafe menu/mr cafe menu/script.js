// ============================================================
//  MR CAFÉ — Premium Digital Menu
//  script.js
// ============================================================

// ============================================================
//  SCROLL DIRECTION TRACKER
// ============================================================
let scrollDir  = 'down';
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  scrollDir   = window.scrollY > lastScrollY ? 'down' : 'up';
  lastScrollY = window.scrollY;

  // Glassy menu bar comes down from the top and stays floating when scrolling
  const catNav = document.querySelector('.cat-nav');
  if (catNav) {
    if (window.scrollY > 100) {
      if (!catNav.classList.contains('cat-nav-floating')) {
        catNav.classList.add('cat-nav-floating');
      }
    } else {
      catNav.classList.remove('cat-nav-floating');
    }
  }
}, { passive: true });



// ============================================================
//  HERO CARDS — 3D Circular Rolling Carousel
//  Moves in a continuous circle across desktop, tablet, and mobile.
//  Supports touch swipe, drag, click-to-center, and smooth auto-rotation.
// ============================================================
function setupHeroCards() {
  const track = document.getElementById('heroCardsTrack');
  const wrap  = document.querySelector('.hero-cards-wrap');
  if (!track) return;
  const cards = [...track.querySelectorAll('.hero-card')];
  const total = cards.length;
  let current = 0;
  let autoTimer = null;

  // ── Calculate 3D circular positions ───────────────────────
  function updateCards() {
    const vw = window.innerWidth;
    const isMobile = vw <= 600;

    // Responsive spread for three devices: Mobile (~165px), Tablet (~240px), Desktop (~320px)
    const spread = isMobile
      ? Math.min(185, Math.max(145, vw * 0.42))
      : vw <= 900
      ? Math.min(270, Math.max(210, vw * 0.34))
      : Math.min(350, Math.max(280, vw * 0.28));

    // Noticeably bigger scale for the showing/active video shape vs others
    const centerScale = isMobile ? 1.15 : 1.22;
    const sideScale   = isMobile ? 0.68 : 0.70;

    cards.forEach((card, i) => {
      // Circular difference (-1, 0, 1)
      let diff = (i - current) % total;
      if (diff < -1) diff += total;
      if (diff > 1)  diff -= total;

      if (diff === 0) {
        // Active Center Video Shape — BIGGER than the other shapes
        card.style.transform  = `translateX(calc(-50% + 0px)) translateY(-50%) translateZ(65px) rotateY(0deg) scale(${centerScale})`;
        card.style.filter     = `blur(0px) brightness(1.08)`;
        card.style.opacity    = `1`;
        card.style.zIndex     = `15`;
        card.classList.add('active');
      } else if (diff === 1) {
        // Right Card (smaller, curved back along the circle)
        card.style.transform  = `translateX(calc(-50% + ${spread}px)) translateY(-50%) translateZ(-90px) rotateY(-34deg) scale(${sideScale})`;
        card.style.filter     = `blur(2.5px) brightness(0.50)`;
        card.style.opacity    = `0.60`;
        card.style.zIndex     = `3`;
        card.classList.remove('active');
      } else {
        // Left Card (smaller, curved back along the circle)
        card.style.transform  = `translateX(calc(-50% - ${spread}px)) translateY(-50%) translateZ(-90px) rotateY(34deg) scale(${sideScale})`;
        card.style.filter     = `blur(2.5px) brightness(0.50)`;
        card.style.opacity    = `0.60`;
        card.style.zIndex     = `3`;
        card.classList.remove('active');
      }
    });
  }

  function nextCard() {
    current = (current + 1) % total;
    updateCards();
  }

  function prevCard() {
    current = (current - 1 + total) % total;
    updateCards();
  }

  // ── Auto-rotate in a circle every 15 seconds ───────────────
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(nextCard, 15000);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Click any card to bring it directly to the center
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (current !== i) {
        current = i;
        updateCards();
        startAuto();
      }
    });
  });

  // Re-position smoothly on window resize
  window.addEventListener('resize', updateCards, { passive: true });
  updateCards();
  startAuto();

  // Pause auto-rotation when user is hovering
  if (wrap) {
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);
  }

  // ── Drag / Swipe interaction (allows smooth vertical page scrolling) ──
  let startX = 0, startY = 0, isDragging = false, moved = false, isVerticalScroll = false;
  const THRESHOLD = 45; // swipe sensitivity

  function onDragStart(x, y = 0) {
    startX = x;
    startY = y;
    isDragging = true;
    moved = false;
    isVerticalScroll = false;
    stopAuto();
    track.classList.add('is-grabbing');
  }

  function onDragMove(x, y = 0) {
    if (!isDragging) return;
    const dx = Math.abs(x - startX);
    const dy = Math.abs(y - startY);
    if (dy > dx && dy > 10) {
      isVerticalScroll = true;
      return;
    }
    if (dx > 10) moved = true;
  }

  function onDragEnd(x) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-grabbing');
    startAuto();
    if (!moved || isVerticalScroll) return;
    const dx = x - startX;
    if (dx < -THRESHOLD) {
      nextCard(); // swiped left → move circle forward
    } else if (dx > THRESHOLD) {
      prevCard(); // swiped right → move circle back
    }
  }

  // Mouse events
  track.addEventListener('mousedown',  e => { onDragStart(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => onDragMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   e => onDragEnd(e.clientX));

  // Touch events for mobile and tablet (passive: true allows native page scroll)
  track.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  track.addEventListener('touchmove',  e => onDragMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  track.addEventListener('touchend',   e => onDragEnd(e.changedTouches[0].clientX));
}

// ============================================================
//  INFINITE CAROUSEL CLASS  (defined first — used by renderMenu)
//  Auto-scrolls endlessly. Loops seamlessly: items never end,
//  the first item smoothly follows the last item continuously.
// ============================================================
class InfiniteCarousel {
  constructor(grid, copies = 4) {
    this.grid        = grid;
    this.copies      = copies;
    this.speed       = 0.7;   // px per animation frame
    this.isDown      = false;
    this.startX      = 0;
    this.scrollOrigin= 0;
    this.raf         = null;
    this.resumeTimer = null;

    // Start with buffer so left-scrolling also loops seamlessly
    requestAnimationFrame(() => {
      const singleWidth = this.grid.scrollWidth / this.copies;
      if (singleWidth > 0 && this.grid.scrollLeft === 0) {
        this.grid.scrollLeft = singleWidth;
      }
      this.startAuto();
    });

    // Native scroll event handles trackpad and touch momentum
    this.onScroll = () => this.loop();
    this.grid.addEventListener('scroll', this.onScroll, { passive: true });

    this.hasDragged = false;
    this.moveHistory = [];

    // Horizontal scrolling with trackpad or mouse wheel over carousel
    this.onWheel = (e) => {
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = isHorizontal ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (Math.abs(delta) > 0) {
        closeAllExpandedCards();
        this.stopAuto();
        if (this.momentumRaf) {
          cancelAnimationFrame(this.momentumRaf);
          this.momentumRaf = null;
        }
        this.grid.scrollLeft += delta * 0.9;  // was 1.8 — now natural speed
        this.loop();
        clearTimeout(this.resumeTimer);
        this.resumeTimer = setTimeout(() => this.startAuto(), 1000);
      }
    };
    this.grid.addEventListener('wheel', this.onWheel, { passive: true });

    // Mouse drag
    this.grid.addEventListener('mousedown',  e  => this.dragStart(e.pageX, e.pageY));
    this.grid.addEventListener('mousemove',  e  => this.dragMove(e.pageX, e.pageY));
    this.grid.addEventListener('mouseup',    () => this.dragEnd());
    this.grid.addEventListener('mouseleave', () => this.dragEnd());

    // Touch swipe (passive: true allows native page scroll)
    this.grid.addEventListener('touchstart', e  => this.dragStart(e.touches[0].pageX, e.touches[0].pageY), { passive: true });
    this.grid.addEventListener('touchmove',  e  => this.dragMove(e.touches[0].pageX, e.touches[0].pageY),   { passive: true });
    this.grid.addEventListener('touchend',   () => this.dragEnd());
  }

  /** Keep scroll seamlessly cycling so it never reaches an end */
  loop() {
    const singleWidth = this.grid.scrollWidth / this.copies;
    if (!singleWidth) return;

    if (this.grid.scrollLeft >= singleWidth * 2) {
      this.grid.scrollLeft -= singleWidth;
    } else if (this.grid.scrollLeft <= singleWidth * 0.5) {
      this.grid.scrollLeft += singleWidth;
    }
  }

  startAuto() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const tick = () => {
      // Freeze all movement completely if any card is active / chosen
      if (!this.isDown && !window.isAnyCardExpanded) {
        this.grid.scrollLeft += this.speed;
        this.loop();
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopAuto() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  dragStart(x, y = 0) {
    this.isDown       = true;
    this.startX       = x;
    this.startY       = y;
    this.lastX        = x;
    this.hasDragged   = false;
    this.isVertical   = false;
    this.grid.classList.add('is-dragging');
    clearTimeout(this.resumeTimer);
    if (this.momentumRaf) {
      cancelAnimationFrame(this.momentumRaf);
      this.momentumRaf = null;
    }
    this.stopAuto();

    // Timestamped history buffer for accurate high-speed fling velocity
    const now = performance.now();
    this.moveHistory = [{ x, time: now }];
  }

  dragMove(x, y = 0) {
    if (!this.isDown) return;
    const dx = Math.abs(x - this.startX);
    const dy = Math.abs(y - this.startY);

    // Any drag movement closes expanded card and removes blur
    if (dx > 5 || dy > 5) {
      closeAllExpandedCards();
    }

    // If vertical movement dominates, user is scrolling down the page
    if (dy > dx && dy > 8) {
      this.isVertical = true;
      return;
    }
    if (this.isVertical) return;

    if (dx > 5) {
      this.hasDragged = true;
    }

    const now = performance.now();
    this.moveHistory.push({ x, time: now });
    // Retain only the last 100ms of points to measure release speed
    while (this.moveHistory.length > 1 && now - this.moveHistory[0].time > 100) {
      this.moveHistory.shift();
    }

    // Incremental delta scroll — 1:1 with finger movement
    const deltaX = (this.lastX - x) * 1.0;  // was 1.5 — now matches finger exactly
    this.grid.scrollLeft += deltaX;
    this.loop();
    this.lastX = x;
  }

  dragEnd() {
    if (!this.isDown) return;
    this.isDown = false;
    this.isVertical = false;
    this.grid.classList.remove('is-dragging');
    setTimeout(() => { this.hasDragged = false; }, 200);

    // Calculate fling velocity over the most recent 100ms
    const now = performance.now();
    while (this.moveHistory && this.moveHistory.length > 1 && now - this.moveHistory[0].time > 100) {
      this.moveHistory.shift();
    }

    let velocity = 0;
    if (this.moveHistory && this.moveHistory.length >= 2) {
      const oldest = this.moveHistory[0];
      const newest = this.moveHistory[this.moveHistory.length - 1];
      const dt = Math.max(1, newest.time - oldest.time);
      const dx = oldest.x - newest.x; // positive = dragged left, scrolls right
      velocity = dx / dt; // px per millisecond
    }

    // ── FLING SCROLL — natural, not super-fast ──
    if (Math.abs(velocity) > 0.12 && !window.isAnyCardExpanded) {
      let vx = velocity * 18;  // was 42 — reduced for natural feel
      const maxSpeed = 40;      // was 85 — lower cap so it never rockets
      vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
      const friction = 0.92;  // slightly more friction = stops sooner

      const fling = () => {
        if (Math.abs(vx) > 0.4 && !this.isDown && !window.isAnyCardExpanded) {
          this.grid.scrollLeft += vx;
          this.loop();
          vx *= friction;
          this.momentumRaf = requestAnimationFrame(fling);
        } else {
          this.momentumRaf = null;
          this.resumeTimer = setTimeout(() => this.startAuto(), 1000);
        }
      };
      this.momentumRaf = requestAnimationFrame(fling);
    } else {
      this.resumeTimer = setTimeout(() => this.startAuto(), 1500);
    }
  }

  destroy() {
    this.stopAuto();
    if (this.momentumRaf) {
      cancelAnimationFrame(this.momentumRaf);
      this.momentumRaf = null;
    }
    clearTimeout(this.resumeTimer);
    this.grid.removeEventListener('scroll', this.onScroll);
    if (this.onWheel) this.grid.removeEventListener('wheel', this.onWheel);
  }
}

// ============================================================
//  CARD TAP-TO-EXPAND & BLUR (Zero Movement When Chosen)
//  Tapping enlarges ONLY the chosen card right where it is,
//  blurs all other cards, and freezes all movement.
//  The chosen card DOES NOT move or slide sideways.
//  Scrolling down, up, left, or right immediately restores normal size & unblurs.
// ============================================================
function closeAllExpandedCards() {
  window.isAnyCardExpanded = false;
  const openCard = document.querySelector('.menu-card.is-expanded');
  const activeGrids = document.querySelectorAll('.menu-grid.has-active-card');
  if (openCard || activeGrids.length > 0) {
    document.querySelectorAll('.menu-card.is-expanded').forEach(c => c.classList.remove('is-expanded'));
    document.querySelectorAll('.menu-grid.has-active-card').forEach(g => {
      g.classList.remove('has-active-card');
      if (g._carousel) g._carousel.startAuto();
    });
  }
}

function toggleCard(cardEl) {
  // If user was dragging or swiping the carousel, don't trigger expand
  const grid = cardEl.closest('.menu-grid');
  if (grid && grid._carousel && grid._carousel.hasDragged) return;

  const isAlreadyExpanded = cardEl.classList.contains('is-expanded');

  // Close any previously expanded card across all categories
  closeAllExpandedCards();

  if (!isAlreadyExpanded) {
    window.isAnyCardExpanded = true;
    cardEl.classList.add('is-expanded');

    // Freeze all carousels completely so nothing moves while an item is chosen
    categories.forEach(cat => {
      const g = document.getElementById('grid-' + cat);
      if (g && g._carousel) {
        g._carousel.stopAuto();
        if (g._carousel.momentumRaf) {
          cancelAnimationFrame(g._carousel.momentumRaf);
          g._carousel.momentumRaf = null;
        }
      }
    });

    if (grid) {
      grid.classList.add('has-active-card');

      // ── Scroll the tapped card to the horizontal center of the grid ──
      requestAnimationFrame(() => {
        const gridRect = grid.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        // Distance from the grid's left edge to the card's current center
        const cardCenterInGrid = (cardRect.left - gridRect.left) + grid.scrollLeft + cardRect.width / 2;
        // Target scroll: card center aligns with grid center
        const targetScroll = cardCenterInGrid - gridRect.width / 2;
        grid.scrollTo({ left: targetScroll, behavior: 'smooth' });
      });
    }
  }
}

// When scrolling down, up, left, or right: card immediately returns to normal size & blur disappears!
window.addEventListener('scroll', closeAllExpandedCards, { passive: true });

window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) > 4 || Math.abs(e.deltaX) > 4) {
    closeAllExpandedCards();
  }
}, { passive: true });

document.addEventListener('touchmove', closeAllExpandedCards, { passive: true });

// Tap anywhere outside to close the expanded card, unblur, and resume carousel
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-card')) {
    closeAllExpandedCards();
  }
});

// ============================================================
//  CLASSIC WHITE ICONS (Classic vector SVGs: Coffee, Snow, etc.)
// ============================================================
const CLASSIC_ICONS = {
  coffee: `<svg class="cat-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="2" y1="21" x2="18" y2="21"/><path d="M6 2v3"/><path d="M10 2v3"/><path d="M14 2v3"/></svg>`,
  cold: `<svg class="cat-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/><polyline points="9 3 12 6 15 3"/><polyline points="9 21 12 18 15 21"/><polyline points="3 9 6 12 3 15"/><polyline points="21 9 18 12 21 15"/><polyline points="5.5 8.5 7.5 7.5 8.5 5.5"/><polyline points="18.5 15.5 16.5 16.5 15.5 18.5"/><polyline points="15.5 5.5 16.5 7.5 18.5 8.5"/><polyline points="8.5 18.5 7.5 16.5 5.5 15.5"/></svg>`,
  tea: `<svg class="cat-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 10h1a3 3 0 0 1 0 6h-1"/><path d="M3 10h15v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-5z"/><line x1="2" y1="21" x2="20" y2="21"/><path d="M8 3c0 2-2 3-2 5"/><path d="M13 3c0 2-2 3-2 5"/></svg>`,
  desserts: `<svg class="cat-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16l-9.5-7.5L2 14v6h19v-4z"/><path d="M2 14l9.5-5.5L21 12"/><line x1="2" y1="17.5" x2="21" y2="17.5"/><circle cx="11.5" cy="5" r="2" fill="currentColor"/></svg>`,
  snacks: `<svg class="cat-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 14C18.2 8.5 13.8 6.5 12 6.5s-6.2 2-7.5 7.5c-.8 3.5 1.5 5.5 3.5 4.5 2-1 2-3.5 4-3.5s2 2.5 4 3.5c2 1 4.3-1 3.5-4.5z"/><path d="M9 10.5c1-1.5 2-2 3-2s2 .5 3 2"/></svg>`
};

// ============================================================
//  TRANSLATIONS — UI Strings
// ============================================================
const UI = {
  en: {
    welcome:        "Welcome to",
    hero_subtitle:  "Crafted with passion, served with love. Explore our menu and find your perfect cup.",
    popular:        "Popular",
    no_results:     "No items found",
    no_results_sub: "Try searching in another language or check your spelling.",
    footer_tagline: "Coffee & More",
    nav_label:      "Our Menu",
    menu_label:     "Menu",
    categories: {
      coffee:   "Coffee",
      cold:     "Cold Drinks",
      tea:      "Tea",
      desserts: "Desserts",
      snacks:   "Snacks"
    },
    cat_icons: CLASSIC_ICONS
  },
  ku: {
    welcome:        "بەخێربێن بۆ",
    hero_subtitle:  "ئامادەکراو بە ئارەزوو، پێشکەشکراو بە خۆشەویستی. مێنیۆمان بگەڕێ و دڵخوازترین خواردنەوەت بدۆزەوە.",
    popular:        "بەناوبانگ",
    no_results:     "هیچ بابەتێک نەدۆزرایەوە",
    no_results_sub: "بگەڕێ بە زمانێکی دیکە یان نووسینت بپشکنە.",
    footer_tagline: "قاوە و زیاتر",
    nav_label:      "مێنیۆی ئێمە",
    menu_label:     "مێنیۆ",
    categories: {
      coffee:   "قاوە",
      cold:     "خواردنەوەی سارد",
      tea:      "چای",
      desserts: "شیرینی",
      snacks:   "خواردنی سووک"
    },
    cat_icons: CLASSIC_ICONS
  },
  ar: {
    welcome:        "مرحباً بكم في",
    hero_subtitle:  "مُعدّ بشغف، مُقدَّم بحب. تصفّح قائمتنا واختر ما يُرضي ذوقك.",
    popular:        "الأكثر طلباً",
    no_results:     "لم يتم العثور على نتائج",
    no_results_sub: "جرب البحث بلغة أخرى أو تحقق من الإملاء.",
    footer_tagline: "قهوة وأكثر",
    nav_label:      "قائمتنا",
    menu_label:     "القائمة",
    categories: {
      coffee:   "القهوة",
      cold:     "المشروبات الباردة",
      tea:      "الشاي",
      desserts: "الحلويات",
      snacks:   "الوجبات الخفيفة"
    },
    cat_icons: CLASSIC_ICONS
  },
  fa: {
    welcome:        "خوش آمدید به",
    hero_subtitle:  "تهیه شده با اشتیاق، سرو شده با عشق. منو را بررسی کنید و فنجان ایده‌آل خود را بیابید.",
    popular:        "محبوب",
    no_results:     "موردی یافت نشد",
    no_results_sub: "عبارت دیگری را جستجو کنید یا املای آن را بررسی فرمایید.",
    footer_tagline: "قهوه و فراتر از آن",
    nav_label:      "منوی ما",
    menu_label:     "منو",
    categories: {
      coffee:   "قهوه",
      cold:     "نوشیدنی‌های سرد",
      tea:      "چای",
      desserts: "دسرها",
      snacks:   "اسنک‌ها"
    },
    cat_icons: CLASSIC_ICONS
  },
  tr: {
    welcome:        "Hoş Geldiniz",
    hero_subtitle:  "Tutkuyla hazırlandı, sevgiyle sunuldu. Menümüzü keşfedin ve mükemmel lezzeti bulun.",
    popular:        "Popüler",
    no_results:     "Sonuç bulunamadı",
    no_results_sub: "Lütfen başka bir arama yapmayı deneyin.",
    footer_tagline: "Kahve & Daha Fazlası",
    nav_label:      "Menümüz",
    menu_label:     "Menü",
    categories: {
      coffee:   "Kahve",
      cold:     "Soğuk İçecekler",
      tea:      "Çay",
      desserts: "Tatlılar",
      snacks:   "Atıştırmalıklar"
    },
    cat_icons: CLASSIC_ICONS
  }
};

// ============================================================
//  MENU DATA  —  edit items here
// ============================================================
const menuItems = [

  // ── COFFEE ──────────────────────────────────────────────
  {
    id: "espresso", category: "coffee", popular: false,
    image: "images/espresso.jpg",
    name: { en: "Espresso",        ku: "ئێسپریسۆ",          ar: "إسبريسو",        fa: "اسپرسو",              tr: "Espresso" },
    desc: { en: "Pure, bold shot of concentrated coffee with a rich crema.",
            ku: "پیاڵەیەکی بچووکی قاوەی تووند بە کرێمایەکی بەرز.",
            ar: "جرعة قهوة مركزة نقية بكريما غنية.",
            fa: "یک شات غلیظ و خالص از قهوه با کرمای غنی و ماندگار.",
            tr: "Zengin kreması ve yoğun aromasıyla saf konsantre kahve shot'ı." },
    price: "2,500 IQD"
  },
  {
    id: "double_espresso", category: "coffee", popular: false,
    image: "images/double_espresso.jpg",
    name: { en: "Double Espresso", ku: "دووپیاڵە ئێسپریسۆ",  ar: "إسبريسو مضاعف",   fa: "دابل اسپرسو",          tr: "Double Espresso" },
    desc: { en: "Two shots of espresso for an extra boost.",
            ku: "دوو پیاڵەی ئێسپریسۆ بۆ ئەوەی زیاتر هەژبردار بیت.",
            ar: "جرعتان من الإسبريسو لطاقة مضاعفة.",
            fa: "دو شات اسپرسو برای انرژی و نشاط دوچندان.",
            tr: "Ekstra enerji için iki shot yoğun espresso." },
    price: "3,500 IQD"
  },
  {
    id: "americano", category: "coffee", popular: false,
    image: "images/americano.jpg",
    name: { en: "Americano",       ku: "ئەمریکانۆ",          ar: "أمريكانو",       fa: "آمریکانو",            tr: "Americano" },
    desc: { en: "Espresso diluted with hot water for a smooth, long coffee.",
            ku: "ئێسپریسۆ بە ئاوی گەرمدا تێکەڵکراوە بۆ قاوەیەکی نەرم و درێژ.",
            ar: "إسبريسو مخفف بالماء الساخن لقهوة ناعمة وطويلة.",
            fa: "اسپرسو ترکیب شده با آب داغ برای طعمی ملایم و دلپذیر.",
            tr: "Sıcak su ile dengelenmiş pürüzsüz ve hafif içimli espresso." },
    price: "3,000 IQD"
  },
  {
    id: "cappuccino", category: "coffee", popular: true,
    image: "images/cappuccino.jpg",
    name: { en: "Cappuccino",      ku: "کاپوچینۆ",           ar: "كابتشينو",      fa: "کاپوچینو",            tr: "Cappuccino" },
    desc: { en: "Espresso with velvety steamed milk and a thick layer of foam.",
            ku: "ئێسپریسۆ لەگەڵ شیری گەرمکراوی نەرم و چینێکی ستەوری فۆم.",
            ar: "إسبريسو مع حليب مبخر ناعم وطبقة سميكة من الرغوة.",
            fa: "اسپرسو همراه با شیر بخار داده شده مخملی و لایه‌ای ضخیم از فوم.",
            tr: "Kadife kıvamında süt ve kalın köpük katmanı ile hazırlanan espresso." },
    price: "4,000 IQD"
  },
  {
    id: "latte", category: "coffee", popular: true,
    image: "images/latte.jpg",
    name: { en: "Café Latte",      ku: "لاتێ",               ar: "لاتيه",         fa: "کافه لاته",           tr: "Café Latte" },
    desc: { en: "Smooth espresso with generous steamed milk and light foam.",
            ku: "ئێسپریسۆی نەرم لەگەڵ شیری زۆر و فۆمی سووک.",
            ar: "إسبريسو ناعم مع حليب مبخر وفير ورغوة خفيفة.",
            fa: "اسپرسوی ملایم با شیر گرم فراوان و لایه‌ای نازک از کف شیر.",
            tr: "Bol sıcak süt ve hafif köpük ile yumuşak içimli espresso." },
    price: "4,500 IQD"
  },
  {
    id: "mocha", category: "coffee", popular: false,
    image: "images/mocha.jpg",
    name: { en: "Mocha",           ku: "مۆکا",               ar: "موكا",          fa: "موکا",                tr: "Mocha" },
    desc: { en: "Rich espresso with chocolate syrup and whipped cream.",
            ku: "ئێسپریسۆی بەرز لەگەڵ شیرینی چکلاتە و کرێمی دوهاتوو.",
            ar: "إسبريسو غني مع شراب الشوكولاتة وكريمة مخفوقة.",
            fa: "اسپرسوی قوی همراه با سیروپ شکلات غلیظ و خامه زده شده.",
            tr: "Çikolata şurubu, sıcak süt ve çırpılmış krema ile zenginleştirilmiş espresso." },
    price: "5,000 IQD"
  },
  {
    id: "turkish", category: "coffee", popular: false,
    image: "images/turkish.jpg",
    name: { en: "Turkish Coffee",  ku: "قاوەی تورکی",        ar: "قهوة تركية",     fa: "قهوه ترک",            tr: "Türk Kahvesi" },
    desc: { en: "Finely ground coffee brewed in a traditional copper cezve.",
            ku: "قاوەی باریک لە جەزڤەی تامرەی کۆنەپەرست دروستکراوە.",
            ar: "قهوة مطحونة ناعمة مُعدّة في جزوة نحاسية تقليدية.",
            fa: "قهوه آسیاب شده نرم که به روش سنتی در جذوه مسی دم کشیده شده است.",
            tr: "Geleneksel bakır cezvede pişirilen taze çekilmiş bol köpüklü kahve." },
    price: "3,000 IQD"
  },
  {
    id: "arabic_coffee", category: "coffee", popular: false,
    image: "images/arabic_coffee.jpg",
    name: { en: "Arabic Coffee",   ku: "قاوەی عەرەبی",       ar: "قهوة عربية",    fa: "قهوه عربی",           tr: "Arap Kahvesi" },
    desc: { en: "Light golden coffee with cardamom, served with dates.",
            ku: "قاوەی زێڕینی سووک لەگەڵ هەڵ، پێشکەش کراو لەگەڵ خورما.",
            ar: "قهوة ذهبية خفيفة بنكهة الهيل، تُقدَّم مع التمر.",
            fa: "قهوه زرین ملایم با عطر هل، همراه با خرمای تازه سرو می‌شود.",
            tr: "Kakule ile tatlandırılmış hafif kavrulmuş altın sarısı kahve, hurma ile servis edilir." },
    price: "2,500 IQD"
  },

  // ── COLD DRINKS ─────────────────────────────────────────
  {
    id: "iced_coffee", category: "cold", popular: true,
    image: "images/iced_coffee.jpg",
    name: { en: "Iced Coffee",     ku: "قاوەی سارد",         ar: "قهوة مثلجة",    fa: "قهوه سرد (آیس کافی)", tr: "Buzlu Kahve" },
    desc: { en: "Chilled brewed coffee over ice with your choice of milk.",
            ku: "قاوەی سارد لەسەر یەخ لەگەڵ شیری خۆت.",
            ar: "قهوة مبردة على الثلج مع الحليب الذي تختاره.",
            fa: "قهوه دم‌کشیده خنک روی یخ همراه با انتخاب شیر دلخواه شما.",
            tr: "Buz üzerinde soğutulmuş demlenmiş kahve ve isteğe göre süt." },
    price: "4,000 IQD"
  },
  {
    id: "iced_latte", category: "cold", popular: false,
    image: "images/iced_latte.jpg",
    name: { en: "Iced Latte",      ku: "لاتێی سارد",         ar: "لاتيه مثلج",    fa: "آیس لاته",            tr: "Iced Latte" },
    desc: { en: "Espresso and cold milk poured over ice — refreshing and smooth.",
            ku: "ئێسپریسۆ و شیری سارد لەسەر یەخ — تازەکەرەوە و نەرم.",
            ar: "إسبريسو وحليب بارد على الثلج — منعش وناعم.",
            fa: "ترکیب اسپرسو و شیر سرد روی تکه‌های یخ — باطراوت و دلنشین.",
            tr: "Buz dolu bardağa dökülen espresso ve soğuk sütün ferahlatıcı uyumu." },
    price: "5,000 IQD"
  },
  {
    id: "iced_mocha", category: "cold", popular: false,
    image: "images/iced_mocha.jpg",
    name: { en: "Iced Mocha",      ku: "مۆکای سارد",         ar: "موكا مثلج",     fa: "آیس موکا",            tr: "Iced Mocha" },
    desc: { en: "Iced espresso with chocolate and milk, topped with whipped cream.",
            ku: "ئێسپریسۆی سارد لەگەڵ چکلاتە و شیر، لەسەریدا کرێمی دوهاتوو.",
            ar: "إسبريسو مثلج بالشوكولاتة والحليب، ويعلوه كريمة مخفوقة.",
            fa: "اسپرسوی خنک با شکلات و شیر روی یخ، همراه با خامه زده شده.",
            tr: "Çikolata, süt ve espresso buzla buluşuyor, üzeri kremalı lezzet." },
    price: "5,500 IQD"
  },
  {
    id: "cold_brew", category: "cold", popular: false,
    image: "images/cold_brew.jpg",
    name: { en: "Cold Brew",       ku: "کۆڵد برو",           ar: "كولد برو",      fa: "کلد برو (دم‌سرد)",    tr: "Cold Brew" },
    desc: { en: "Coffee steeped in cold water for 12 hours — ultra-smooth.",
            ku: "قاوە بۆ ١٢ کاتژمێر لە ئاوی سارد خواردووە — تایبەتی نەرم.",
            ar: "قهوة منقوعة في الماء البارد لـ12 ساعة — ناعمة للغاية.",
            fa: "قهوه عصاره‌گیری شده در آب سرد به مدت ۱۲ ساعت — بسیار نرم و خوش‌طعم.",
            tr: "12 saat boyunca soğuk suda demlenmiş, asiditesi düşük ve pürüzsüz kahve." },
    price: "5,500 IQD"
  },
  {
    id: "lemonade", category: "cold", popular: false,
    image: "images/lemonade.jpg",
    name: { en: "Fresh Lemonade",  ku: "لیمۆناتای تازە",    ar: "عصير ليمون طازج",fa: "لیموناد تازه",        tr: "Taze Limonata" },
    desc: { en: "Freshly squeezed lemon with mint and ice — perfectly balanced.",
            ku: "لیمۆی تازە چەپکراو لەگەڵ نینەوک و یەخ.",
            ar: "ليمون طازج معصور مع النعناع والثلج.",
            fa: "آب لیموی تازه با نعناع طبیعی و یخ خرد شده — طراوت‌بخش و نشاط‌آور.",
            tr: "Taze sıkılmış limon, nane yaprakları ve bol buz ile hazırlanan serinlik." },
    price: "3,500 IQD"
  },

  // ── TEA ─────────────────────────────────────────────────
  {
    id: "black_tea", category: "tea", popular: false,
    image: "images/black_tea.jpg",
    name: { en: "Black Tea",       ku: "چایی ڕەش",          ar: "شاي أسود",      fa: "چای سیاه",            tr: "Siyah Çay" },
    desc: { en: "Classic strong black tea, served hot with sugar on the side.",
            ku: "چایی ڕەشی کلاسیکی تووند، گەرم پێشکەشکراو لەگەڵ شەکر.",
            ar: "شاي أسود كلاسيكي قوي، يُقدَّم ساخناً مع السكر.",
            fa: "چای سیاه سنتی و معطر، به صورت داغ همراه با نبات یا شکر سرو می‌شود.",
            tr: "Klasik demlenmiş taze Türk usulü sıcak siyah çay." },
    price: "2,000 IQD"
  },
  {
    id: "green_tea", category: "tea", popular: false,
    image: "images/green_tea.jpg",
    name: { en: "Green Tea",       ku: "چایی سەوز",         ar: "شاي أخضر",      fa: "چای سبز",             tr: "Yeşil Çay" },
    desc: { en: "Delicate green tea with a fresh, grassy aroma.",
            ku: "چایی سەوزی نازەڕق لەگەڵ بۆنێکی تازە.",
            ar: "شاي أخضر رفيع بأروما طازجة وعشبية.",
            fa: "چای سبز سبک و ملایم با خواص آنتی‌اکسیدانی و عطر برگ تازه.",
            tr: "Hafif, tazeleyici ve doğal aromasıyla sağlıklı yeşil çay yaprakları." },
    price: "2,500 IQD"
  },
  {
    id: "mint_tea", category: "tea", popular: true,
    image: "images/mint_tea.jpg",
    name: { en: "Mint Tea",        ku: "چایی نینەوک",       ar: "شاي بالنعناع",   fa: "چای نعناع",           tr: "Nane Çayı" },
    desc: { en: "Refreshing herbal tea with fresh mint leaves and honey.",
            ku: "چایی گیای تازەکەرەوە لەگەڵ گڵپەی نینەوکی تازە و مزوو.",
            ar: "شاي عشبي منعش بأوراق النعناع الطازجة والعسل.",
            fa: "دمنوش گیاهی نشاط‌آور با برگ‌های تازه نعناع و عسل طبیعی.",
            tr: "Taze nane yaprakları ve bal ile hazırlanan ferahlatıcı bitki çayı." },
    price: "2,500 IQD"
  },
  {
    id: "turkish_tea", category: "tea", popular: false,
    image: "images/turkish_tea.jpg",
    name: { en: "Turkish Tea",     ku: "چایی تورکی",        ar: "شاي تركي",      fa: "چای ترکی",            tr: "Türk Çayı" },
    desc: { en: "Strong tea in a tulip-shaped glass with sugar cubes.",
            ku: "چایی تووند لە پیاڵەی لالەشێوە لەگەڵ پڵکەی شەکر.",
            ar: "شاي قوي في كأس على شكل زهرة مع مكعبات السكر.",
            fa: "چای دبش و خوش‌رنگ در استکان کمر باریک همراه با قند.",
            tr: "İnce belli bardakta servis edilen tavşan kanı taze demlenmiş çay." },
    price: "2,000 IQD"
  },

  // ── DESSERTS ────────────────────────────────────────────
  {
    id: "cheesecake", category: "desserts", popular: true,
    image: "images/cheesecake.jpg",
    name: { en: "Cheesecake",      ku: "چیزکەیک",           ar: "تشيز كيك",      fa: "چیزکیک",              tr: "Cheesecake" },
    desc: { en: "Creamy New York-style cheesecake on a buttery biscuit crust.",
            ku: "چیزکەیکی کرێمی نیویۆرک بۆ بنەکی بیسکووتی بە کرێم.",
            ar: "تشيز كيك كريمي بأسلوب نيويورك على قاعدة بسكويت زبدية.",
            fa: "چیزکیک خامه‌ای و خوشمزه به سبک نیویورک روی پایه بیسکوییت کره‌ای.",
            tr: "Tereyağlı bisküvi tabanı üzerinde New York usulü enfes kremsi cheesecake." },
    price: "6,000 IQD"
  },
  {
    id: "choc_cake", category: "desserts", popular: false,
    image: "images/chocolate_cake.jpg",
    name: { en: "Chocolate Cake",  ku: "کیکی چکلاتە",       ar: "كعكة الشوكولاتة",fa: "کیک شکلاتی",          tr: "Çikolatalı Pasta" },
    desc: { en: "Rich dark chocolate cake with ganache frosting.",
            ku: "کیکی چکلاتەی تاریکی بەرز لەگەڵ گاناشی سەرەوە.",
            ar: "كعكة شوكولاتة داكنة غنية مع طلاء جاناش.",
            fa: "کیک اسفنجی شکلات تلخ با فیلینگ و روکش گاناش شکلاتی.",
            tr: "Yoğun kakao ve çikolata ganajı ile hazırlanan zengin çikolatalı pasta." },
    price: "5,500 IQD"
  },
  {
    id: "tiramisu", category: "desserts", popular: true,
    image: "images/tiramisu.jpg",
    name: { en: "Tiramisu",        ku: "تیراموسو",          ar: "تيراميسو",      fa: "تیرامیسو",            tr: "Tiramisu" },
    desc: { en: "Classic Italian dessert with mascarpone, espresso and cocoa.",
            ku: "شیرینی کلاسیکی ئیتالی لەگەڵ ماسکارپۆنە، ئێسپریسۆ و کاکاو.",
            ar: "حلوى إيطالية كلاسيكية بالماسكاربوني والإسبريسو والكاكاو.",
            fa: "دسر اصیل ایتالیایی با پنیر ماسکارپونه، لیدی فینگر قهوه‌ای و پودر کاکائو.",
            tr: "Espresso ile ıslatılmış kedidili bisküvileri ve mascarpone kremalı klasik İtalyan tatlısı." },
    price: "6,500 IQD"
  },
  {
    id: "brownie", category: "desserts", popular: false,
    image: "images/brownie.jpg",
    name: { en: "Brownie",         ku: "براونی",             ar: "براوني",        fa: "براونی",              tr: "Brownie" },
    desc: { en: "Warm, fudgy chocolate brownie with vanilla ice cream.",
            ku: "براونی چکلاتەی گەرم و نەرم، لەگەڵ دۆندورمای وانیلا.",
            ar: "براوني شوكولاتة دافئ وطري مع آيس كريم الفانيليا.",
            fa: "براونی شکلاتی داغ و فاجی همراه با یک اسکوپ بستنی وانیلی.",
            tr: "Sıcak ve içi yumuşacık çikolatalı brownie, yanında vanilyalı dondurma ile." },
    price: "5,000 IQD"
  },
  {
    id: "croissant_des", category: "desserts", popular: false,
    image: "images/croissant.jpg",
    name: { en: "Croissant",       ku: "کرواسان",            ar: "كرواسان",       fa: "کرواسان کره‌ای",      tr: "Kruvasan" },
    desc: { en: "Buttery, flaky French croissant served warm.",
            ku: "کرواسانی فەرەنسی بە کرێم و پرک، گەرم پێشکەشکراو.",
            ar: "كرواسان فرنسي زبدي ومقرمش، يُقدَّم دافئاً.",
            fa: "کرواسان کلاسیک فرانسوی، لایه‌ای، ترد و کره‌ای، گرم سرو می‌شود.",
            tr: "Kat kat tereyağlı çıtır çıtır sıcak servis edilen Fransız kruvasanı." },
    price: "3,500 IQD"
  },

  // ── SNACKS ──────────────────────────────────────────────
  {
    id: "sandwich", category: "snacks", popular: false,
    image: "images/sandwich.jpg",
    name: { en: "Sandwich",        ku: "ساندویچ",            ar: "ساندويتش",      fa: "ساندویچ مخصوص",       tr: "Sandviç" },
    desc: { en: "Fresh baked bread with seasonal fillings and house sauce.",
            ku: "نانی تازەی داپێجراو لەگەڵ پڕکردنەوەی وەرز و سۆسی مالەوە.",
            ar: "خبز طازج مخبوز مع حشوات موسمية وصلصة المنزل.",
            fa: "نان تازه پخته شده با محتویات خوش‌طعم فصلی و سس مخصوص سرآشپز.",
            tr: "Taze fırın ekmeği içinde taze malzemeler ve özel sos ile hazırlanan sandviç." },
    price: "5,000 IQD"
  },
  {
    id: "club_sandwich", category: "snacks", popular: true,
    image: "images/club_sandwich.jpg",
    name: { en: "Club Sandwich",   ku: "کلەب ساندویچ",      ar: "كلوب ساندويتش", fa: "کلاب ساندویچ",        tr: "Kulüp Sandviç" },
    desc: { en: "Triple-layered sandwich with grilled chicken, cheese and veggies.",
            ku: "ساندویچی سێ چین لەگەڵ مریشکی بریان، پەنیر و سەوزە.",
            ar: "ساندويتش ثلاثي الطبقات بالدجاج المشوي والجبن والخضار.",
            fa: "ساندویچ سه لایه با مرغ گریل شده، پنیر ذوب شده و سبزیجات تازه.",
            tr: "Izgara tavuk, eritilmiş peynir ve taze yeşilliklerle üç katlı doyurucu sandviç." },
    price: "8,000 IQD"
  },
  {
    id: "french_toast", category: "snacks", popular: false,
    image: "images/french_toast.jpg",
    name: { en: "French Toast",    ku: "توستی فەرەنسی",     ar: "توست فرنسي",    fa: "فرنچ تست",            tr: "Fransız Tostu" },
    desc: { en: "Egg-dipped bread pan-fried to golden with syrup and berries.",
            ku: "نانی تێکەڵکراو لەگەڵ هێلکە و لە تاوەدا بریان، لەگەڵ شیرب و بێزنی.",
            ar: "خبز مغموس بالبيض ومقلي حتى الاصفرار مع الشراب والتوت.",
            fa: "نان تست آغشته به تخم‌مرغ و برشته شده طلایی با سیروپ و میوه‌های جنگلی.",
            tr: "Altın sarısı kızartılmış yumurtalı ekmek, akçaağaç şurubu ve taze meyveler eşliğinde." },
    price: "6,000 IQD"
  },
  {
    id: "croissant_snack", category: "snacks", popular: false,
    image: "images/croissant.jpg",
    name: { en: "Croissant Snack", ku: "کرواسانی سووک",    ar: "كرواسان خفيف",  fa: "کرواسان لقمه‌ای",     tr: "Kruvasan Atıştırmalık" },
    desc: { en: "Mini croissant with cream cheese or chocolate filling.",
            ku: "کرواسانی بچووک لەگەڵ پڕکردنەوەی پەنیری کرێم یان چکلاتە.",
            ar: "كرواسان صغير بحشوة جبن كريمي أو شوكولاتة.",
            fa: "مینی کرواسان تازه با مغز پنیر خامه‌ای لذیذ یا شکلات فندقی.",
            tr: "Krem peynir veya çikolata dolgulu sıcak mini çıtır kruvasan." },
    price: "3,000 IQD"
  }
];

// ============================================================
//  CATEGORY ORDER
// ============================================================
const categories = ["coffee", "cold", "tea", "desserts", "snacks"];

// ============================================================
//  STATE
// ============================================================
let currentLang = localStorage.getItem("cafeMenuLang") || "en";

// ============================================================
//  HELPERS
// ============================================================
function t(key) {
  const parts = key.split(".");
  let obj = UI[currentLang];
  for (const p of parts) obj = obj?.[p];
  return obj ?? key;
}
function isRTL(lang) { return lang === "ku" || lang === "ar" || lang === "fa"; }

// ============================================================
//  LANGUAGE SWITCH
// ============================================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("cafeMenuLang", lang);

  if (isRTL(lang)) {
    document.body.classList.add("rtl");
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", lang === "ar" ? "ar" : lang === "fa" ? "fa" : "ckb");
  } else {
    document.body.classList.remove("rtl");
    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("lang", lang === "tr" ? "tr" : "en");
  }

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Update the mobile lang button label
  const mobileLangLabel = document.getElementById("mobileLangLabel");
  if (mobileLangLabel) {
    const labels = { en: "EN", ku: "KU", ar: "عر", fa: "فا", tr: "TR" };
    mobileLangLabel.textContent = labels[lang] || lang.toUpperCase();
  }

  renderCatNav();
  renderMenu();
  updateFooter();
}

// ============================================================
//  WELCOME / LANGUAGE SELECTION SPLASH
//  Opens when user enters website so they select their language
//  to access the menu, then immediately reveals the 3 hero videos.
// ============================================================
function selectLangAndEnter(lang) {
  setLanguage(lang);
  sessionStorage.setItem("mrCafeLangSelected", "true");

  // Show the hero videos immediately at the top
  window.scrollTo({ top: 0, behavior: 'instant' });

  const overlay = document.getElementById("langModalOverlay");
  if (overlay) {
    overlay.classList.add("is-dismissed");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 520);
  }
}

// ============================================================
//  RE-OPEN LANGUAGE MODAL (triggered by the mobile globe button)
// ============================================================
function openLangModal() {
  const overlay = document.getElementById("langModalOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  // Force reflow before removing dismissed class so CSS transition fires
  overlay.getBoundingClientRect();
  overlay.classList.remove("is-dismissed");
  // Reset session flag so user can pick again
  sessionStorage.removeItem("mrCafeLangSelected");
}

const LANG_MODAL_TEXTS = {
  en: {
    welcome:     "Welcome to Mr.Cafe 2",
    instruction: "Choose your preferred language"
  },
  ku: {
    welcome:     "بەخێربێن بۆ Mr.Cafe 2",
    instruction: "زمانە دڵخوازەکەت هەڵبژێرە"
  },
  ar: {
    welcome:     "مرحباً بكم في Mr.Cafe 2",
    instruction: "اختر لغتك المفضلة"
  },
  fa: {
    welcome:     "به Mr.Cafe 2 خوش آمدید",
    instruction: "زبان مورد نظر خود را انتخاب کنید"
  },
  tr: {
    welcome:     "Mr.Cafe 2'ye Hoş Geldiniz",
    instruction: "Lütfen tercih ettiğiniz dili seçin"
  }
};

function setupLangCards3D() {
  const track = document.getElementById("langCardsTrack");
  const wrap  = document.getElementById("langCardsWrap");
  const welcomeEl = document.getElementById("langModalWelcome");
  const instrEl   = document.getElementById("langModalInstruction");
  if (!track) return;

  const cards = [...track.querySelectorAll(".lang-card")];
  const total = cards.length;
  if (!total) return;

  // Start with the card matching currentLang, or default to 0
  let current = cards.findIndex(c => c.dataset.lang === currentLang);
  if (current < 0) current = 0;

  let autoTimer = null;
  let isInitial = true;

  function updateModalHeader(lang) {
    if (!welcomeEl || !instrEl) return;
    const data = LANG_MODAL_TEXTS[lang] || LANG_MODAL_TEXTS.en;

    if (isInitial) {
      welcomeEl.textContent = data.welcome;
      instrEl.textContent   = data.instruction;
      if (isRTL(lang)) {
        welcomeEl.style.direction = "rtl";
        instrEl.style.direction   = "rtl";
        welcomeEl.style.fontFamily = "'Noto Naskh Arabic', serif";
        instrEl.style.fontFamily   = "'Noto Sans Arabic', sans-serif";
      } else {
        welcomeEl.style.direction = "ltr";
        instrEl.style.direction   = "ltr";
        welcomeEl.style.fontFamily = "var(--font-serif)";
        instrEl.style.fontFamily   = "var(--font-sans)";
      }
      isInitial = false;
      return;
    }

    welcomeEl.style.opacity = "0";
    welcomeEl.style.transform = "translateY(-4px)";
    instrEl.style.opacity   = "0";
    instrEl.style.transform = "translateY(4px)";

    setTimeout(() => {
      welcomeEl.textContent = data.welcome;
      instrEl.textContent   = data.instruction;
      if (isRTL(lang)) {
        welcomeEl.style.direction = "rtl";
        instrEl.style.direction   = "rtl";
        welcomeEl.style.fontFamily = "'Noto Naskh Arabic', serif";
        instrEl.style.fontFamily   = "'Noto Sans Arabic', sans-serif";
      } else {
        welcomeEl.style.direction = "ltr";
        instrEl.style.direction   = "ltr";
        welcomeEl.style.fontFamily = "var(--font-serif)";
        instrEl.style.fontFamily   = "var(--font-sans)";
      }
      welcomeEl.style.opacity = "1";
      welcomeEl.style.transform = "translateY(0)";
      instrEl.style.opacity   = "1";
      instrEl.style.transform = "translateY(0)";
    }, 140);
  }

  function updateCards() {
    const vw = window.innerWidth;
    const isMobile = vw <= 600;

    // Responsive spread for the side shapes in 3D arc
    const spread = isMobile
      ? Math.min(160, Math.max(120, vw * 0.36))
      : Math.min(250, Math.max(180, vw * 0.28));

    const centerScale = isMobile ? 1.14 : 1.20;
    const sideScale   = isMobile ? 0.70 : 0.72;

    cards.forEach((card, i) => {
      // Circular difference: normalize to -2 ... +2 for 5 items
      let diff = (i - current) % total;
      if (diff < -2) diff += total;
      if (diff > 2)  diff -= total;

      if (diff === 0) {
        // Active Center Card — BIGGER, glowing, front & center
        card.style.transform     = `translateX(-50%) translateY(-50%) translateZ(65px) rotateY(0deg) scale(${centerScale})`;
        card.style.filter        = "blur(0px) brightness(1.08)";
        card.style.opacity       = "1";
        card.style.zIndex        = "15";
        card.style.pointerEvents = "auto";
        card.classList.add("active");
      } else if (diff === 1) {
        // Right side shape (curved back along circle)
        card.style.transform     = `translateX(calc(-50% + ${spread}px)) translateY(-50%) translateZ(-85px) rotateY(-30deg) scale(${sideScale})`;
        card.style.filter        = "blur(2px) brightness(0.60)";
        card.style.opacity       = "0.65";
        card.style.zIndex        = "4";
        card.style.pointerEvents = "auto";
        card.classList.remove("active");
      } else if (diff === -1) {
        // Left side shape (curved back along circle)
        card.style.transform     = `translateX(calc(-50% - ${spread}px)) translateY(-50%) translateZ(-85px) rotateY(30deg) scale(${sideScale})`;
        card.style.filter        = "blur(2px) brightness(0.60)";
        card.style.opacity       = "0.65";
        card.style.zIndex        = "4";
        card.style.pointerEvents = "auto";
        card.classList.remove("active");
      } else if (diff === 2) {
        // Far right / back (receded in background)
        card.style.transform     = `translateX(calc(-50% + ${spread * 1.5}px)) translateY(-50%) translateZ(-160px) rotateY(-50deg) scale(${sideScale * 0.75})`;
        card.style.filter        = "blur(4px) brightness(0.25)";
        card.style.opacity       = "0";
        card.style.zIndex        = "1";
        card.style.pointerEvents = "none";
        card.classList.remove("active");
      } else { // diff === -2
        // Far left / back (receded in background)
        card.style.transform     = `translateX(calc(-50% - ${spread * 1.5}px)) translateY(-50%) translateZ(-160px) rotateY(50deg) scale(${sideScale * 0.75})`;
        card.style.filter        = "blur(4px) brightness(0.25)";
        card.style.opacity       = "0";
        card.style.zIndex        = "1";
        card.style.pointerEvents = "none";
        card.classList.remove("active");
      }
    });

    // Dynamically update welcome and instruction text to match active card
    const activeLang = cards[current]?.dataset?.lang || "en";
    window._activeModalLang = activeLang;
    updateModalHeader(activeLang);

    // Update indicator dots
    const dots = document.querySelectorAll(".lang-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === current);
    });
  }

  function nextCard() {
    current = (current + 1) % total;
    updateCards();
  }

  function prevCard() {
    current = (current - 1 + total) % total;
    updateCards();
  }

  // Auto rotation
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(nextCard, 5500);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Click card to center, or enter if already active
  cards.forEach((card, i) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".lang-card-cta")) return; // CTA button handles its own click
      if (current !== i) {
        current = i;
        updateCards();
        startAuto();
      } else {
        selectLangAndEnter(card.dataset.lang);
      }
    });
  });

  // Arrows
  const prevArrow = document.getElementById("langPrevArrow");
  const nextArrow = document.getElementById("langNextArrow");
  if (prevArrow) {
    prevArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      prevCard();
      startAuto();
    });
  }
  if (nextArrow) {
    nextArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      nextCard();
      startAuto();
    });
  }

  // Dots
  const dots = document.querySelectorAll(".lang-dot");
  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      current = idx;
      updateCards();
      startAuto();
    });
  });

  // Pause on hover
  if (wrap) {
    wrap.addEventListener("mouseenter", stopAuto);
    wrap.addEventListener("mouseleave", startAuto);
  }

  // Swipe / Drag gesture (with vertical scroll detection)
  let startX = 0, startY = 0, isDragging = false, moved = false, isVerticalScroll = false;
  const THRESHOLD = 35;

  function onDragStart(x, y = 0) {
    startX = x;
    startY = y;
    isDragging = true;
    moved = false;
    isVerticalScroll = false;
    stopAuto();
    track.classList.add("is-grabbing");
  }

  function onDragMove(x, y = 0) {
    if (!isDragging) return;
    const dx = Math.abs(x - startX);
    const dy = Math.abs(y - startY);
    if (dy > dx && dy > 10) {
      isVerticalScroll = true;
      return;
    }
    if (dx > 10) moved = true;
  }

  function onDragEnd(x) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-grabbing");
    startAuto();
    if (!moved || isVerticalScroll) return;
    const dx = x - startX;
    if (dx < -THRESHOLD) {
      nextCard();
    } else if (dx > THRESHOLD) {
      prevCard();
    }
  }

  track.addEventListener("mousedown",  e => { onDragStart(e.clientX, e.clientY); });
  document.addEventListener("mousemove", e => onDragMove(e.clientX, e.clientY));
  document.addEventListener("mouseup",   e => onDragEnd(e.clientX));

  track.addEventListener("touchstart", e => onDragStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  track.addEventListener("touchmove",  e => onDragMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  track.addEventListener("touchend",   e => onDragEnd(e.changedTouches[0].clientX));

  window.addEventListener("resize", updateCards, { passive: true });
  updateCards();
  startAuto();
}

function initLangModal() {
  const overlay = document.getElementById("langModalOverlay");
  if (!overlay) return;

  setupLangCards3D();

  // If language was already selected during this visit, bypass splash
  if (sessionStorage.getItem("mrCafeLangSelected") === "true") {
    overlay.style.display = "none";
    return;
  }

  // 1. Mouse wheel down while on modal: automatically enters menu & scrolls down to menu
  overlay.addEventListener("wheel", (e) => {
    if (e.deltaY > 15) {
      selectLangAndEnter(window._activeModalLang || currentLang);
      setTimeout(() => {
        scrollToSection('coffee');
      }, 250);
    }
  }, { passive: true });

  // 2. Touch swipe up on mobile: automatically enters menu & scrolls down to menu
  let modalTouchStartY = 0;
  overlay.addEventListener("touchstart", (e) => {
    modalTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  overlay.addEventListener("touchend", (e) => {
    const deltaY = modalTouchStartY - e.changedTouches[0].clientY;
    if (deltaY > 35) {
      selectLangAndEnter(window._activeModalLang || currentLang);
      setTimeout(() => {
        scrollToSection('coffee');
      }, 250);
    }
  }, { passive: true });

  // 3. Click backdrop outside modal card: dismisses modal and enters menu
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      selectLangAndEnter(window._activeModalLang || currentLang);
    }
  });

  // 4. Escape key dismisses modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none" && !overlay.classList.contains("is-dismissed")) {
      selectLangAndEnter(window._activeModalLang || currentLang);
    }
  });
}


// ============================================================
//  RENDER: CATEGORY NAV
// ============================================================
function renderCatNav() {
  const nav = document.getElementById("catNavInner");
  if (!nav) return;
  nav.innerHTML = categories.map(cat => `
    <button
      class="cat-btn"
      id="catBtn-${cat}"
      data-cat="${cat}"
      onclick="scrollToSection('${cat}')"
      aria-label="${t('categories.' + cat)}"
    >
      <span class="cat-icon">${t('cat_icons.' + cat)}</span>
      <span class="cat-label">${t('categories.' + cat)}</span>
    </button>
  `).join("");
}

// ============================================================
//  RENDER: MENU
// ============================================================
function renderMenu() {
  categories.forEach(cat => {
    const section = document.getElementById("section-" + cat);
    const grid    = document.getElementById("grid-" + cat);
    if (!section || !grid) return;

    // Update section title
    const titleEl = section.querySelector(".section-title");
    if (titleEl) titleEl.textContent = t("categories." + cat);

    // Build cards (duplicated 4x for truly seamless infinite loop with no end)
    const items  = menuItems.filter(item => item.category === cat);
    const html   = items.map(item => buildCard(item)).join("");
    const copies = 4;
    grid.innerHTML = html.repeat(copies);

    // Launch carousel (destroy old one first if language was switched)
    if (grid._carousel) grid._carousel.destroy();
    grid._carousel = new InfiniteCarousel(grid, copies);
  });

  // No-results message
  const nr = document.getElementById("noResults");
  if (nr) nr.innerHTML = `
    <div class="no-results-icon">☕</div>
    <p class="no-results-text">${t("no_results")}</p>
    <p class="no-results-sub">${t("no_results_sub")}</p>
  `;
}

// ============================================================
//  BUILD CARD HTML
// ============================================================
function buildCard(item) {
  const name  = item.name[currentLang] || item.name.en;
  const desc  = item.desc[currentLang] || item.desc.en;
  const badge = item.popular
    ? `<span class="badge-popular">★ ${t("popular")}</span>`
    : "";

  const imageHtml = item.image
    ? `<img
         src="${item.image}"
         alt="${name}"
         loading="lazy"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
       />
       <div class="card-placeholder" style="display:none;">
         <span class="card-placeholder-icon">${t("cat_icons." + item.category)}</span>
       </div>`
    : `<div class="card-placeholder">
         <span class="card-placeholder-icon">${t("cat_icons." + item.category)}</span>
       </div>`;

  return `
    <article class="menu-card" onclick="toggleCard(this)" role="button" tabindex="0" aria-label="${name} - tap to view description">
      <div class="card-image-wrap">
        ${imageHtml}
        ${badge}
      </div>
      <div class="card-body">
        <h3 class="menu-item-name">${name}</h3>
        <p class="menu-item-desc">${desc}</p>
        <div class="card-footer">
          <span class="menu-item-price">${item.price}</span>
        </div>
      </div>
    </article>
  `;
}

// ============================================================
//  FOOTER
// ============================================================
function updateFooter() {
  const el = document.getElementById("footerTagline");
  if (el) el.textContent = t("footer_tagline");
}

// ============================================================
//  CATEGORY SCROLL & HIGHLIGHT
// ============================================================
function scrollToSection(cat) {
  closeAllExpandedCards();
  const section = document.getElementById("section-" + cat);
  if (!section) return;
  const catNav = document.querySelector(".cat-nav");
  const catNavH = catNav ? catNav.offsetHeight : 60;
  const offset = catNavH + 20;
  const elementPosition = section.getBoundingClientRect().top + window.scrollY;
  const targetY = Math.max(0, elementPosition - offset);

  window.scrollTo({ top: targetY, behavior: "smooth" });
  setActiveCategory(cat);
}

function setActiveCategory(cat) {
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  const btn = document.getElementById("catBtn-" + cat);
  const navInner = document.getElementById("catNavInner");
  if (btn && navInner) {
    const targetLeft = btn.offsetLeft - (navInner.clientWidth - btn.clientWidth) / 2;
    navInner.scrollTo({ left: targetLeft, behavior: "smooth" });
  }
}

// ── Scroll spy ──────────────────────────────────────────────
function setupScrollSpy() {
  const catNavH  = document.querySelector(".cat-nav")?.offsetHeight || 0;
  const topMargin = -(catNavH + 24) + "px";

  const spy = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) setActiveCategory(e.target.dataset.cat);
    }),
    { rootMargin: `${topMargin} 0px -55% 0px`, threshold: 0 }
  );
  categories.forEach(cat => {
    const s = document.getElementById("section-" + cat);
    if (s) spy.observe(s);
  });
}

// ============================================================
//  BUILD SECTION SKELETONS
// ============================================================
function buildSections() {
  const container = document.getElementById("menuContainer");
  if (!container) return;
  container.innerHTML = categories.map(cat => `
    <section class="menu-section" id="section-${cat}" data-cat="${cat}">
      <div class="section-header">
        <div class="section-title-badge">
          <span class="section-subtitle-icon">${CLASSIC_ICONS[cat]}</span>
          <h2 class="section-title">${t("categories." + cat)}</h2>
        </div>
        <div class="section-divider">
          <span class="section-divider-dot">✦</span>
        </div>
      </div>
      <div class="carousel-wrapper">
        <div class="menu-grid" id="grid-${cat}"></div>
        <div class="carousel-fade-right"></div>
        <div class="carousel-fade-left"></div>
      </div>
    </section>
  `).join("") + `<div class="no-results" id="noResults"></div>`;
}

// ============================================================
//  INIT
// ============================================================
function init() {
  initLangModal();

  // Hero is now static HTML — no renderHero() needed
  renderCatNav();
  buildSections();
  setLanguage(currentLang);   // renders menu + sets RTL

  // Hero cards drag-scroll
  setupHeroCards();

  // Section & Items bidirectional reveal on scroll (scroll down & scroll up)
  const sectionObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      const rect = e.boundingClientRect;
      if (e.isIntersecting) {
        if (scrollDir === 'down') {
          e.target.classList.remove('reveal-from-top');
          e.target.classList.add('reveal-from-bottom');
        } else {
          e.target.classList.remove('reveal-from-bottom');
          e.target.classList.add('reveal-from-top');
        }
        e.target.classList.add('revealed');
      } else {
        e.target.classList.remove('revealed');
        // When leaving view, prepare direction for next time:
        if (rect.top > 0) {
          e.target.classList.remove('reveal-from-top');
          e.target.classList.add('reveal-from-bottom');
        } else {
          e.target.classList.remove('reveal-from-bottom');
          e.target.classList.add('reveal-from-top');
        }
      }
    }),
    { threshold: 0.05, rootMargin: '10px 0px -25px 0px' }
  );

  categories.forEach(cat => {
    const s = document.getElementById("section-" + cat);
    if (s) {
      s.classList.add("reveal-from-bottom");
      sectionObserver.observe(s);
    }
  });

  setTimeout(setupScrollSpy, 200);
  setActiveCategory("coffee");
}

document.addEventListener("DOMContentLoaded", init);

