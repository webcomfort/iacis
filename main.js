const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('header');
const menuButtons = [...header.querySelectorAll('[data-menu-toggle]')];
const menuPanels = [...header.querySelectorAll('[data-mega-panel]')];
const mobileMenu = document.querySelector('#mobile-menu');
const mobileToggle = header.querySelector('[data-toggle-mobile]');
const searchPanel = document.querySelector('#header-search');
const searchForm = document.querySelector('#site-search-form');
const searchInput = document.querySelector('#q');
const searchResults = document.querySelector('#site-search-results');
const searchToggle = header.querySelector('[aria-controls="header-search"]');
let currentMenu = -1;
let pinnedMenu = false;
let searchMode = 'site';
let searchTrigger = searchToggle;

function showMenu(index) {
  currentMenu = index;
  menuButtons.forEach((button, i) => {
    button.setAttribute('aria-expanded', i === index);
    menuPanels[i].hidden = i !== index;
  });
}

function showMobileMenu(open) {
  mobileMenu.hidden = !open;
  mobileToggle.setAttribute('aria-expanded', open);
  mobileToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}

function closeSearch(restoreFocus = false) {
  searchPanel.hidden = true;
  searchToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) searchTrigger.focus();
}

function openSearch(mode, trigger) {
  showMenu(-1);
  pinnedMenu = false;
  showMobileMenu(false);
  if (!searchPanel.contains(trigger)) searchTrigger = trigger;
  searchMode = mode;
  const documents = mode === 'docs';
  searchPanel.hidden = false;
  searchToggle.setAttribute('aria-expanded', 'true');
  searchForm.querySelector('label').textContent = documents ? 'Поиск по базе документов' : 'Поиск по сайту';
  searchInput.placeholder = documents
    ? 'Название, номер или ключевые слова документа'
    : 'Новости, мероприятия, документы, люди';
  for (const button of searchForm.querySelectorAll('[data-search-mode]')) {
    button.setAttribute('aria-pressed', button.dataset.searchMode === mode);
  }
  searchResults.hidden = true;
  searchInput.focus();
}

for (const [index, button] of menuButtons.entries()) {
  button.addEventListener('click', () => {
    pinnedMenu = currentMenu !== index || !pinnedMenu;
    closeSearch();
    showMenu(pinnedMenu ? index : -1);
  });
  button.parentElement.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || !searchPanel.hidden) return;
    if (menuPanels[currentMenu]?.contains(document.activeElement)) return;
    pinnedMenu = false;
    showMenu(index);
  });
}

header.addEventListener('pointerleave', () => {
  if (!pinnedMenu && !menuPanels[currentMenu]?.contains(document.activeElement)) showMenu(-1);
});

mobileToggle.addEventListener('click', () => {
  closeSearch();
  showMenu(-1);
  showMobileMenu(mobileMenu.hidden);
});

matchMedia('(max-width: 1300px)').addEventListener('change', () => {
  showMenu(-1);
  pinnedMenu = false;
  showMobileMenu(false);
});

for (const button of document.querySelectorAll('[data-search-mode]')) {
  button.addEventListener('click', () => openSearch(button.dataset.searchMode, button));
}

header.querySelector('[data-close-search]').addEventListener('click', () => closeSearch(true));

header.addEventListener('click', (event) => {
  if (!event.target.closest('[data-mega-panel] a, #mobile-menu a')) return;
  showMenu(-1);
  pinnedMenu = false;
  showMobileMenu(false);
});

document.addEventListener('click', (event) => {
  if (header.contains(event.target) || event.target.closest('[data-search-mode]')) return;
  showMenu(-1);
  pinnedMenu = false;
  showMobileMenu(false);
  closeSearch();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!searchPanel.hidden) {
    closeSearch(true);
  } else if (!mobileMenu.hidden) {
    showMobileMenu(false);
    mobileToggle.focus();
  } else if (currentMenu !== -1) {
    menuButtons[currentMenu].focus();
    showMenu(-1);
    pinnedMenu = false;
  }
});

const normalize = (value) => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
const documentRows = [...document.querySelectorAll('[data-document]')];
const documentForm = document.querySelector('#document-search-form');
const documentInput = document.querySelector('#dq');
const documentCount = document.querySelector('#document-count');
const tags = [...documentForm.querySelectorAll('.tag')];

function filterDocuments() {
  const query = normalize(documentInput.value);
  const status = documentForm.elements.status.value;
  const field = documentForm.elements.field.value;
  const category = tags.find((tag) => tag.getAttribute('aria-pressed') === 'true')?.textContent;
  let shown = 0;

  for (const row of documentRows) {
    const matches = normalize(row.textContent).includes(query)
      && (!status || row.dataset.status === status)
      && (!field || row.dataset.field === field)
      && (!category || [row.dataset.category, row.dataset.field].includes(category));
    row.hidden = !matches;
    shown += Number(matches);
  }

  documentCount.textContent = shown
    ? 'Показано ' + shown + ' из ' + documentRows.length + ' актов на странице'
    : 'Документы не найдены';
}

documentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  filterDocuments();
});
documentForm.addEventListener('change', filterDocuments);
documentInput.addEventListener('search', filterDocuments);

