/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import * as THREE from 'three';

const textureCache = new Map();

/**
 * Creates or retrieves a cached CanvasTexture with glowing neon aura for emojis
 * @param {string} emoji
 * @param {string} glowColor
 * @returns {THREE.CanvasTexture}
 */
export function getEmojiTexture(emoji, glowColor = '#ffaa00') {
  const key = `${emoji}_${glowColor}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.clearRect(0, 0, 128, 128);

  // Outer ambient glow ring
  const gradient = ctx.createRadialGradient(64, 64, 16, 64, 64, 60);
  gradient.addColorStop(0, glowColor + '99');
  gradient.addColorStop(0.6, glowColor + '33');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  // Draw Emoji centered
  ctx.font = '72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.fillText(emoji, 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(key, texture);

  return texture;
}
