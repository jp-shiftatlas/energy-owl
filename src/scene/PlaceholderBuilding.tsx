import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

// S1-only placeholder. Removed in S3 when real Google Solar roof segments
// replace it. Real geometry will be static and the user orbits the camera —
// do not carry this rotation forward.
export default function PlaceholderBuilding() {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color="#6B8F71" roughness={0.7} metalness={0.05} />
      </mesh>

      <mesh position={[-1.4, 3.25, 0.6]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1]} />
        <meshStandardMaterial color="#4F6B53" roughness={0.8} />
      </mesh>
      <mesh position={[1.6, 3.15, -0.8]} castShadow>
        <boxGeometry args={[1, 0.3, 0.8]} />
        <meshStandardMaterial color="#4F6B53" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0F1A12" roughness={1} />
      </mesh>
    </group>
  );
}
