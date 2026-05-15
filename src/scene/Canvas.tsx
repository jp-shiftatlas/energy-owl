import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Lighting from "./Lighting";
import PlaceholderBuilding from "./PlaceholderBuilding";

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 8, 12], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <Lighting />
      <PlaceholderBuilding />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
