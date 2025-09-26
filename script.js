const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const body = document.body;
const pageType = body.dataset.page || 'home';
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle?.querySelector('.material-symbols-outlined');
const header = document.querySelector('.site-header');
const THEME_STORAGE_KEY = 'aidenyue-theme-preference';

const savedTheme = window.localStorage?.getItem(THEME_STORAGE_KEY);
const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
setTheme(initialTheme);

themeToggle?.addEventListener('click', () => {
  const nextTheme = body.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
  window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
});

function setTheme(theme) {
  body.dataset.theme = theme;
  if (!themeIcon || !themeToggle) return;
  const nextMode = theme === 'light' ? 'dark' : 'light';
  themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
  themeToggle.setAttribute('aria-label', `Activate ${nextMode} mode`);
}

let lastScrollY = window.scrollY || 0;
let scrollRaf = null;

function updateScrollUI() {
  scrollRaf = null;
  const currentScroll = window.scrollY || 0;
  const maxScroll = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1
  );
  const progress = Math.min(Math.max(currentScroll / maxScroll, 0), 1);
  document.documentElement.style.setProperty(
    '--scroll-progress',
    progress.toFixed(3)
  );

  if (header) {
    if (!header.dataset.scrollDirection) {
      header.dataset.scrollDirection = 'up';
    }
    header.classList.toggle('is-condensed', currentScroll > 40);
    header.dataset.scrollDirection = currentScroll > lastScrollY ? 'down' : 'up';
  }

  lastScrollY = currentScroll;
}

function onScroll() {
  if (scrollRaf !== null) return;
  scrollRaf = window.requestAnimationFrame(updateScrollUI);
}

window.addEventListener('scroll', onScroll, { passive: true });
updateScrollUI();

if (pageType === 'home') {
  const sectionLinks = Array.from(
    document.querySelectorAll('.site-nav a[href*="#"]')
  ).filter((link) => {
    const href = link.getAttribute('href');
    if (!href) return false;
    if (!href.includes('#')) return false;
    return href.startsWith('#') || href.startsWith('index.html#');
  });

  const sectionMap = new Map();

  sectionLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const [, hash] = href.split('#');
    if (!hash) return;
    const section = document.getElementById(hash);
    if (!section) return;
    sectionMap.set(section, link);
  });

  if (sectionMap.size) {
    let activeLink = null;
    const sections = Array.from(sectionMap.keys());

    const activateLink = (nextLink) => {
      if (!nextLink || nextLink === activeLink) return;
      if (activeLink && activeLink.getAttribute('aria-current') === 'section') {
        activeLink.removeAttribute('aria-current');
      }
      activeLink = nextLink;
      if (activeLink.getAttribute('aria-current') !== 'page') {
        activeLink.setAttribute('aria-current', 'section');
      }
    };

    activateLink(sectionMap.get(sections[0]));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;

        const candidate = sectionMap.get(visible[0].target);
        activateLink(candidate);
      },
      {
        rootMargin: '-45% 0px -40% 0px',
        threshold: [0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));

    window.addEventListener('beforeunload', () => observer.disconnect(), {
      once: true
    });
  }
}

const ADMIN_CREDENTIALS = { username: 'Antivity', password: 'Antivity' };
const ADMIN_SESSION_KEY = 'aidenyue-admin-session';

const blogPosts = [
  {
    title: 'From Busan Clinics to Kyoto Labs: Mapping a Joint Research Sprint',
    summary:
      'A condensed 23-day route let me observe wearable diagnostics pilots in Busan before pressure-testing them with Kyoto cardiology fellows, surfacing shared data standards for my ongoing research.',
    meta: 'Research Ops · Transnational Cohort',
    createdAt: '2025-04-24T09:00:00.000Z'
  },
  {
    title: 'Seoul x Osaka: 23 Days of Japan & Korea Innovation Exchanges',
    summary:
      'In 2025 I spent 23 days toggling between Osaka maker spaces and Seoul digital health accelerators, prototyping bilingual intake flows and co-hosting founder salons on cross-border care.',
    meta: 'Field Notes · Japan & Korea 2025',
    createdAt: '2025-04-16T09:00:00.000Z'
  },
  {
    title: 'Transferring from UCR to BU: Reframing My Pre-Med Trajectory',
    summary:
      'After 50 units and a 3.9 GPA at UC Riverside, I transferred to Boston University to align lab access with my entrepreneurial work—bringing west coast research rigor into BU’s cardiology ecosystem.',
    meta: 'Academic Journey',
    createdAt: '2025-02-05T09:00:00.000Z'
  },
  {
    title: 'Design Ops on the Shinkansen: Building a Portable Lab Kit for Japan',
    summary:
      'From JR rail passes to modular data rigs, I iterated a travel stack that let me capture biometric interviews, culinary ethnography, and design sketches every night during the 38-day Japan residency.',
    meta: 'Logistics · 38 Days Abroad',
    createdAt: '2024-05-26T09:00:00.000Z'
  },
  {
    title: 'Tokyo to Sapporo: 38-Day Japan Field Immersion',
    summary:
      'I stitched together a 38-day spring 2024 itinerary from Tokyo coworking labs to Sapporo research wards, interviewing med-tech founders, mapping transit data, and observing how hospitality influences patient experience across seven cities.',
    meta: 'Field Notes · Japan 2024 Expedition',
    createdAt: '2024-05-18T09:00:00.000Z'
  }
];

