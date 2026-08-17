/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useRef, useState, useEffect } from 'react';
import { mobileInputs } from '../store/gameStore';

interface VirtualJoystickProps {
  size?: number;
}

export function VirtualJoystick({ size = 130 }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius - 15;

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
      className="relative rounded-full flex items-center justify-center select-none touch-none"
      style={{
        width: size,
        height: size,
        background: isDragging
          ? 'radial-gradient(circle, rgba(255, 170, 0, 0.25) 0%, rgba(20, 20, 30, 0.8) 100%)'
          : 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(10, 10, 15, 0.7) 100%)',
        border: isDragging ? '2px solid rgba(255, 170, 0, 0.6)' : '2px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isDragging ? '0 0 25px rgba(255, 170, 0, 0.4)' : '0 4px 15px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Direction Guide Rings */}
      <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute w-2 h-2 rounded-full bg-white/20 pointer-events-none" />

      {/* Thumb handle */}
      <div
        className="absolute rounded-full transition-transform duration-75 pointer-events-none flex items-center justify-center"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          transform: `translate(${handlePos.x}px, ${handlePos.y}px)`,
          background: isDragging
            ? 'linear-gradient(135deg, #ffaa00 0%, #ff5500 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(150, 150, 150, 0.2) 100%)',
          boxShadow: isDragging
            ? '0 0 20px rgba(255, 170, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.5)'
            : '0 2px 10px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
          border: isDragging ? '2px solid rgba(255, 255, 255, 0.8)' : '1.5px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white/40" />
      </div>
    </div>
  );
}
