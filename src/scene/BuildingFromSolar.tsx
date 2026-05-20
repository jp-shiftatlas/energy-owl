import { Html } from "@react-three/drei";
import type { BuildingInsights } from "../lib/apis/googleSolar";
import { minPlaneHeight, projectSegment } from "./projection";
import {
  medianSunshine,
  normalizeSunshine,
  shadeFromNormalized,
} from "./shading";
import RoofSegment from "./RoofSegment";

type Props = {
  buildingInsights: BuildingInsights | null;
};

// Ground plane sized generously so even Apple Park's ~400 m footprint
// has surrounding context; smaller buildings just sit on a larger field.
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#0F1A12" roughness={1} />
    </mesh>
  );
}

function EmptyState() {
  return (
    <>
      <GroundPlane />
      <Html center>
        <div className="text-offwhite/40 text-sm font-mono pointer-events-none select-none">
          Submit an address
        </div>
      </Html>
    </>
  );
}

export default function BuildingFromSolar({ buildingInsights }: Props) {
  if (!buildingInsights) {
    return <EmptyState />;
  }

  const segments = buildingInsights.solarPotential.roofSegmentStats;
  const origin = buildingInsights.center;
  const minH = minPlaneHeight(segments);

  const sunshineValues = segments.map(medianSunshine);
  const normalized = normalizeSunshine(sunshineValues);

  return (
    <>
      <GroundPlane />
      {segments.map((seg, i) => {
        const p = projectSegment(seg, origin, minH);
        const color = shadeFromNormalized(normalized[i]);
        return (
          <RoofSegment
            key={i}
            center={p.center}
            widthMeters={p.widthMeters}
            depthMeters={p.depthMeters}
            pitchDegrees={p.pitchDegrees}
            azimuthDegrees={p.azimuthDegrees}
            color={color}
          />
        );
      })}
    </>
  );
}