for (const tag of tags) {
  tag.addEventListener('click', () => {
    const activate = tag.getAttribute('aria-pressed') !== 'true';
    for (const other of tags) other.setAttribute('aria-pressed', other === tag && activate);
    filterDocuments();
  });
}

const siteEntries = [...document.querySelectorAll('main > section[aria-labelledby]')].flatMap((section) => {
  const heading = document.getElementById(section.getAttribute('aria-labelledby'));
  const entries = [{ id: section.id || heading.id, title: heading.textContent, text: heading.textContent }];
  for (const [index, item] of [...section.querySelectorAll('.cardtitle, .prcard, [data-document]')].entries()) {
    item.id ||= heading.id + '-item-' + (index + 1);
    const title = item.querySelector('.cardlink, .font-bold')?.textContent || item.textContent;
    entries.push({ id: item.id, title: title.trim(), text: item.textContent });
  }
  return entries;
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (searchMode === 'docs') {
    documentForm.reset();
    for (const tag of tags) tag.setAttribute('aria-pressed', 'false');
    documentInput.value = searchInput.value;
    filterDocuments();
    closeSearch();
    documentInput.focus();
    return;
  }

  const query = normalize(searchInput.value);
  const matches = query ? siteEntries.filter((entry) => normalize(entry.text).includes(query)) : [];
  searchResults.replaceChildren();
  searchResults.hidden = false;

  if (!matches.length) {
    const message = document.createElement('li');
    message.textContent = query ? 'Ничего не найдено' : 'Введите поисковый запрос';
    searchResults.append(message);
    return;
  }

  for (const entry of matches) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#' + entry.id;
    link.className = 'inline-block py-2 font-medium';
    link.textContent = entry.title;
    link.addEventListener('click', () => closeSearch());
    item.append(link);
    searchResults.append(item);
  }
});

function setupCarousel(carousel, delay) {
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const dots = [...carousel.querySelectorAll('[data-carousel-go]')];
  const number = carousel.querySelector('[data-slide-number]');
  const rotation = carousel.querySelector('[data-toggle-rotation]');
  const progress = dots.map((dot) => dot.querySelector('[data-slide-progress]'));
  let index = 0;
  let timer;
  let paused = reducedMotion.matches;

  function render(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.toggleAttribute('data-active', active);
      if (slide.matches('a')) {
        slide.setAttribute('aria-hidden', !active);
        slide.tabIndex = active ? 0 : -1;
      }
    });
    dots.forEach((dot, i) => {
      dot.setAttribute('aria-current', i === index);
      const indicator = progress[i];
      if (!indicator) return;
      indicator.hidden = true;
      if (i === index) {
        // Reinsert to restart the progress animation after a manual selection.
        indicator.replaceWith(indicator.cloneNode());
        progress[i] = dot.querySelector('[data-slide-progress]');
        progress[i].hidden = false;
      }
    });
    if (number) {
      number.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    }
  }

  function restart() {
    clearInterval(timer);
    carousel.toggleAttribute('data-paused', paused);
    if (rotation) {
      rotation.setAttribute('aria-label', paused ? 'Возобновить автопрокрутку' : 'Остановить автопрокрутку');
      rotation.querySelector('[data-play-icon]').toggleAttribute('hidden', !paused);
      rotation.querySelector('[data-pause-icon]').toggleAttribute('hidden', paused);
    }
    if (!paused) {
      timer = setInterval(() => {
        if (rotation || !carousel.contains(document.activeElement)) render(index + 1);
      }, delay);
    }
  }

  function go(next) {
    render(next);
    restart();
  }

  carousel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button === rotation) {
      paused = !paused;
      go(index);
    } else if (button.matches('[data-carousel-go]')) {
      go(Number(button.dataset.carouselGo));
    } else if (button.matches('[data-carousel-step]')) {
      go(index + Number(button.dataset.carouselStep));
    }
  });

  reducedMotion.addEventListener('change', (event) => {
    paused = event.matches;
    go(index);
  });

  go(0);
}

setupCarousel(document.querySelector('[data-carousel="hero"]'), 7000);
setupCarousel(document.querySelector('[data-carousel="banners"]'), 8000);

const clocks = [...document.querySelectorAll('time[data-zone]')].map((element) => ({
  element,
  formatter: new Intl.DateTimeFormat('ru-RU', {
    timeZone: element.dataset.zone,
    hour: '2-digit',
    minute: '2-digit',
  }),
}));

function updateClocks() {
  const now = new Date();
  for (const { element, formatter } of clocks) {
    const time = formatter.format(now);
    element.textContent = time;
    element.dateTime = time;
  }
}

updateClocks();
setInterval(updateClocks, 15000);

const stats = document.querySelector('[data-stats]');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const counters = [...stats.querySelectorAll('[data-counter]')];
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    const start = performance.now();

    function animate(now) {
      const progress = Math.min(1, (now - start) / 1400);
      const completion = 1 - (1 - progress) ** 3;
      for (const counter of counters) {
        counter.textContent = Math.round(Number(counter.dataset.counter) * completion);
      }
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });

  observer.observe(stats);
}
