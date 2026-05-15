export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#F5F2EB" />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        color="#FBE7B0"
        castShadow
      />
      <directionalLight
        position={[-6, 4, -4]}
        intensity={0.3}
        color="#6B8F71"
      />
    </>
  );
}
