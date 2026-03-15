#!/usr/bin/env node
/**
 * Generates placeholder icons for development.
 * Replace with your real icons before distribution.
 *
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Minimal 1x1 transparent PNG as placeholder
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const icons = ['icon.png', 'tray-icon.png'];

icons.forEach((icon) => {
  const iconPath = path.join(assetsDir, icon);
  if (!fs.existsSync(iconPath)) {
    fs.writeFileSync(iconPath, TRANSPARENT_PNG);
    console.log(`Created placeholder: assets/${icon}`);
  } else {
    console.log(`Already exists: assets/${icon}`);
  }
});

console.log('\n⚠️  Placeholder Icons erstellt.');
console.log('Ersetze die Dateien in assets/ mit echten Icons:');
console.log('  - icon.png      (512x512px, App-Icon)');
console.log('  - tray-icon.png (16x16px,  Tray-Icon)');
console.log('  - icon.ico      (Windows)');
console.log('  - icon.icns     (macOS)');
