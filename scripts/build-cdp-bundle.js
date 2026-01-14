/**
 * Build script for CDP SDK bundle
 *
 * Bundles the CDP auth module and its dependencies into a single file
 * that can be loaded in the browser extension context.
 */

import * as esbuild from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(rootDir, 'src/auth/cdpAuth.js')],
      bundle: true,
      outfile: path.join(rootDir, 'dist/cdp-auth-bundle.js'),
      format: 'iife',
      globalName: 'CDPAuth',
      platform: 'browser',
      target: ['chrome100'],
      minify: false, // Keep readable for debugging
      sourcemap: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      // Handle Node.js built-ins and React that CDP SDK dependencies might reference
      external: ['react', 'react-dom'],
    });

    console.log('CDP auth bundle built successfully: dist/cdp-auth-bundle.js');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
