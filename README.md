# Snake Raja

A high-performance, real-time multiplayer 3D Snake Game built with React Three Fiber, WebSockets, and WebGL.

**Developed by Raj Kishor Mahapatra**  
🌐 [Website](https://itsrkmahapatra.qzz.io/)  
📧 [dev@itsrkmahapatra.qzz.io](mailto:dev@itsrkmahapatra.qzz.io)

## Features
- **Real-Time Multiplayer**: Smooth WebSocket-based synchronization with server-side physics and predictions.
- **3D Graphics**: Built using `@react-three/fiber` and `@react-three/drei` with glowing neon holographic visual effects.
- **Dynamic Loot System**: Collect medkits, armor, ammo, and weapons to boost your stats in real-time.
- **Performance Optimized**: Uses InstancedMeshes and Additive Blending for maximum frame rates.

## How to Run Locally

**Prerequisites:** Node.js v18+

1. Install all required dependencies:
   ```bash
   npm install
   ```

2. Start the local development server (this boots both the frontend Vite client and the Node.js WebSocket backend):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local server (typically `http://localhost:5173` or `http://localhost:3000`).

## Controls
- **A / D** or **Left / Right Arrows**: Steer your snake
- **W / Space / Up Arrow**: Boost/Sprint (consumes length/score)
