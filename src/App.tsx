/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/gameStore';
import { UI } from './components/UI';

export default function App() {
  const { connect } = useGameStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#030408] overflow-hidden select-none touch-none">
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 40], fov: 60, near: 0.5, far: 200 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          depth: true,
          stencil: false,
          alpha: false,
        }}
      >
        <color attach="background" args={['#030408']} />
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
}
