import { build } from 'esbuild';
import { execSync } from 'child_process';
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
copyFileSync(join(__dirname, '../src/styles/app.css'), join(__dirname, 'app.css'));

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.es.js',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  jsx: 'automatic',
});

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.cjs',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  jsx: 'automatic',
});

execSync('npx tsc --declaration --emitDeclarationOnly --outDir dist --rootDir src', {
  stdio: 'inherit',
});
