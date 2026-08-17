/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates or retrieves a high-resolution glowing canvas texture for any emoji.
 */
export function getEmojiTexture(
  emoji: string,
  glowColor: string = '#ffaa00',
  size: number = 256
): THREE.CanvasTexture {
  const key = `${emoji}_${glowColor}_${size}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Soft radial aura / glow backdrop
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.08,
      size / 2,
      size / 2,
      size * 0.48
    );
    gradient.addColorStop(0, glowColor + '77');
    gradient.addColorStop(0.5, glowColor + '22');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Glowing emoji text rendering
    ctx.font = `${Math.floor(size * 0.58)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

export const EMOJI_HEADS = {
  snake: { emoji: '🐍', glow: '#00ff88', name: 'Serpent Raja' },
  skull: { emoji: '💀', glow: '#bb00ff', name: 'Shadow Reaper' },
  robot: { emoji: '🤖', glow: '#00e5ff', name: 'Cyber Mech' },
} as const;

export const EMOJI_LOOT = {
  medkit: { emoji: '❤️', glow: '#ff0055', label: 'Life Core' },
  armor: { emoji: '🛡️', glow: '#00aaff', label: 'Cyber Shield' },
  weapon: { emoji: '⚔️', glow: '#bf00ff', label: 'Plasma Blade' },
  ammo: { emoji: '⚡', glow: '#ffbb00', label: 'Cosmic Energy' },
} as const;
