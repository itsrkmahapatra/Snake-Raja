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

// Copy essential web assets to dist for GitHub Pages Action workflow
fs.copyFileSync('index.html', path.join(distDir, 'index.html'));
fs.copyFileSync('style.css', path.join(distDir, 'style.css'));
fs.cpSync('js', path.join(distDir, 'js'), { recursive: true });

if (fs.existsSync('public')) {
  fs.cpSync('public', path.join(distDir, 'public'), { recursive: true });
}

console.log('✓ Successfully prepared distribution bundle in ./dist for GitHub Pages!');
