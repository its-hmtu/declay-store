/**
 * Production alias resolver.
 *
 * The TypeScript build keeps `@/...` imports in the emitted JS, which plain Node
 * cannot resolve. Registering the path mapping against `dist/` fixes that without
 * a build-time rewrite step. Loaded via `node -r ./register-paths.js dist/server.js`.
 */
const path = require('node:path');
const { register } = require('tsconfig-paths');

register({
  baseUrl: path.join(__dirname, 'dist'),
  paths: { '@/*': ['*'] },
});
