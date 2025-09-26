const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const body = document.body;
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
  if (!themeIcon) return;
  const nextMode = theme === 'light' ? 'dark' : 'light';
  themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
  themeToggle.setAttribute('aria-label', `Activate ${nextMode} mode`);
}

// Blog rendering and admin portal
const blogGrid = document.querySelector('.blog-grid');
const blogEmptyState = document.querySelector('.blog-empty');
const adminTrigger = document.querySelector('.admin-trigger');
const adminModal = document.querySelector('.admin-modal');
const adminClose = document.querySelector('.admin-close');
const loginForm = document.querySelector('.admin-login');
const dashboardForm = document.querySelector('.admin-dashboard');
const errorMessage = loginForm?.querySelector('.form-error');
const logoutButton = document.querySelector('.admin-logout');

const BLOG_STORAGE_KEY = 'aidenyue-blog-posts';
const defaultPosts = [
  {
    title: 'Quarter-Million Lessons from Asynq Designs',
    summary:
      'A deep dive into how intentional visual systems, vendor partnerships, and community-building scaled Asynq Designs past $250K before I turned 18.',
    link: 'https://www.linkedin.com/company/asynq-designs/'
  },
  {
    title: 'Bridging Lab Research and Venture Operations',
    summary:
      'Balancing cardiology research responsibilities with e-commerce leadership has sharpened my ability to translate data into action-ready insights.',
    link: 'https://www.linkedin.com/in/aidenyue/'
  }
];

let storedPosts = [];
try {
  storedPosts = JSON.parse(window.localStorage?.getItem(BLOG_STORAGE_KEY) || '[]');
  if (!Array.isArray(storedPosts)) {
    storedPosts = [];
  }
} catch (error) {
  storedPosts = [];
}

renderBlog([...storedPosts, ...defaultPosts]);

function renderBlog(posts) {
  if (!blogGrid) return;
  blogGrid.innerHTML = '';

  if (!posts.length) {
    blogGrid.dataset.empty = 'true';
    if (blogEmptyState) {
      blogEmptyState.hidden = false;
    }
    return;
  }

  blogGrid.dataset.empty = 'false';
  if (blogEmptyState) {
    blogEmptyState.hidden = true;
  }

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';

    const title = document.createElement('h3');
    title.textContent = post.title;
    article.appendChild(title);

    const summary = document.createElement('p');
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

    blogGrid.appendChild(article);
  });
}

adminTrigger?.addEventListener('click', () => {
  openAdminModal();
});

adminClose?.addEventListener('click', () => {
  closeAdminModal();
});

adminModal?.addEventListener('click', (event) => {
  if (event.target === adminModal) {
    closeAdminModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !adminModal?.hidden) {
    closeAdminModal();
  }
});

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get('username');
  const password = formData.get('password');

  if (username === 'Antivity' && password === 'Antivity') {
    errorMessage?.setAttribute('hidden', '');
    loginForm.hidden = true;
    dashboardForm?.removeAttribute('hidden');
    dashboardForm?.querySelector("input[name='title']")?.focus();
  } else {
    errorMessage?.removeAttribute('hidden');
  }
});

dashboardForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(dashboardForm);
  const title = formData.get('title');
  const summary = formData.get('summary');
  const link = formData.get('link');

  if (!title || !summary) {
    return;
  }

  const newPost = {
    title: String(title),
    summary: String(summary),
    link: link ? String(link) : ''
  };

  storedPosts.unshift(newPost);
  window.localStorage?.setItem(BLOG_STORAGE_KEY, JSON.stringify(storedPosts));
  renderBlog([...storedPosts, ...defaultPosts]);
  dashboardForm.reset();
  dashboardForm.querySelector("input[name='title']")?.focus();
});

logoutButton?.addEventListener('click', () => {
  logoutAdmin();
});

function openAdminModal() {
  if (!adminModal) return;
  adminModal.hidden = false;
  body.classList.add('modal-open');
  loginForm?.removeAttribute('hidden');
  dashboardForm?.setAttribute('hidden', '');
  errorMessage?.setAttribute('hidden', '');
  loginForm?.reset();
  requestAnimationFrame(() => {
    loginForm?.querySelector("input[name='username']")?.focus();
  });
}

function closeAdminModal() {
  if (!adminModal) return;
  adminModal.hidden = true;
  body.classList.remove('modal-open');
  loginForm?.reset();
  dashboardForm?.reset();
}

function logoutAdmin() {
  loginForm?.reset();
  dashboardForm?.setAttribute('hidden', '');
  loginForm?.removeAttribute('hidden');
  errorMessage?.setAttribute('hidden', '');
  loginForm?.querySelector("input[name='username']")?.focus();
}

