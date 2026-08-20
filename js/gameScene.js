/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import * as THREE from 'three';
import {
  WORLD_SIZE,
  TURN_SPEED,
  BOOST_SPEED,
  BASE_SPEED,
  EMOJI_HEADS,
  EMOJI_LOOT,
  roundCoord,
} from './constants.js';
import { getEmojiTexture } from './textures.js';

export class GameScene {
  constructor(canvasContainer, onStateSend, onCollectLoot, onKill, onChallengeProgress) {
    this.container = canvasContainer;
    this.onStateSend = onStateSend;
    this.onCollectLoot = onCollectLoot;
    this.onKill = onKill;
    this.onChallengeProgress = onChallengeProgress;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animId = null;

    this.playerId = null;
    this.gameState = null;

    this.localPlayer = {
      active: false,
      segments: [],
      score: 12,
      currentAngle: 0,
      isBoosting: false,
      lastSendTime: 0,
      health: 100,
      armor: 50,
      power: 20,
      lastHitTime: 0,
    };

    this.inputs = {
      left: false,
      right: false,
      boost: false,
      joystickActive: false,
      targetAngle: 0,
    };

    this.localCollectedLoot = new Set();
    this.lastDaredevilCheck = 0;
    this.clock = new THREE.Clock();

    // Meshes cache
    this.snakeMeshes = new Map(); // id -> { headMesh, bodyInstanced, dummy, positions }
    this.lootInstancedMeshes = new Map(); // type -> InstancedMesh
    this.lootDummy = new THREE.Object3D();

    this.init();
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#030408');

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 300);
    this.camera.position.set(0, 0, 35);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      depth: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 30, 40);
    this.scene.add(dirLight);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x05060b });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.z = -0.2;
    this.scene.add(ground);

    // Cyber Arena Grid
    const grid = new THREE.GridHelper(WORLD_SIZE, 60, 0x8b5cf6, 0x1e1035);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.1;
    this.scene.add(grid);

    // Starfield
    this.createStarfield();

    // Loot Instanced Meshes
    this.createLootMeshes();

    // Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.setupKeyboardListeners();

    // Start render loop
    this.animate();
  }

  createStarfield() {
    const starsCount = 500;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 220;
      positions[i + 1] = (Math.random() - 0.5) * 220;
      positions[i + 2] = (Math.random() - 0.5) * 60 - 20;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.8,
    });

    const starField = new THREE.Points(starGeo, starMat);
    this.scene.add(starField);
  }

  createLootMeshes() {
    const planeGeo = new THREE.PlaneGeometry(2.2, 2.2);

    for (const [type, config] of Object.entries(EMOJI_LOOT)) {
      const texture = getEmojiTexture(config.emoji, config.glow);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const instanced = new THREE.InstancedMesh(planeGeo, mat, 90);
      instanced.count = 0;
      this.scene.add(instanced);
      this.lootInstancedMeshes.set(type, instanced);
    }
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !this.inputs.left) this.inputs.left = true;
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !this.inputs.right) this.inputs.right = true;
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !this.inputs.boost) this.inputs.boost = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.inputs.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.inputs.right = false;
      if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.inputs.boost = false;
    });

    window.addEventListener('blur', () => {
      this.inputs.left = false;
      this.inputs.right = false;
      this.inputs.boost = false;
    });
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setGameState(state, playerId) {
    this.gameState = state;
    this.playerId = playerId;

    if (state && playerId && state.players && state.players[playerId]) {
      const p = state.players[playerId];
      if (p.state === 'alive' && (!this.localPlayer.active || this.localPlayer.segments.length === 0)) {
        this.localPlayer.active = true;
        this.localPlayer.segments = p.segments && p.segments.length > 0
          ? JSON.parse(JSON.stringify(p.segments))
          : [{ x: 0, y: 0 }];
        this.localPlayer.score = p.score || 12;
        this.localPlayer.currentAngle = p.currentAngle || 0;
        this.localPlayer.health = p.health || 100;
        this.localPlayer.armor = p.armor || 50;
        this.localPlayer.power = p.power || 20;
      }
    }
  }

  updateLootRendering(time) {
    if (!this.gameState || !this.gameState.loot) return;

    const counts = {};
    for (const type of this.lootInstancedMeshes.keys()) {
      counts[type] = 0;
    }

    for (const id in this.gameState.loot) {
      if (this.localCollectedLoot.has(id)) continue;
      const loot = this.gameState.loot[id];
      const type = loot.type || 'food';
      const instanced = this.lootInstancedMeshes.get(type);
      if (!instanced) continue;

      const idx = counts[type] || 0;
      if (idx >= 90) continue;

      this.lootDummy.position.set(loot.x, loot.y, 0.5);
      this.lootDummy.rotation.set(0, 0, Math.sin(time * 2.5 + loot.x) * 0.15);
      this.lootDummy.scale.setScalar(1.4);
      this.lootDummy.updateMatrix();

      instanced.setMatrixAt(idx, this.lootDummy.matrix);
      counts[type] = idx + 1;
    }

    for (const [type, instanced] of this.lootInstancedMeshes.entries()) {
      instanced.count = counts[type] || 0;
      instanced.instanceMatrix.needsUpdate = true;
    }
  }

  getOrCreateSnakeMesh(player) {
    if (this.snakeMeshes.has(player.id)) {
      return this.snakeMeshes.get(player.id);
    }

    const headConfig = EMOJI_HEADS[player.headType] || EMOJI_HEADS.snake;
    const texture = getEmojiTexture(headConfig.emoji, headConfig.glow);

    // Head Mesh
    const headGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const headMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    this.scene.add(headMesh);

    // Body Instanced Mesh
    const sphereGeo = new THREE.SphereGeometry(0.65, 12, 12);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: player.color || '#ffaa00',
      roughness: 0.35,
      metalness: 0.65,
      emissive: player.color || '#ffaa00',
      emissiveIntensity: 0.35,
    });
    const bodyInstanced = new THREE.InstancedMesh(sphereGeo, sphereMat, 250);
    bodyInstanced.count = 0;
    this.scene.add(bodyInstanced);

    const record = {
      headMesh,
      bodyInstanced,
      dummy: new THREE.Object3D(),
      positions: [],
    };

    this.snakeMeshes.set(player.id, record);
    return record;
  }

  removeSnakeMesh(id) {
    if (!this.snakeMeshes.has(id)) return;
    const meshObj = this.snakeMeshes.get(id);
    this.scene.remove(meshObj.headMesh);
    this.scene.remove(meshObj.bodyInstanced);
    meshObj.headMesh.geometry.dispose();
    meshObj.bodyInstanced.geometry.dispose();
    this.snakeMeshes.delete(id);
  }

  updateSnakesRendering(delta) {
    if (!this.gameState || !this.gameState.players) return;

    const activeIds = new Set();

    for (const id in this.gameState.players) {
      const p = this.gameState.players[id];
      if (p.state !== 'alive' || !p.segments || p.segments.length === 0) {
        continue;
      }
      activeIds.add(id);

      const snakeObj = this.getOrCreateSnakeMesh(p);
      const isLocal = id === this.playerId;
      const count = Math.min(p.segments.length, 250);
      const thickness = Math.min(2.2, 0.95 + Math.max(0, p.score - 10) * 0.007);

      snakeObj.headMesh.visible = true;
      snakeObj.headMesh.scale.set(thickness, thickness, 1);
      snakeObj.bodyInstanced.count = Math.max(0, count - 1);

      while (snakeObj.positions.length < count) {
        const idx = snakeObj.positions.length;
        snakeObj.positions.push({
          x: p.segments[idx]?.x || 0,
          y: p.segments[idx]?.y || 0,
        });
      }

      for (let i = 0; i < count; i++) {
        let targetX = p.segments[i].x;
        let targetY = p.segments[i].y;
        const curr = snakeObj.positions[i];

        if (isLocal) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
          if (dist > 6) {
            curr.x = targetX;
            curr.y = targetY;
          } else {
            curr.x += (targetX - curr.x) * 20 * delta;
            curr.y += (targetY - curr.y) * 20 * delta;
          }
        }

        if (i === 0) {
          snakeObj.headMesh.position.set(curr.x, curr.y, 0.7);
          snakeObj.headMesh.rotation.set(0, 0, p.currentAngle - Math.PI / 2);
        } else {
          const taper = i > count - 4 ? 0.75 + ((count - i) / 4) * 0.25 : 1.0;
          const segScale = thickness * taper;
          snakeObj.dummy.scale.set(segScale, segScale, segScale);
          snakeObj.dummy.position.set(curr.x, curr.y, 0.5);
          snakeObj.dummy.updateMatrix();
          snakeObj.bodyInstanced.setMatrixAt(i - 1, snakeObj.dummy.matrix);
        }
      }
      snakeObj.bodyInstanced.instanceMatrix.needsUpdate = true;
    }

    // Clean inactive snakes
    for (const [id] of this.snakeMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.removeSnakeMesh(id);
      }
    }
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate.bind(this));
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    const gs = this.gameState;
    const playerId = this.playerId;

    if (gs && playerId && gs.players && gs.players[playerId]) {
      const serverPlayer = gs.players[playerId];

      if (serverPlayer.state === 'alive') {
        if (!this.localPlayer.active && serverPlayer.segments && serverPlayer.segments.length > 0) {
          this.localPlayer.active = true;
          this.localPlayer.segments = JSON.parse(JSON.stringify(serverPlayer.segments));
          this.localPlayer.score = serverPlayer.score;
          this.localPlayer.currentAngle = serverPlayer.currentAngle || 0;
          this.localPlayer.health = serverPlayer.health ?? 100;
          this.localPlayer.armor = serverPlayer.armor ?? 50;
          this.localPlayer.power = serverPlayer.power ?? 20;
          this.localPlayer.lastHitTime = 0;
        }

        if (this.localPlayer.active && this.localPlayer.segments.length > 0) {
          // 1. Steering
          if (this.inputs.joystickActive) {
            let diff = Math.atan2(
              Math.sin(this.inputs.targetAngle - this.localPlayer.currentAngle),
              Math.cos(this.inputs.targetAngle - this.localPlayer.currentAngle)
            );
            const maxTurn = TURN_SPEED * 1.6 * delta;
            if (Math.abs(diff) <= maxTurn) {
              this.localPlayer.currentAngle = this.inputs.targetAngle;
            } else {
              this.localPlayer.currentAngle += Math.sign(diff) * maxTurn;
            }
          } else {
            if (this.inputs.left) this.localPlayer.currentAngle += TURN_SPEED * delta;
            if (this.inputs.right) this.localPlayer.currentAngle -= TURN_SPEED * delta;
          }

          // 2. Speed & Boost
          const isBoosting = this.inputs.boost && this.localPlayer.score > 10;
          this.localPlayer.isBoosting = isBoosting;

          if (isBoosting && this.onChallengeProgress) {
            this.onChallengeProgress('boost', delta);
          }

          const speed = isBoosting ? BOOST_SPEED : BASE_SPEED;
          const targetLength = Math.max(8, Math.floor(this.localPlayer.score));

          // Ensure segments length matches score and extends naturally behind tail
          while (this.localPlayer.segments.length < targetLength) {
            const len = this.localPlayer.segments.length;
            const last = this.localPlayer.segments[len - 1] || { x: 0, y: 0 };
            const prev = len > 1 ? this.localPlayer.segments[len - 2] : null;
            let nx = last.x;
            let ny = last.y;
            if (prev) {
              const dx = last.x - prev.x;
              const dy = last.y - prev.y;
              const d = Math.hypot(dx, dy) || 1;
              nx = last.x + (dx / d) * 0.55;
              ny = last.y + (dy / d) * 0.55;
            }
            this.localPlayer.segments.push({ x: nx, y: ny });
          }
          while (this.localPlayer.segments.length > targetLength) {
            this.localPlayer.segments.pop();
          }

          // Move head
          const head = this.localPlayer.segments[0];
          head.x += Math.cos(this.localPlayer.currentAngle) * speed * delta;
          head.y += Math.sin(this.localPlayer.currentAngle) * speed * delta;

          // Constrain World Boundaries
          const boundary = WORLD_SIZE / 2 - 2;
          head.x = Math.max(-boundary, Math.min(boundary, head.x));
          head.y = Math.max(-boundary, Math.min(boundary, head.y));

          // Smooth Kinematic Snake Body Trailing
          const spacing = 0.55;
          for (let i = 1; i < this.localPlayer.segments.length; i++) {
            const prev = this.localPlayer.segments[i - 1];
            const curr = this.localPlayer.segments[i];
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.hypot(dx, dy);
            if (dist > spacing) {
              const ratio = spacing / dist;
              curr.x = prev.x - dx * ratio;
              curr.y = prev.y - dy * ratio;
            }
          }

          if (this.localPlayer.isBoosting) {
            this.localPlayer.score -= 2.5 * delta;
            if (this.localPlayer.score <= 10) {
              this.localPlayer.isBoosting = false;
              this.localPlayer.score = 10;
            }
          }

          // Loot Collision Check
          for (const lootId in gs.loot) {
            if (this.localCollectedLoot.has(lootId)) continue;
            const item = gs.loot[lootId];
            const dx = head.x - item.x;
            const dy = head.y - item.y;
            if (dx * dx + dy * dy < 4.5) {
              if (item.type === 'medkit') {
                this.localPlayer.health = Math.min(100, this.localPlayer.health + 35);
              } else if (item.type === 'armor') {
                this.localPlayer.armor = Math.min(100, this.localPlayer.armor + 35);
                this.onChallengeProgress?.('shields', 1);
              } else if (item.type === 'weapon') {
                this.localPlayer.power += 5;
              } else if (item.type === 'ammo') {
                this.localPlayer.score += 15;
              } else {
                this.localPlayer.score += item.value || 1;
              }

              this.onChallengeProgress?.('loot', 1);
              this.onChallengeProgress?.('score', Math.floor(this.localPlayer.score));

              this.localCollectedLoot.add(lootId);
              delete gs.loot[lootId];
              this.onCollectLoot?.(lootId);
            }
          }

          // Enemy Collision Check
          let collidedOther = null;
          let closeEnemy = false;

          for (const otherId in gs.players) {
            if (otherId === playerId) continue;
            const other = gs.players[otherId];
            if (other.state !== 'alive' || !other.segments) continue;

            for (const seg of other.segments) {
              const dx = head.x - seg.x;
              const dy = head.y - seg.y;
              const distSq = dx * dx + dy * dy;

              if (distSq < 2.5) {
                collidedOther = other;
                break;
              } else if (distSq < 16) {
                closeEnemy = true;
              }
            }
            if (collidedOther) break;
          }

          const now = Date.now();
          if (closeEnemy && now - this.lastDaredevilCheck > 3000) {
            this.lastDaredevilCheck = now;
            this.onChallengeProgress?.('daredevil', 1);
          }

          if (collidedOther) {
            if (now - this.localPlayer.lastHitTime > 500) {
              const damage = collidedOther.power || 15;
              if (collidedOther.isTitanBoss) {
                this.onChallengeProgress?.('titan_boss', 1);
              }

              if (this.localPlayer.armor > 0) {
                if (this.localPlayer.armor >= damage) {
                  this.localPlayer.armor -= damage;
                } else {
                  const rem = damage - this.localPlayer.armor;
                  this.localPlayer.armor = 0;
                  this.localPlayer.health -= rem;
                }
              } else {
                this.localPlayer.health -= damage;
              }

              this.localPlayer.lastHitTime = now;
              head.x -= Math.cos(this.localPlayer.currentAngle) * 2.5;
              head.y -= Math.sin(this.localPlayer.currentAngle) * 2.5;
            }

            if (this.localPlayer.health <= 0) {
              this.localPlayer.active = false;
              this.onStateSend?.({
                segments: this.localPlayer.segments.map((s) => ({ x: roundCoord(s.x), y: roundCoord(s.y) })),
                score: Math.floor(this.localPlayer.score),
                currentAngle: roundCoord(this.localPlayer.currentAngle),
                isBoosting: this.localPlayer.isBoosting,
                state: 'dead',
                health: 0,
                armor: 0,
                power: this.localPlayer.power,
                killedBy: collidedOther.id,
              });
            }
          }

          // Sync local player to gameState
          gs.players[playerId].segments = this.localPlayer.segments;
          gs.players[playerId].score = this.localPlayer.score;
          gs.players[playerId].currentAngle = this.localPlayer.currentAngle;
          gs.players[playerId].isBoosting = this.localPlayer.isBoosting;
          gs.players[playerId].health = this.localPlayer.health;
          gs.players[playerId].armor = this.localPlayer.armor;
          gs.players[playerId].power = this.localPlayer.power;

          // Send state update at 14Hz
          if (now - this.localPlayer.lastSendTime > 70) {
            this.onStateSend?.({
              segments: this.localPlayer.segments.map((s) => ({ x: roundCoord(s.x), y: roundCoord(s.y) })),
              score: Math.floor(this.localPlayer.score),
              currentAngle: roundCoord(this.localPlayer.currentAngle),
              isBoosting: this.localPlayer.isBoosting,
              state: 'alive',
              health: Math.floor(this.localPlayer.health),
              armor: Math.floor(this.localPlayer.armor),
              power: Math.floor(this.localPlayer.power),
            });
            this.localPlayer.lastSendTime = now;
          }

          // Camera Smooth Following (Balanced view so massive snakes look huge)
          const aspect = window.innerWidth / Math.max(1, window.innerHeight);
          const baseHeight = aspect < 0.8 ? 28 : aspect < 1.2 ? 23 : 19;
          const targetZ = Math.min(38, Math.max(baseHeight, baseHeight + Math.max(0, this.localPlayer.score - 10) * 0.04));

          this.camera.position.x += (head.x - this.camera.position.x) * 12 * delta;
          this.camera.position.y += (head.y - this.camera.position.y) * 12 * delta;
          this.camera.position.z += (targetZ - this.camera.position.z) * 4 * delta;
          this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
        }
      } else {
        this.localPlayer.active = false;
      }
    }

    // Render loot & snakes
    this.updateLootRendering(time);
    this.updateSnakesRendering(delta);

    this.renderer.render(this.scene, this.camera);
  }
}
