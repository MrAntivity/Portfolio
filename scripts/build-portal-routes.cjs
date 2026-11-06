// GitHub Pages needs a physical entry point for direct visits to each route.
// Run after editing viro/index.html; all entries use the same authenticated app.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'viro/index.html'), 'utf8');
for (const route of ['overview', 'todos', 'birthdays', 'contacts', 'calendar', 'files', 'budget', 'vault']) {
  const dir = path.join(root, 'viro', route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
