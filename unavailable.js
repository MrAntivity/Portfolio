(() => {
  const button = document.querySelector('.theme-toggle');
  function theme(value) {
    document.body.dataset.theme = value;
    button.setAttribute('aria-label', `Switch to ${value === 'light' ? 'dark' : 'light'} theme`);
    button.setAttribute('aria-pressed', String(value === 'light'));
    document.querySelector('meta[name="theme-color"]').content = value === 'light' ? '#f3f2ee' : '#090909';
  }
  let saved; try { saved = localStorage.getItem('aidenyue-theme-preference'); } catch {}
  theme(saved === 'light' ? 'light' : 'dark');
  button.addEventListener('click', () => {
    const value = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    theme(value);
    try { localStorage.setItem('aidenyue-theme-preference', value); } catch {}
  });
})();
