import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { BuildingInsights } from "../lib/apis/googleSolar";
import Lighting from "./Lighting";
import BuildingFromSolar from "./BuildingFromSolar";

type Props = {
  buildingInsights: BuildingInsights | null;
};

// Camera and orbit limits sized for buildings from small commercial
// (~20 m) up to Apple Park (~400 m). Initial position is a moderate
// isometric vantage; OrbitControls lets the user dolly to taste.
export default function Scene({ buildingInsights }: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [80, 60, 100], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <Lighting />
      <BuildingFromSolar buildingInsights={buildingInsights} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={10}
        maxDistance={800}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