const adminAccessDenied = pageType === 'admin' && !isAuthenticated();
if (adminAccessDenied) {
  window.location.replace('login.html');
}

if (pageType === 'login' && isAuthenticated()) {
  window.location.replace('admin.html');
}

const blogViews = [];

function registerBlogView(container, emptyState, options = {}) {
  if (!container) return;
  blogViews.push({ container, emptyState: emptyState || null, options });
}

function updateBlogViews() {
  if (!blogViews.length) return;
  const posts = getAllPosts();
  blogViews.forEach((view) => {
    renderBlogList(view.container, view.emptyState, posts, view.options);
  });
}

function renderBlogList(container, emptyState, posts, options = {}) {
  const { showMeta = false } = options;
  container.innerHTML = '';

  if (!posts.length) {
    container.dataset.empty = 'true';
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }

  container.dataset.empty = 'false';
  if (emptyState) {
    emptyState.hidden = true;
  }

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';

    const title = document.createElement('h3');
    title.textContent = post.title;
    article.appendChild(title);

    if (showMeta) {
      const metaText = createMetaText(post);
      if (metaText) {
        const meta = document.createElement('p');
        meta.className = 'blog-card__meta';
        meta.textContent = metaText;
        article.appendChild(meta);
      }
    }

    const summary = document.createElement('p');
    summary.className = 'blog-card__summary';
    summary.textContent = post.summary;
    article.appendChild(summary);

    if (post.link) {
      const anchor = document.createElement('a');
      anchor.href = post.link;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = 'Read more';
      article.appendChild(anchor);
    }

    container.appendChild(article);
  });
}

function createMetaText(post) {
  if (post.meta) {
    return post.meta;
  }
  if (post.createdAt) {
    const formatted = formatDate(post.createdAt);
    return formatted ? `Published ${formatted}` : 'Published entry';
  }
  return '';
}

function getAllPosts() {
  return [...blogPosts];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function isAuthenticated() {
  return window.localStorage?.getItem(ADMIN_SESSION_KEY) === 'true';
}

const loginForm = document.querySelector('[data-login-form]');
const loginError = document.querySelector('[data-login-error]');

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get('username');
  const password = formData.get('password');

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    loginError?.setAttribute('hidden', '');
    window.localStorage?.setItem(ADMIN_SESSION_KEY, 'true');
    window.location.replace('admin.html');
  } else {
    loginError?.removeAttribute('hidden');
  }
});

const logoutButton = !adminAccessDenied ? document.querySelector('[data-logout]') : null;
logoutButton?.addEventListener('click', () => {
  window.localStorage?.removeItem(ADMIN_SESSION_KEY);
  window.location.replace('login.html');
});

let adminDataContainer = null;
if (!adminAccessDenied) {
  adminDataContainer = document.querySelector('[data-admin-data]');
}

function renderAdminData() {
  if (!adminDataContainer) return;
  const dataPoints = [
    {
      label: 'Published blog features',
      value: `${blogPosts.length}`,
      helper: 'Static travel journals and academic milestones'
    },
    {
      label: '2024 Japan immersion',
      value: '38 days · 7 cities · 112 km walked',
      helper: 'Interviews with med-tech founders and hospitality teams'
    },
    {
      label: '2025 Japan & Korea sprint',
      value: '23 days · 9 partner meetings · 4 field labs',
      helper: 'Osaka maker spaces and Seoul digital health accelerators'
    },
    {
      label: 'Academic trajectory',
      value: 'Transferred UCR → Boston University',
      helper: '50 units completed with 3.9 GPA before transition'
    },
    {
      label: 'Research focus',
      value: 'Cardiology, translational medicine & healthcare innovation'
    },
    {
      label: 'Venture footprint',
      value: 'Asynq Designs · Asynq Ventures',
      helper: '2.8K newsletter readers · 18 advising founders'
    },
    {
      label: 'Travel documentation stack',
      value: 'Notion travel OS · Airtable lab index · Sony A7C II rig'
    },
    {
      label: 'Upcoming fieldwork',
      value: 'Osaka med-tech residency · Seoul biotech incubator visit',
      helper: 'Scheduled August 2025 itinerary'
    },
    {
      label: 'Contact channels',
      value: 'aidenyue2006@gmail.com · aidenyue@bu.edu · LinkedIn'
    }
  ];

  adminDataContainer.innerHTML = '';
  dataPoints.forEach((point) => {
    const card = document.createElement('article');
    card.className = 'admin-data-card';

    const title = document.createElement('h3');
    title.textContent = point.label;
    card.appendChild(title);

    const value = document.createElement('p');
    value.className = 'admin-data-card__value';
    value.textContent = point.value;
    card.appendChild(value);

    if (point.helper) {
      const helper = document.createElement('p');
      helper.className = 'admin-data-card__helper';
      helper.textContent = point.helper;
      card.appendChild(helper);
    }

    adminDataContainer.appendChild(card);
  });
}

registerBlogView(
  document.querySelector('[data-blog-grid]'),
  document.querySelector('[data-blog-empty]'),
  { showMeta: true }
);

if (!adminAccessDenied) {
  registerBlogView(
    document.querySelector('[data-admin-posts]'),
    null,
    { showMeta: true }
  );
}

updateBlogViews();

if (!adminAccessDenied) {
  renderAdminData();
}
