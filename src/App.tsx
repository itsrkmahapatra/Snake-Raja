/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/gameStore';
import { UI } from './components/UI';

export default function App() {
  const { connect } = useGameStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden select-none touch-none">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050505']} />
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
        <EffectComposer>
          <Bloom
            luminanceThreshold={1.4}
            mipmapBlur
            intensity={1.2}
          />
        </EffectComposer>
      </Canvas>
      <UI />
    </div>
  );
}
