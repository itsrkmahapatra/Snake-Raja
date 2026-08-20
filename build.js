/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy core web assets
fs.copyFileSync('index.html', path.join(distDir, 'index.html'));
fs.copyFileSync('style.css', path.join(distDir, 'style.css'));
fs.cpSync('js', path.join(distDir, 'js'), { recursive: true });

// Copy public assets to dist root AND dist/public for 100% path compatibility
if (fs.existsSync('public')) {
  fs.cpSync('public', path.join(distDir, 'public'), { recursive: true });

  const publicFiles = fs.readdirSync('public');
  for (const file of publicFiles) {
    const srcPath = path.join('public', file);
    const destPath = path.join(distDir, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('✓ Successfully prepared distribution bundle in ./dist for GitHub Pages!');
