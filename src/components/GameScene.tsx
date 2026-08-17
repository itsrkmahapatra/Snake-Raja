/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState, mobileInputs } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED } from '../shared/types';
import { getEmojiTexture, EMOJI_HEADS, EMOJI_LOOT } from '../shared/emojiTextures';
import * as THREE from 'three';
import { Grid, Stars } from '@react-three/drei';

const localCollectedLoot = new Set<string>();

function Snake({ playerId, color, headType, isLocal }: { playerId: string, color: string, headType: string, isLocal: boolean }) {
  const headConfig = EMOJI_HEADS[headType as keyof typeof EMOJI_HEADS] || EMOJI_HEADS.snake;
  const texture = useMemo(() => getEmojiTexture(headConfig.emoji, headConfig.glow), [headConfig]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{x: number, y: number}[]>([]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }
    
    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    
    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0 
      });
    }

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }
      
      if (i === 0) {
        headRef.current.position.set(curr.x, curr.y, 0.6);
        headRef.current.rotation.set(0, 0, player.currentAngle - Math.PI / 2);
      } else {
        dummy.position.set(curr.x, curr.y, 0.5);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={headRef}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <instancedMesh ref={bodyRef} args={[null as any, null as any, 2000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * 1.5);
              `
            );
          }}
        />
      </instancedMesh>
    </group>
  );
}

function EmojiLootInstanced({
  type,
  emoji,
  glow,
  timeRef,
  dummy,
}: {
  type: string;
  emoji: string;
  glow: string;
  timeRef: React.MutableRefObject<number>;
  dummy: THREE.Object3D;
}) {
  const texture = useMemo(() => getEmojiTexture(emoji, glow), [emoji, glow]);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const gs = globalGameState.current;
    if (!gs || !meshRef.current) return;

    let count = 0;
    for (const id in gs.loot) {
      if (localCollectedLoot.has(id)) continue;
      const loot = gs.loot[id];
      if (loot.type !== type) continue;

      dummy.position.set(loot.x, loot.y, 0.5);
      dummy.rotation.set(0, 0, Math.sin(timeRef.current * 3 + loot.x) * 0.2);
      dummy.scale.setScalar(1.6 + Math.sin(timeRef.current * 4 + loot.y) * 0.15);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(count, dummy.matrix);
      count++;
    }

    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 300]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

function LootItems() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
  });

  return (
    <group>
      {Object.entries(EMOJI_LOOT).map(([type, config]) => (
        <EmojiLootInstanced
          key={type}
          type={type}
          emoji={config.emoji}
          glow={config.glow}
          timeRef={timeRef}
          dummy={dummy}
        />
      ))}
    </group>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectLoot } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
    health: number;
    armor: number;
    power: number;
    lastHitTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
    health: 100,
    armor: 0,
    power: 10,
    lastHitTime: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) { inputs.current.left = true; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) { inputs.current.right = true; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !inputs.current.boost) { inputs.current.boost = true; }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) { inputs.current.left = false; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) { inputs.current.right = false; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) { inputs.current.boost = false; }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        localPlayerRef.current.health = serverPlayer.health ?? 100;
        localPlayerRef.current.armor = serverPlayer.armor ?? 0;
        localPlayerRef.current.power = serverPlayer.power ?? 10;
        localPlayerRef.current.lastHitTime = 0;
      }

      if (!localPlayerRef.current.active) return;

      // Mobile Joystick 360° Steering or Keyboard Fallback
      if (mobileInputs.active) {
        let diff = Math.atan2(
          Math.sin(mobileInputs.targetAngle - localPlayerRef.current.currentAngle),
          Math.cos(mobileInputs.targetAngle - localPlayerRef.current.currentAngle)
        );
        const maxTurn = TURN_SPEED * 1.6 * delta;
        if (Math.abs(diff) <= maxTurn) {
          localPlayerRef.current.currentAngle = mobileInputs.targetAngle;
        } else {
          localPlayerRef.current.currentAngle += Math.sign(diff) * maxTurn;
        }
      } else {
        if (inputs.current.left || mobileInputs.turnLeft) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
        if (inputs.current.right || mobileInputs.turnRight) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      }
      
      const isBoosting = (inputs.current.boost || mobileInputs.isBoosting) && localPlayerRef.current.score > 10;
      localPlayerRef.current.isBoosting = isBoosting;
      const speed = isBoosting ? BOOST_SPEED : BASE_SPEED;
      
      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Boundary check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check loot collisions
      for (const lootId in gs.loot) {
        if (localCollectedLoot.has(lootId)) continue;
        const lootItem = gs.loot[lootId];
        const dx = head.x - lootItem.x;
        const dy = head.y - lootItem.y;
        if (dx * dx + dy * dy < 4) {
          if (lootItem.type === 'medkit') {
            localPlayerRef.current.health = Math.min(100, localPlayerRef.current.health + 40);
          } else if (lootItem.type === 'armor') {
            localPlayerRef.current.armor = Math.min(100, localPlayerRef.current.armor + 40);
          } else if (lootItem.type === 'weapon') {
            localPlayerRef.current.power += 5;
          } else if (lootItem.type === 'ammo') {
            localPlayerRef.current.score += 15;
          } else {
            localPlayerRef.current.score += lootItem.value;
          }
          localCollectedLoot.add(lootId);
          delete gs.loot[lootId]; // predict locally
          sendCollectLoot(lootId);
        }
      }

      // Cleanup localCollectedLoot occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedLoot) {
          if (!gs.loot[id]) localCollectedLoot.delete(id);
        }
      }

      // Check player collisions
      let collidedOther = null;
      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive') continue;
        for (const seg of other.segments) {
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.25) {
            collidedOther = other;
            break;
          }
        }
        if (collidedOther) break;
      }

      if (collidedOther) {
        const now = Date.now();
        if (now - localPlayerRef.current.lastHitTime > 500) {
          const damage = collidedOther.power || 10;
          
          if (localPlayerRef.current.armor > 0) {
            if (localPlayerRef.current.armor >= damage) {
              localPlayerRef.current.armor -= damage;
            } else {
              const rem = damage - localPlayerRef.current.armor;
              localPlayerRef.current.armor = 0;
              localPlayerRef.current.health -= rem;
            }
          } else {
            localPlayerRef.current.health -= damage;
          }
          
          localPlayerRef.current.lastHitTime = now;
          
          head.x -= Math.cos(localPlayerRef.current.currentAngle) * 3;
          head.y -= Math.sin(localPlayerRef.current.currentAngle) * 3;
          localPlayerRef.current.segments[0] = head;
        }

        if (localPlayerRef.current.health <= 0) {
          localPlayerRef.current.active = false;
          sendPlayerState({
            segments: localPlayerRef.current.segments,
            score: localPlayerRef.current.score,
            currentAngle: localPlayerRef.current.currentAngle,
            isBoosting: localPlayerRef.current.isBoosting,
            state: 'dead',
            health: 0,
            armor: 0,
            power: localPlayerRef.current.power
          });
          return;
        }
      }

      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;
      gs.players[playerId].health = localPlayerRef.current.health;
      gs.players[playerId].armor = localPlayerRef.current.armor;
      gs.players[playerId].power = localPlayerRef.current.power;

      // Send state to server at 20Hz
      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive',
          health: localPlayerRef.current.health,
          armor: localPlayerRef.current.armor,
          power: localPlayerRef.current.power
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const aspect = size.width / Math.max(1, size.height);
      const baseHeight = aspect < 0.8 ? 34 : aspect < 1.2 ? 26 : 22;
      const targetZ = Math.min(55, Math.max(baseHeight, baseHeight + localPlayerRef.current.score * 0.2));
      
      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Make the directional light follow the camera to keep shadows crisp
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      {/* Ground plane to receive shadows */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#02000d" />
      </mesh>

      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1}
        cellThickness={0.2}
        cellColor="#2c003e"
        sectionSize={10}
        sectionThickness={0.8}
        sectionColor="#48007a"
        fadeDistance={100}
        fadeStrength={1.5}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />

      <LootItems />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            headType={player.headType}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
