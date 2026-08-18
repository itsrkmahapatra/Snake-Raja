/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useRef, useState, useEffect } from 'react';
import { mobileInputs } from '../store/gameStore';

interface VirtualJoystickProps {
  size?: number;
}

export function VirtualJoystick({ size = 115 }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius - 12;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setIsDragging(false);
    setHandlePos({ x: 0, y: 0 });
    mobileInputs.active = false;
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    // Invert Y because canvas/math coordinates Y goes up, screen Y goes down
    const angle = Math.atan2(-dy, dx);

    if (distance > 0) {
      mobileInputs.active = true;
      mobileInputs.targetAngle = angle;
    }

    const clampedDistance = Math.min(distance, maxDistance);
    const angleScreen = Math.atan2(dy, dx);
    setHandlePos({
      x: Math.cos(angleScreen) * clampedDistance,
      y: Math.sin(angleScreen) * clampedDistance,
    });
  };

  useEffect(() => {
    return () => {
      mobileInputs.active = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative rounded-full flex items-center justify-center select-none touch-none transition-shadow duration-200"
      style={{
        width: size,
        height: size,
        background: isDragging
          ? 'radial-gradient(circle, rgba(255, 170, 0, 0.25) 0%, rgba(10, 14, 25, 0.85) 100%)'
          : 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, rgba(8, 10, 18, 0.75) 100%)',
        border: isDragging ? '2px solid rgba(255, 180, 0, 0.8)' : '1.5px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isDragging ? '0 0 30px rgba(255, 170, 0, 0.5), inset 0 0 15px rgba(255, 170, 0, 0.2)' : '0 6px 20px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* High-tech Radar Grid Crosshairs */}
      <div className="absolute inset-1.5 rounded-full border border-dashed border-white/10 pointer-events-none" />
      <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-white/15 to-transparent pointer-events-none" />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-white/30 pointer-events-none" />

      {/* Cyberpunk Steering Gimbal Handle */}
      <div
        className="absolute rounded-full transition-transform duration-75 pointer-events-none flex items-center justify-center"
        style={{
          width: size * 0.44,
          height: size * 0.44,
          transform: `translate(${handlePos.x}px, ${handlePos.y}px)`,
          background: isDragging
            ? 'linear-gradient(135deg, #ffd700 0%, #ff5500 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(120, 130, 150, 0.25) 100%)',
          boxShadow: isDragging
            ? '0 0 25px rgba(255, 170, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
            : '0 4px 15px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
          border: isDragging ? '2px solid rgba(255, 255, 255, 0.9)' : '1.5px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      </div>
    </div>
  );
}
