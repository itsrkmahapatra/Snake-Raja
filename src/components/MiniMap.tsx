/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useGameStore, globalGameState } from '../store/gameStore';
import { WORLD_SIZE } from '../shared/types';
import { useEffect, useRef } from 'react';

export function MiniMap({ size = 80 }: { size?: number }) {
  const { playerId } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gs = globalGameState.current;
      const halfWorld = WORLD_SIZE / 2;
      const scale = size / WORLD_SIZE;

      ctx.clearRect(0, 0, size, size);

      // Radar background
      ctx.fillStyle = 'rgba(5, 5, 12, 0.85)';
      ctx.fillRect(0, 0, size, size);

      // Grid crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      if (gs) {
        // Draw other players
        for (const id in gs.players) {
          if (id === playerId) continue;
          const p = gs.players[id];
          if (p.state !== 'alive' || !p.segments[0]) continue;
          const px = (p.segments[0].x + halfWorld) * scale;
          const py = (halfWorld - p.segments[0].y) * scale;

          ctx.fillStyle = p.color || '#ff0055';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw local player
        if (playerId && gs.players[playerId]?.state === 'alive') {
          const local = gs.players[playerId];
          const lx = (local.segments[0].x + halfWorld) * scale;
          const ly = (halfWorld - local.segments[0].y) * scale;

          // Glow ring
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(lx, ly, 4, 0, Math.PI * 2);
          ctx.stroke();

          // Center point
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [playerId, size]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-yellow-500/30 shadow-[0_0_12px_rgba(255,170,0,0.15)] backdrop-blur-md pointer-events-none"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full block" />
      <div className="absolute top-1 left-1.5 text-[8px] font-mono font-bold text-yellow-400/70 tracking-widest pointer-events-none">
        RADAR
      </div>
    </div>
  );
}
