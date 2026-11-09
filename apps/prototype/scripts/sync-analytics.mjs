// Copies @vercel/analytics' browser build into vendor/ so static HTML can import it.
// Vercel does not serve node_modules. Run via postinstall and `npm run sync-analytics`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function analyticsBrowserSource() {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve('@vercel/analytics/package.json');
  const browserBuild = join(dirname(packageJson), 'dist', 'index.mjs');
  return readFileSync(browserBuild, 'utf8').replace(/\n\/\/# sourceMappingURL=.*$/, '');
}

export function vendorPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'vercel-analytics.js');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const destination = vendorPath();
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, analyticsBrowserSource());
}
