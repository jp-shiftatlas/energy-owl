import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { BuildingInsights } from "../lib/apis/googleSolar";
import BuildingFromSolar from "./BuildingFromSolar";
import Lighting from "./Lighting";
import {
  computeCameraFraming,
  type CameraFraming,
} from "./cameraFraming";

type Props = {
  buildingInsights: BuildingInsights | null;
};

// Reactively re-aims the default camera whenever framing changes (e.g.
// buildingInsights loads, or the user selects a different demo address).
// The Canvas's `camera` prop only seeds the initial mount; this hook
// handles every subsequent re-frame.
function CameraSync({
  framing,
  controlsRef,
}: {
  framing: CameraFraming;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...framing.target);
      controls.update();
    }
  }, [camera, controlsRef, framing]);
  return null;
}

// Camera framing and orbit limits scale to the loaded building's
// bounding-box diagonal so any address — small commercial to Apple Park —
// frames sensibly at default zoom. See computeCameraFraming for math.
export default function Scene({ buildingInsights }: Props) {
  const framing = useMemo(
    () => computeCameraFraming(buildingInsights),
    [buildingInsights],
  );
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows
      camera={{ position: framing.position, fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <CameraSync framing={framing} controlsRef={controlsRef} />
      <Lighting />
      <BuildingFromSolar buildingInsights={buildingInsights} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom
        minDistance={framing.minDistance}
        maxDistance={framing.maxDistance}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
