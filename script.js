const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const body = document.body;
const pageType = body.dataset.page || 'home';
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle?.querySelector('.material-symbols-outlined');
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

const ADMIN_CREDENTIALS = { username: 'Antivity', password: 'Antivity' };
const ADMIN_SESSION_KEY = 'aidenyue-admin-session';
const BLOG_STORAGE_KEY = 'aidenyue-blog-posts';

const defaultPosts = [
  {
    title: 'Quarter-Million Lessons from Asynq Designs',
    summary:
      'A deep dive into how intentional visual systems, vendor partnerships, and community-building scaled Asynq Designs past $250K before I turned 18.',
    link: 'https://www.linkedin.com/company/asynq-designs/',
    source: 'default'
  },
  {
    title: 'Bridging Lab Research and Venture Operations',
    summary:
      'Balancing cardiology research responsibilities with e-commerce leadership has sharpened my ability to translate data into action-ready insights.',
    link: 'https://www.linkedin.com/in/aidenyue/',
    source: 'default'
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
  if (post.source === 'default') {
    return 'Default spotlight entry';
  }
  if (post.createdAt) {
    const formatted = formatDate(post.createdAt);
    return formatted ? `Published ${formatted}` : 'Published entry';
  }
  return '';
}

function getStoredPosts() {
  try {
    const raw = JSON.parse(window.localStorage?.getItem(BLOG_STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((post) => post && post.title && post.summary)
      .map((post) => ({
        title: String(post.title),
        summary: String(post.summary),
        link: post.link ? String(post.link) : '',
        createdAt: post.createdAt ? String(post.createdAt) : null,
        source: 'custom'
      }));
  } catch (error) {
    return [];
  }
}

function saveStoredPosts(posts) {
  const serialisable = posts.map((post) => ({
    title: post.title,
    summary: post.summary,
    link: post.link,
    createdAt: post.createdAt ?? new Date().toISOString()
  }));

  window.localStorage?.setItem(BLOG_STORAGE_KEY, JSON.stringify(serialisable));
}

function getAllPosts() {
  return [...getStoredPosts(), ...defaultPosts];
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

const adminBlogForm = !adminAccessDenied ? document.querySelector('[data-admin-blog-form]') : null;
adminBlogForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(adminBlogForm);
  const title = formData.get('title');
  const summary = formData.get('summary');
  const link = formData.get('link');

  if (!title || !summary) {
    return;
  }

  const trimmedTitle = String(title).trim();
  const trimmedSummary = String(summary).trim();
  const trimmedLink = link ? String(link).trim() : '';

  if (!trimmedTitle || !trimmedSummary) {
    return;
  }

  const posts = getStoredPosts();
  posts.unshift({
    title: trimmedTitle,
    summary: trimmedSummary,
    link: trimmedLink,
    createdAt: new Date().toISOString(),
    source: 'custom'
  });

  saveStoredPosts(posts);
  adminBlogForm.reset();
  adminBlogForm.querySelector("input[name='title']")?.focus();
  updateBlogViews();
  updateAdminEmptyState();
  renderAdminData();
});

let adminEmptyNotice = null;
if (!adminAccessDenied) {
  adminEmptyNotice = document.querySelector('[data-admin-empty]');
}

function updateAdminEmptyState() {
  if (!adminEmptyNotice) return;
  adminEmptyNotice.hidden = getStoredPosts().length > 0;
}

let adminDataContainer = null;
if (!adminAccessDenied) {
  adminDataContainer = document.querySelector('[data-admin-data]');
}

function renderAdminData() {
  if (!adminDataContainer) return;
  const posts = getAllPosts();
  const storedPosts = getStoredPosts();

  const dataPoints = [
    {
      label: 'Published blog posts',
      value: `${posts.length}`,
      helper: `${storedPosts.length} custom, ${defaultPosts.length} default`
    },
    {
      label: 'Active ventures',
      value: 'Asynq Designs · Asynq Ventures'
    },
    {
      label: 'Research focus',
      value: 'Cardiology, translational medicine & healthcare innovation'
    },
    {
      label: 'Primary locations',
      value: 'Los Angeles Metropolitan Area · Boston, Massachusetts'
    },
    {
      label: 'Contact channels',
      value: 'aidenyue2006@gmail.com · aidenyue@bu.edu · linkedin.com/in/aidenyue'
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
  document.querySelector('[data-blog-empty]')
);

if (!adminAccessDenied) {
  registerBlogView(
    document.querySelector('[data-admin-posts]'),
    document.querySelector('[data-admin-empty]'),
    { showMeta: true }
  );
}

updateBlogViews();

if (!adminAccessDenied) {
  updateAdminEmptyState();
  renderAdminData();
}
