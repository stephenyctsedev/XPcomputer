import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Portfolio/',
  // xp.css ships pre-minified CSS with a `:before:not(...)` selector chain that Vite's
  // default lightningcss minifier rejects as invalid (browsers accept it; it's a legacy
  // quirk, and the file is already minified). Skip re-minifying CSS to avoid the crash;
  // esbuild isn't bundled with this Vite install to use as a drop-in replacement.
  build: { target: 'es2020', sourcemap: false, cssMinify: false },
});
