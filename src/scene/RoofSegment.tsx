import { useMemo } from "react";
import { Euler, Quaternion } from "three";

// Thickness of each roof "plate" — gives the segments some visual
// presence without pretending to model wall structure.
const THICKNESS_METERS = 0.2;

type Props = {
  center: { x: number; y: number; z: number };
  widthMeters: number;
  depthMeters: number;
  pitchDegrees: number;
  azimuthDegrees: number;
  color: string;
};

// Compass azimuth (clockwise from north, with our +X=east / +Z=south
// projection) → Three's Y-axis rotation (counterclockwise from above).
// Sign flip + YXZ Euler order so pitch tilts the plate AFTER it has
// been yawed to face the correct compass direction.
function segmentQuaternion(
  pitchDegrees: number,
  azimuthDegrees: number,
): Quaternion {
  const pitchRad = (pitchDegrees * Math.PI) / 180;
  const yawRad = -(azimuthDegrees * Math.PI) / 180;
  return new Quaternion().setFromEuler(
    new Euler(pitchRad, yawRad, 0, "YXZ"),
  );
}

export default function RoofSegment({
  center,
  widthMeters,
  depthMeters,
  pitchDegrees,
  azimuthDegrees,
  color,
}: Props) {
  const quaternion = useMemo(
    () => segmentQuaternion(pitchDegrees, azimuthDegrees),
    [pitchDegrees, azimuthDegrees],
  );

  return (
    <mesh
      position={[center.x, center.y + THICKNESS_METERS / 2, center.z]}
      quaternion={quaternion}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[widthMeters, THICKNESS_METERS, depthMeters]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.05}
      />
    </mesh>
  );
}
