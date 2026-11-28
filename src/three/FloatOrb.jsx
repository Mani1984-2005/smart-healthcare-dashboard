// THREE.js HELPER — Floating orbital object
// Creates a smoothly floating orb with gentle pulsation
// Used in the cinematic hero scene

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function FloatOrb({ className, size = 1, color = "#00d4aa", delay = 0 }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      // Gentle rotation and float animation
      const time = state.clock.elapsedTime;
      ref.current.position.y = Math.sin(time + delay) * 1.5;
      ref.current.position.x = Math.cos(time * 0.5 + delay) * 1.0;
      ref.current.rotation.y += 0.005;
      ref.current.rotation.x += 0.003;
    }
  });

  // CSS-based floating animation for visual enhancement
  // Each orb has a unique timing based on the delay prop
  const animationDuration = 8 + delay * 0.5;
  const animationTiming = `cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

  return (
    <mesh ref={ref} className={className}>
      <sphereGeometry
        args={[size * 0.5, 32, 32]}
      />
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0.2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}