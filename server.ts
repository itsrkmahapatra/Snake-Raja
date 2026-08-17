/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Loot,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  MAX_LOOT,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3000;

const COLORS = [
  '#00ffff', // cyan star
  '#ff00ff', // magenta nebula
  '#ffaa00', // solar flare
  '#ffffff', // white dwarf
  '#7b2cbf', // deep cosmos
  '#39ff14', // toxic plasma
];

const state: GameState = {
  players: {},
  loot: {},
  leaderboard: [],
};

function spawnLoot(x?: number, y?: number, value = 1, color?: string, force = false) {
  if (!force && Object.keys(state.loot).length >= MAX_LOOT) return;
  const id = uuidv4();
  const types = ['medkit', 'ammo', 'armor', 'weapon'];
  const type = types[Math.floor(Math.random() * types.length)];
  state.loot[id] = {
    id,
    x: x ?? (Math.random() - 0.5) * WORLD_SIZE,
    y: y ?? (Math.random() - 0.5) * WORLD_SIZE,
    value,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    type
  };
}

// Initial loot
for (let i = 0; i < 150; i++) {
  spawnLoot();
}

let snakeCounter = 1;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', (payload?: string | { name?: string; headType?: string }) => {
    let customName = typeof payload === 'string' ? payload : payload?.name;
    let selectedHead = typeof payload === 'object' ? payload?.headType : undefined;

    const name = customName && customName.trim() ? customName.trim().substring(0, 16) : `Survivor-${snakeCounter++}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 20);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 20);
    const angle = Math.random() * Math.PI * 2;
    const headTypes = ['skull', 'robot', 'snake'];
    const headType = selectedHead && headTypes.includes(selectedHead) ? selectedHead : headTypes[Math.floor(Math.random() * headTypes.length)];

    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
      });
    }

    state.players[socket.id] = {
      id: socket.id,
      name,
      color,
      segments,
      score: INITIAL_LENGTH,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
      headType,
      health: 100,
      armor: 100,
      power: 100,
    };

    socket.emit('init', socket.id);
  });

  socket.on('update_state', (data: { segments: any[], score: number, currentAngle: number, isBoosting: boolean, state: string, health: number, armor: number, power: number }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      if (data.health !== undefined) player.health = data.health;
      if (data.armor !== undefined) player.armor = data.armor;
      if (data.power !== undefined) player.power = data.power;
      
      if (data.state === 'dead') {
        player.state = 'dead';
        // Drop loot
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnLoot(seg.x, seg.y, 1, player.color, true);
        });
      }
    }
  });

  socket.on('collect_loot', (lootId: string) => {
    if (state.loot[lootId]) {
      delete state.loot[lootId];
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      // Drop loot
      player.segments.forEach((seg, i) => {
        if (i % 2 === 0) spawnLoot(seg.x, seg.y, 1, player.color, true);
      });
    }
    delete state.players[socket.id];
  });
});

let tickCount = 0;

// Game Loop
setInterval(() => {
  tickCount++;
  // Update players (just for boosting loot drops)
  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive') {
      if (player.isBoosting) {
        if (Math.random() < 0.1 && player.segments.length > 0) {
          const tail = player.segments[player.segments.length - 1];
          spawnLoot(tail.x, tail.y, 1, player.color, true);
        }
      }
      if (tickCount >= TICK_RATE * 5) {
        player.health += 5;
        player.armor += 5;
        player.power += 5;
      }
    }
  }
  if (tickCount >= TICK_RATE * 5) {
    tickCount = 0;
  }

  // Spawn random loot
  if (Math.random() < 0.2) {
    spawnLoot();
  }

  // Update leaderboard
  state.leaderboard = Object.values(state.players)
    .filter(p => p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => ({ id: p.id, name: p.name, score: Math.floor(p.score), color: p.color }));

  // Broadcast state
  io.emit('state', state);

}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
